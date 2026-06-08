package com.example.mlplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 相关配置项，统一从 application.yml 的 {@code app.jwt.*} 读取。
 *
 * <p>密钥 {@link #secret} 不会出现在任何 HTTP 响应中，仅用于服务端签名/校验。
 * 生产环境应通过环境变量或配置中心注入，避免硬编码在仓库内。</p>
 */
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    /** HMAC-SHA256 签名密钥（服务端机密，禁止回显）。 */
    private String secret = "change-me-in-production-please-use-a-long-random-secret";

    /** 令牌有效期（分钟）。 */
    private long expirationMinutes = 120;

    /** 签发者标识，写入 JWT 的 iss 声明。 */
    private String issuer = "mlplatform";

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
