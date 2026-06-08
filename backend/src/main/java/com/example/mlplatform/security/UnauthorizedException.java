package com.example.mlplatform.security;

/**
 * 鉴权失败时抛出的异常，由 {@code GlobalExceptionHandler} 翻译为 401 响应。
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}
