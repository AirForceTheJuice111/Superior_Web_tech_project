package com.example.mlplatform.client.python;

import com.example.mlplatform.dto.request.InitTrainingRequest;
import com.example.mlplatform.dto.request.RunTrainingRequest;
import com.example.mlplatform.dto.request.StepTrainingRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class PythonTrainingClient {

    private final RestClient pythonRestClient;

    public PythonTrainingClient(RestClient pythonRestClient) {
        this.pythonRestClient = pythonRestClient;
    }

    public Map<String, Object> initTraining(InitTrainingRequest request) {
        return pythonRestClient.post()
                .uri("/internal/trainings")
                .body(request)
                .retrieve()
                .body(Map.class);
    }

    public Map<String, Object> stepTraining(String sessionId, StepTrainingRequest request) {
        return pythonRestClient.post()
                .uri("/internal/trainings/{sessionId}/step", sessionId)
                .body(request)
                .retrieve()
                .body(Map.class);
    }

    public Map<String, Object> runTraining(String sessionId, RunTrainingRequest request) {
        return pythonRestClient.post()
                .uri("/internal/trainings/{sessionId}/run", sessionId)
                .body(request)
                .retrieve()
                .body(Map.class);
    }

    public Map<String, Object> getStatus(String sessionId) {
        return pythonRestClient.get()
                .uri("/internal/trainings/{sessionId}/status", sessionId)
                .retrieve()
                .body(Map.class);
    }

    public Map<String, Object> resetTraining(String sessionId) {
        return pythonRestClient.post()
                .uri("/internal/trainings/{sessionId}/reset", sessionId)
                .retrieve()
                .body(Map.class);
    }

    public Map<String, Object> pauseTraining(String sessionId) {
        return pythonRestClient.post()
                .uri("/internal/trainings/{sessionId}/pause", sessionId)
                .retrieve()
                .body(Map.class);
    }

    public Map<String, Object> stopTraining(String sessionId) {
        return pythonRestClient.post()
                .uri("/internal/trainings/{sessionId}/stop", sessionId)
                .retrieve()
                .body(Map.class);
    }

    public String health() {
        return pythonRestClient.get()
                .uri("/internal/health")
                .retrieve()
                .body(String.class);
    }
}
