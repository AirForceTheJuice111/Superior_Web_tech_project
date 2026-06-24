package com.example.mlplatform.common.exception;

/** 未携带有效会话 token 时抛出,由 GlobalExceptionHandler 映射为 HTTP 401。 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
