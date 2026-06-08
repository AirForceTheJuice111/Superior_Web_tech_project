package com.example.mlplatform.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标注在 Controller 方法上声明访问该端点所需角色，由 {@link AuthInterceptor} 在鉴权后强制执行。
 * 把 RBAC 约束写进方法签名而非散落的 if 判断，便于审计与推理。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireRole {

    /** 允许访问的角色（大小写不敏感），命中其一即放行。 */
    String[] value();
}
