package com.example.mlplatform.service;

import com.example.mlplatform.dto.request.LoginRequest;
import com.example.mlplatform.dto.response.LoginResponse;
import com.example.mlplatform.security.AuthPrincipal;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    /** 依据已校验的令牌主体回查当前用户档案，供 {@code GET /api/auth/me} 使用。 */
    LoginResponse currentUser(AuthPrincipal principal);
}
