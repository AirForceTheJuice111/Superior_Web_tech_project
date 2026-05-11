package com.example.mlplatform.service;

import com.example.mlplatform.dto.request.LoginRequest;
import com.example.mlplatform.dto.response.LoginResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);
}
