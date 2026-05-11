package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.request.LoginRequest;
import com.example.mlplatform.dto.response.LoginResponse;
import com.example.mlplatform.persistence.entity.UserEntity;
import com.example.mlplatform.persistence.mapper.UserMapper;
import com.example.mlplatform.service.AuthService;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;

    public AuthServiceImpl(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userMapper.findByUsername(request.getUsername());
        if (user == null || !user.getPassword().equals(request.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        LoginResponse response = new LoginResponse();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setDisplayName(user.getDisplayName());
        response.setRole(user.getRole());
        response.setToken("demo-token-" + UUID.randomUUID());
        return response;
    }
}
