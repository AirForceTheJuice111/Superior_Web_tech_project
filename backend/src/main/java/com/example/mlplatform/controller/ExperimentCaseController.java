package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.response.ExperimentCaseResponse;
import com.example.mlplatform.service.ExperimentCaseService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/experiment-cases")
public class ExperimentCaseController {

    private final ExperimentCaseService experimentCaseService;

    public ExperimentCaseController(ExperimentCaseService experimentCaseService) {
        this.experimentCaseService = experimentCaseService;
    }

    @GetMapping
    public ApiResponse<List<ExperimentCaseResponse>> listCases() {
        return ApiResponse.success("获取实验案例库成功", experimentCaseService.listCases());
    }
}
