package com.example.mlplatform.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;

/**
 * 请求级鉴权拦截器：解析 {@code Authorization: Bearer <token>}，将认证主体写入请求属性，
 * 并执行方法级 {@link RequireRole} 角色检查。白名单匹配在注册处（WebSecurityConfig）完成，
 * 进入本拦截器的请求一律视为受保护资源。
 */
public class AuthInterceptor implements HandlerInterceptor {

    /** 认证主体在请求属性中的键，Controller 经 {@link CurrentUser} 读取。 */
    public static final String PRINCIPAL_ATTRIBUTE = "authPrincipal";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    public AuthInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 放行预检请求；CORS 头部由 CorsConfig 负责。
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            throw new UnauthorizedException("缺少 Bearer 访问令牌");
        }

        AuthPrincipal principal = jwtService.verify(header.substring(BEARER_PREFIX.length()).trim());
        request.setAttribute(PRINCIPAL_ATTRIBUTE, principal);

        if (handler instanceof HandlerMethod handlerMethod) {
            enforceRole(handlerMethod, principal);
        }
        return true;
    }

    /** 命中 {@link RequireRole} 时校验角色，不足则抛 403（已认证但越权）。 */
    private void enforceRole(HandlerMethod handlerMethod, AuthPrincipal principal) {
        RequireRole requireRole = handlerMethod.getMethodAnnotation(RequireRole.class);
        if (requireRole == null) {
            return;
        }
        boolean allowed = Arrays.stream(requireRole.value()).anyMatch(principal::hasRole);
        if (!allowed) {
            throw new ForbiddenException("当前角色无权访问该资源，需要：" + String.join("/", requireRole.value()));
        }
    }
}
