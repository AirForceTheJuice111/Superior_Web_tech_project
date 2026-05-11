package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.SaveExperimentRequest;
import com.example.mlplatform.dto.response.ExperimentResponse;
import com.example.mlplatform.service.ExperimentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    public ApiResponse<ExperimentResponse> saveExperiment(@Valid @RequestBody SaveExperimentRequest request) {
        return ApiResponse.success("实验保存成功", experimentService.saveExperiment(request));
    }

    @GetMapping("/history")
    public ApiResponse<List<ExperimentResponse>> listHistory(@RequestParam Long userId) {
        return ApiResponse.success("获取实验历史成功", experimentService.listHistory(userId));
    }
}
