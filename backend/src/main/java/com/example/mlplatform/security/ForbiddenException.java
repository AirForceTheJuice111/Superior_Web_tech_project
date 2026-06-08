package com.example.mlplatform.security;

/**
 * 当已认证但权限不足（角色不匹配）时抛出，由 {@code GlobalExceptionHandler} 翻译为 403 响应。
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
