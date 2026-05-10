package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.InitTrainingRequest;
import com.example.mlplatform.dto.request.RunTrainingRequest;
import com.example.mlplatform.dto.request.StepTrainingRequest;
import com.example.mlplatform.dto.response.TrainingSessionResponse;
import com.example.mlplatform.dto.response.TrainingStatusResponse;
import com.example.mlplatform.service.TrainingService;
import com.example.mlplatform.service.TrainingStreamService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/trainings")
public class TrainingController {

    private final TrainingService trainingService;
    private final TrainingStreamService trainingStreamService;

    public TrainingController(TrainingService trainingService, TrainingStreamService trainingStreamService) {
        this.trainingService = trainingService;
        this.trainingStreamService = trainingStreamService;
    }

    @PostMapping
    public ApiResponse<TrainingSessionResponse> createTraining(@Valid @RequestBody InitTrainingRequest request) {
        return ApiResponse.success("训练会话创建成功", trainingService.createTraining(request));
    }

    @PostMapping("/{sessionId}/step")
    public ApiResponse<TrainingStatusResponse> stepTraining(@PathVariable String sessionId,
                                                            @Valid @RequestBody StepTrainingRequest request) {
        return ApiResponse.success("单步训练完成", trainingService.stepTraining(sessionId, request));
    }

    @PostMapping("/{sessionId}/run")
    public ApiResponse<TrainingSessionResponse> runTraining(@PathVariable String sessionId,
                                                            @Valid @RequestBody RunTrainingRequest request) {
        return ApiResponse.success("连续训练已启动", trainingService.runTraining(sessionId, request));
    }

    @PostMapping("/{sessionId}/pause")
    public ApiResponse<TrainingSessionResponse> pauseTraining(@PathVariable String sessionId) {
        return ApiResponse.success("训练已暂停", trainingService.pauseTraining(sessionId));
    }

    @PostMapping("/{sessionId}/stop")
    public ApiResponse<TrainingSessionResponse> stopTraining(@PathVariable String sessionId) {
        return ApiResponse.success("训练已停止", trainingService.stopTraining(sessionId));
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<TrainingSessionResponse> getTrainingSession(@PathVariable String sessionId) {
        return ApiResponse.success("获取训练会话成功", trainingService.getTrainingSession(sessionId));
    }

    @GetMapping("/{sessionId}/status")
    public ApiResponse<TrainingStatusResponse> getTrainingStatus(@PathVariable String sessionId) {
        return ApiResponse.success("获取训练状态成功", trainingService.getTrainingStatus(sessionId));
    }

    @GetMapping("/{sessionId}/stream")
    public SseEmitter streamTrainingStatus(@PathVariable String sessionId) {
        return trainingStreamService.subscribe(sessionId, trainingService.getTrainingStatus(sessionId));
    }
}
