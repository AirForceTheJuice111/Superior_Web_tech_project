package com.example.mlplatform.persistence.entity;

import java.time.LocalDateTime;

public class TrainingSessionEntity {

    private String sessionId;
    private String algorithmCode;
    private String datasetId;
    private String featureColumnsJson;
    private String labelColumn;
    private String hyperParamsJson;
    private String trainConfigJson;
    private String status;
    private int currentStep;
    private int maxSteps;
    private Double loss;
    private String metricsJson;
    private String parametersJson;
    private String predictionsJson;
    private String visualizationJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getAlgorithmCode() {
        return algorithmCode;
    }

    public void setAlgorithmCode(String algorithmCode) {
        this.algorithmCode = algorithmCode;
    }

    public String getDatasetId() {
        return datasetId;
    }

    public void setDatasetId(String datasetId) {
        this.datasetId = datasetId;
    }

    public String getFeatureColumnsJson() {
        return featureColumnsJson;
    }

    public void setFeatureColumnsJson(String featureColumnsJson) {
        this.featureColumnsJson = featureColumnsJson;
    }

    public String getLabelColumn() {
        return labelColumn;
    }

    public void setLabelColumn(String labelColumn) {
        this.labelColumn = labelColumn;
    }

    public String getHyperParamsJson() {
        return hyperParamsJson;
    }

    public void setHyperParamsJson(String hyperParamsJson) {
        this.hyperParamsJson = hyperParamsJson;
    }

    public String getTrainConfigJson() {
        return trainConfigJson;
    }

    public void setTrainConfigJson(String trainConfigJson) {
        this.trainConfigJson = trainConfigJson;
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

    public Double getLoss() {
        return loss;
    }

    public void setLoss(Double loss) {
        this.loss = loss;
    }

    public String getMetricsJson() {
        return metricsJson;
    }

    public void setMetricsJson(String metricsJson) {
        this.metricsJson = metricsJson;
    }

    public String getParametersJson() {
        return parametersJson;
    }

    public void setParametersJson(String parametersJson) {
        this.parametersJson = parametersJson;
    }

    public String getPredictionsJson() {
        return predictionsJson;
    }

    public void setPredictionsJson(String predictionsJson) {
        this.predictionsJson = predictionsJson;
    }

    public String getVisualizationJson() {
        return visualizationJson;
    }

    public void setVisualizationJson(String visualizationJson) {
        this.visualizationJson = visualizationJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
