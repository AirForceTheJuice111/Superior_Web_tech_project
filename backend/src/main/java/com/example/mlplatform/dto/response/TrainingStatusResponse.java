package com.example.mlplatform.dto.response;

import com.example.mlplatform.model.PredictionResult;
import com.example.mlplatform.model.VisualizationData;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class TrainingStatusResponse {

    private String sessionId;
    private String algorithm;
    private String status;
    private int currentStep;
    private int maxSteps;
    private double progress;
    private Double loss;
    private Map<String, Object> metrics;
    private Map<String, Object> parameters;
    private List<PredictionResult> predictions;
    private VisualizationData visualization;
    private LocalDateTime updatedAt;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getAlgorithm() {
        return algorithm;
    }

    public void setAlgorithm(String algorithm) {
        this.algorithm = algorithm;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getCurrentStep() {
        return currentStep;
    }

    public void setCurrentStep(int currentStep) {
        this.currentStep = currentStep;
    }

    public int getMaxSteps() {
        return maxSteps;
    }

    public void setMaxSteps(int maxSteps) {
        this.maxSteps = maxSteps;
    }

    public double getProgress() {
        return progress;
    }

    public void setProgress(double progress) {
        this.progress = progress;
    }

    public Double getLoss() {
        return loss;
    }

    public void setLoss(Double loss) {
        this.loss = loss;
    }

    public Map<String, Object> getMetrics() {
        return metrics;
    }

    public void setMetrics(Map<String, Object> metrics) {
        this.metrics = metrics;
    }

    public Map<String, Object> getParameters() {
        return parameters;
    }

    public void setParameters(Map<String, Object> parameters) {
        this.parameters = parameters;
    }

    public List<PredictionResult> getPredictions() {
        return predictions;
    }

    public void setPredictions(List<PredictionResult> predictions) {
        this.predictions = predictions;
    }

    public VisualizationData getVisualization() {
        return visualization;
    }

    public void setVisualization(VisualizationData visualization) {
        this.visualization = visualization;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
