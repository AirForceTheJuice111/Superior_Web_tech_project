package com.example.mlplatform.model;

import com.example.mlplatform.common.enums.AlgorithmType;
import com.example.mlplatform.common.enums.TrainingStatus;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TrainingSession {

    private String sessionId;
    private AlgorithmType algorithmType;
    private String datasetId;
    private List<String> featureColumns;
    private String labelColumn;
    private Map<String, Object> hyperParams = new HashMap<>();
    private Map<String, Object> trainConfig = new HashMap<>();
    private TrainingStatus status;
    private int currentStep;
    private int maxSteps;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private ModelState modelState = new ModelState();

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public AlgorithmType getAlgorithmType() {
        return algorithmType;
    }

    public void setAlgorithmType(AlgorithmType algorithmType) {
        this.algorithmType = algorithmType;
    }

    public String getDatasetId() {
        return datasetId;
    }

    public void setDatasetId(String datasetId) {
        this.datasetId = datasetId;
    }

    public List<String> getFeatureColumns() {
        return featureColumns;
    }

    public void setFeatureColumns(List<String> featureColumns) {
        this.featureColumns = featureColumns;
    }

    public String getLabelColumn() {
        return labelColumn;
    }

    public void setLabelColumn(String labelColumn) {
        this.labelColumn = labelColumn;
    }

    public Map<String, Object> getHyperParams() {
        return hyperParams;
    }

    public void setHyperParams(Map<String, Object> hyperParams) {
        this.hyperParams = hyperParams;
    }

    public Map<String, Object> getTrainConfig() {
        return trainConfig;
    }

    public void setTrainConfig(Map<String, Object> trainConfig) {
        this.trainConfig = trainConfig;
    }

    public TrainingStatus getStatus() {
        return status;
    }

    public void setStatus(TrainingStatus status) {
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

    public ModelState getModelState() {
        return modelState;
    }

    public void setModelState(ModelState modelState) {
        this.modelState = modelState;
    }
}
