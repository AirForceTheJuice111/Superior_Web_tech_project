package com.example.mlplatform.controller;

import com.example.mlplatform.common.exception.UnauthorizedException;
import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.SaveExperimentRequest;
import com.example.mlplatform.dto.response.ExperimentResponse;
import com.example.mlplatform.service.AuthService;
import com.example.mlplatform.service.ExperimentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/experiments")
public class ExperimentController {

    private final ExperimentService experimentService;
    private final AuthService authService;

    public ExperimentController(ExperimentService experimentService, AuthService authService) {
        this.experimentService = experimentService;
        this.authService = authService;
    }

    @PostMapping
    public ApiResponse<ExperimentResponse> saveExperiment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody SaveExperimentRequest request) {
        // 以认证身份为准,忽略客户端自报 userId,杜绝越权写入他人账户
        request.setUserId(requireUserId(authorization));
        return ApiResponse.success("实验保存成功", experimentService.saveExperiment(request));
    }

    @GetMapping("/history")
    public ApiResponse<List<ExperimentResponse>> listHistory(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        // 仅返回当前登录用户自己的历史,userId 不再来自客户端查询参数
        return ApiResponse.success("获取实验历史成功", experimentService.listHistory(requireUserId(authorization)));
    }

    /** 从 Authorization 头解析可信 userId;缺失或无效则 401。 */
    private Long requireUserId(String authorization) {
        String token = null;
        if (authorization != null && !authorization.isBlank()) {
            token = authorization.startsWith("Bearer ")
                    ? authorization.substring(7).trim()
                    : authorization.trim();
        }
        Long userId = authService.resolveUserId(token);
        if (userId == null) {
            throw new UnauthorizedException("未登录或登录态已失效，请重新登录");
        }
        return userId;
    }
}
