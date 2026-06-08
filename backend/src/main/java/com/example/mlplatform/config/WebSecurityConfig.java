package com.example.mlplatform.config;

import com.example.mlplatform.security.AuthInterceptor;
import com.example.mlplatform.security.CurrentUserArgumentResolver;
import com.example.mlplatform.security.JwtService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * 注册鉴权拦截器与当前用户参数解析器。
 *
 * <p>受保护范围与放行白名单在此集中声明，是 RBAC/鉴权约束的唯一事实来源：
 * 拦截 {@code /api/**}，放行登录、文档与内部端点。</p>
 */
@Configuration
public class WebSecurityConfig implements WebMvcConfigurer {

    /** 受拦截器保护的路径。 */
    private static final String[] PROTECTED_PATTERNS = {"/api/**"};

    /** 鉴权白名单：登录、Swagger UI、OpenAPI 文档、内部端点。 */
    private static final String[] WHITELIST_PATTERNS = {
            "/api/auth/login",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/internal/**"
    };

    private final JwtService jwtService;

    public WebSecurityConfig(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(jwtService))
                .addPathPatterns(PROTECTED_PATTERNS)
                .excludePathPatterns(WHITELIST_PATTERNS);
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentUserArgumentResolver());
    }
}
