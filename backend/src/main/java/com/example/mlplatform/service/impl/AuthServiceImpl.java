package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.request.LoginRequest;
import com.example.mlplatform.dto.request.RegisterRequest;
import com.example.mlplatform.dto.response.LoginResponse;
import com.example.mlplatform.persistence.entity.UserEntity;
import com.example.mlplatform.persistence.mapper.UserMapper;
import com.example.mlplatform.service.AuthService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    /** 进程内 token->userId 映射,作为受保护接口的可信身份来源(演示级,生产应换成 JWT/Redis)。 */
    private final ConcurrentHashMap<String, Long> tokenStore = new ConcurrentHashMap<>();

    public AuthServiceImpl(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userMapper.findByUsername(request.getUsername());
        if (user == null || !passwordMatches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }
        return buildSession(user);
    }

    @Override
    public LoginResponse register(RegisterRequest request) {
        String username = request.getUsername() == null ? "" : request.getUsername().trim();
        if (username.isEmpty() || request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new IllegalArgumentException("用户名和密码不能为空");
        }
        if (userMapper.countByUsername(username) > 0) {
            throw new IllegalArgumentException("用户名已存在，请换一个");
        }

        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setEmail(request.getEmail() == null ? null : request.getEmail().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(username);
        user.setRole("student");
        user.setCreatedAt(LocalDateTime.now());
        userMapper.insert(user);

        return buildSession(user);
    }

    @Override
    public Long resolveUserId(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return tokenStore.get(token);
    }

    private LoginResponse buildSession(UserEntity user) {
        String token = "demo-token-" + UUID.randomUUID();
        tokenStore.put(token, user.getId());

        LoginResponse response = new LoginResponse();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setDisplayName(user.getDisplayName());
        response.setRole(user.getRole());
        response.setToken(token);
        return response;
    }

    /** 统一走 BCrypt 校验;不再回退明文比较(种子账号已预置 BCrypt 哈希)。 */
    private boolean passwordMatches(String raw, String stored) {
        if (stored == null || raw == null) {
            return false;
        }
        if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
            return passwordEncoder.matches(raw, stored);
        }
        return false;
    }
}
