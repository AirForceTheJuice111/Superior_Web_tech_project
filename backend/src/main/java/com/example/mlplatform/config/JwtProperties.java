package com.example.mlplatform.config;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 相关配置项，统一从 application.yml 的 {@code app.jwt.*} 读取。
 *
 * <p>密钥 {@link #secret} 不会出现在任何 HTTP 响应中，仅用于服务端签名/校验。
 * 密钥必须经环境变量 {@code APP_JWT_SECRET} 或配置中心注入；缺失或过弱时启动直接失败，
 * 不提供任何可用的内置默认值，避免用仓库内公开字符串签发令牌。</p>
 */
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    private static final int MIN_SECRET_LENGTH = 32;
    private static final String PLACEHOLDER = "change-me";

    /** HMAC-SHA256 签名密钥（服务端机密，禁止回显，无内置默认值）。 */
    private String secret;

    /** 令牌有效期（分钟）。 */
    private long expirationMinutes = 120;

    /** 签发者标识，写入 JWT 的 iss 声明。 */
    private String issuer = "mlplatform";

    /** 启动时强校验密钥，拒绝空/过短/占位串，避免漏配导致弱密钥可被离线伪造令牌。 */
    @PostConstruct
    void validate() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT 密钥未配置：请设置环境变量 APP_JWT_SECRET");
        }
        if (secret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("JWT 密钥过短：至少需要 " + MIN_SECRET_LENGTH + " 个字符");
        }
        if (secret.contains(PLACEHOLDER)) {
            throw new IllegalStateException("JWT 密钥仍为占位串：请配置真实随机密钥");
        }
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationMinutes() {
        return expirationMinutes;
    }

    public void setExpirationMinutes(long expirationMinutes) {
        this.expirationMinutes = expirationMinutes;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }
}
