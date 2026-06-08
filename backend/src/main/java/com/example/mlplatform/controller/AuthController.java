package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.LoginRequest;
import com.example.mlplatform.dto.response.LoginResponse;
import com.example.mlplatform.security.AuthPrincipal;
import com.example.mlplatform.security.CurrentUser;
import com.example.mlplatform.security.RequireRole;
import com.example.mlplatform.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success("登录成功", authService.login(request));
    }

    /** 凭有效令牌回查当前身份，证明鉴权链路生效。无令牌会在拦截器处被 401 中断。 */
    @GetMapping("/me")
    public ApiResponse<LoginResponse> me(@CurrentUser AuthPrincipal principal) {
        return ApiResponse.success("当前登录用户", authService.currentUser(principal));
    }

    /** RBAC 演示端点：仅 teacher 角色可访问，student 持有效令牌也会被 403。 */
    @GetMapping("/teacher-area")
    @RequireRole("teacher")
    public ApiResponse<Map<String, Object>> teacherArea(@CurrentUser AuthPrincipal principal) {
        return ApiResponse.success("教师专属区域", Map.of(
                "username", principal.username(),
                "role", principal.role(),
                "message", "你拥有教师权限"
        ));
    }
}
