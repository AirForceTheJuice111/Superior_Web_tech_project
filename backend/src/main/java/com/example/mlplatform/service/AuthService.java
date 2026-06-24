package com.example.mlplatform.service;

import com.example.mlplatform.dto.request.LoginRequest;
import com.example.mlplatform.dto.request.RegisterRequest;
import com.example.mlplatform.dto.response.LoginResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    LoginResponse register(RegisterRequest request);

    /** 由会话 token 解析出可信的用户 ID;无效/过期返回 null。 */
    Long resolveUserId(String token);
}
