package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.SaveExperimentRequest;
import com.example.mlplatform.dto.response.ExperimentResponse;
import com.example.mlplatform.security.AuthPrincipal;
import com.example.mlplatform.security.CurrentUser;
import com.example.mlplatform.service.ExperimentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/experiments")
public class ExperimentController {

    private final ExperimentService experimentService;

    public ExperimentController(ExperimentService experimentService) {
        this.experimentService = experimentService;
    }

    @PostMapping
    public ApiResponse<ExperimentResponse> saveExperiment(@CurrentUser AuthPrincipal principal,
                                                          @Valid @RequestBody SaveExperimentRequest request) {
        // 以认证主体为准，忽略客户端自报的 userId，防止冒名保存到他人名下。
        request.setUserId(principal.userId());
        return ApiResponse.success("实验保存成功", experimentService.saveExperiment(request));
    }

    @GetMapping("/history")
    public ApiResponse<List<ExperimentResponse>> listHistory(@CurrentUser AuthPrincipal principal) {
        return ApiResponse.success("获取实验历史成功", experimentService.listHistory(principal.userId()));
    }
}
