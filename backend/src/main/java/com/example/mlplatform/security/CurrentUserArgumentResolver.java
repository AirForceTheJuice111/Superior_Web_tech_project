package com.example.mlplatform.security;

import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.HandlerMapping;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 解析 {@link CurrentUser} 标注的 {@link AuthPrincipal} 参数，数据来源为 {@link AuthInterceptor}
 * 写入的请求属性。属性缺失意味着拦截器未放行却到达此处，按未授权处理。
 */
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
                && parameter.getParameterType().equals(AuthPrincipal.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        Object principal = request == null ? null : request.getAttribute(AuthInterceptor.PRINCIPAL_ATTRIBUTE);
        if (!(principal instanceof AuthPrincipal authPrincipal)) {
            throw new UnauthorizedException("未识别到当前登录用户");
        }
        return authPrincipal;
    }
}
