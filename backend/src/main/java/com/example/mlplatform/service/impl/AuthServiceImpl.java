package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.request.LoginRequest;
import com.example.mlplatform.dto.response.LoginResponse;
import com.example.mlplatform.persistence.entity.UserEntity;
import com.example.mlplatform.persistence.mapper.UserMapper;
import com.example.mlplatform.security.AuthPrincipal;
import com.example.mlplatform.security.JwtService;
import com.example.mlplatform.security.UnauthorizedException;
import com.example.mlplatform.service.AuthService;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final JwtService jwtService;

    public AuthServiceImpl(UserMapper userMapper, JwtService jwtService) {
        this.userMapper = userMapper;
        this.jwtService = jwtService;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userMapper.findByUsername(request.getUsername());
        // 教学简化：data.sql 存明文口令，此处直接比对。生产应改为加盐哈希（如 BCrypt）。
        if (user == null || !user.getPassword().equals(request.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }
        String token = jwtService.issue(user.getId(), user.getUsername(), user.getRole());
        return toResponse(user, token);
    }

    @Override
    public LoginResponse currentUser(AuthPrincipal principal) {
        UserEntity user = userMapper.findByUsername(principal.username());
        if (user == null) {
            // 令牌有效但用户已不存在（如被删除），视为令牌失效。
            throw new UnauthorizedException("令牌对应的用户不存在");
        }
        // /me 复用既有令牌，不重新签发。
        return toResponse(user, null);
    }

    private LoginResponse toResponse(UserEntity user, String token) {
        LoginResponse response = new LoginResponse();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setDisplayName(user.getDisplayName());
        response.setRole(user.getRole());
        response.setToken(token);
        return response;
    }
}
