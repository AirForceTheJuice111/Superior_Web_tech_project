package com.example.mlplatform.security;

import com.example.mlplatform.config.JwtProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

/**
 * 手写 HMAC-SHA256 JWT 签发与校验，仅依赖 JDK 加密原语与 Jackson，避免引入额外库。
 *
 * <p>令牌结构遵循 JWS Compact：{@code base64url(header).base64url(payload).base64url(signature)}。
 * 载荷固定写入 {@code userId / username / role / iss / iat / exp}。密钥与有效期一律从
 * {@link JwtProperties} 读取，逻辑内不出现任何硬编码机密。</p>
 */
@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    /** 固定头部 {"alg":"HS256","typ":"JWT"} 的 base64url 编码，签名输入复用。 */
    private static final String ENCODED_HEADER =
            base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

    private final JwtProperties properties;
    private final ObjectMapper objectMapper;

    public JwtService(JwtProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /** 为指定身份签发一枚短期 JWT，过期时间由配置的有效期分钟数推算。 */
    public String issue(Long userId, String username, String role) {
        Instant now = Instant.now();
        long exp = now.plusSeconds(properties.getExpirationMinutes() * 60).getEpochSecond();

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("userId", userId);
        payload.put("username", username);
        payload.put("role", role);
        payload.put("iss", properties.getIssuer());
        payload.put("iat", now.getEpochSecond());
        payload.put("exp", exp);

        String encodedPayload = base64Url(toJsonBytes(payload));
        String signingInput = ENCODED_HEADER + "." + encodedPayload;
        return signingInput + "." + base64Url(sign(signingInput));
    }

    /**
     * 校验签名、签发者与过期时间，成功返回解析出的认证主体。
     * 任何结构、签名或时效问题都以 {@link UnauthorizedException} 显式中断，不静默降级。
     */
    public AuthPrincipal verify(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("缺少访问令牌");
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new UnauthorizedException("令牌格式非法");
        }

        String signingInput = parts[0] + "." + parts[1];
        byte[] expected = sign(signingInput);
        byte[] actual = decode(parts[2], "签名段");
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new UnauthorizedException("令牌签名校验失败");
        }

        ObjectNode payload = readPayload(parts[1]);
        if (!properties.getIssuer().equals(payload.path("iss").asText())) {
            throw new UnauthorizedException("令牌签发者不匹配");
        }
        if (!payload.hasNonNull("exp") || payload.get("exp").asLong() <= Instant.now().getEpochSecond()) {
            throw new UnauthorizedException("令牌已过期");
        }

        Long userId = payload.path("userId").asLong();
        String username = payload.path("username").asText(null);
        String role = payload.path("role").asText(null);
        if (username == null || role == null) {
            throw new UnauthorizedException("令牌身份信息缺失");
        }
        return new AuthPrincipal(userId, username, role);
    }

    private ObjectNode readPayload(String segment) {
        try {
            return (ObjectNode) objectMapper.readTree(decode(segment, "载荷段"));
        } catch (Exception ex) {
            throw new UnauthorizedException("令牌载荷解析失败", ex);
        }
    }

    private byte[] sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(properties.getSecret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            // 密钥缺失或算法不可用属于服务端配置错误，向上抛以触发 500 而非伪装成鉴权失败。
            throw new IllegalStateException("JWT 签名计算失败", ex);
        }
    }

    private byte[] toJsonBytes(ObjectNode node) {
        try {
            return objectMapper.writeValueAsBytes(node);
        } catch (Exception ex) {
            throw new IllegalStateException("JWT 载荷序列化失败", ex);
        }
    }

    private static byte[] decode(String segment, String label) {
        try {
            return Base64.getUrlDecoder().decode(segment);
        } catch (IllegalArgumentException ex) {
            throw new UnauthorizedException("令牌" + label + "编码非法", ex);
        }
    }

    private static String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
