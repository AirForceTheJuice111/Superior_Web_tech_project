package com.example.mlplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.HashMap;
import java.util.Map;

public class SaveExperimentRequest {

    @NotNull(message = "用户 ID 不能为空")
    private Long userId;

    @NotBlank(message = "实验名称不能为空")
    private String name;

    @NotBlank(message = "学习类型不能为空")
    private String learningType;

    @NotBlank(message = "算法编码不能为空")
    private String algorithmCode;

    @NotBlank(message = "数据集编码不能为空")
    private String datasetCode;

    private String latestSessionId;

    private Map<String, Object> config = new HashMap<>();

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLearningType() {
        return learningType;
    }

    public void setLearningType(String learningType) {
        this.learningType = learningType;
    }

    public String getAlgorithmCode() {
        return algorithmCode;
    }

    public void setAlgorithmCode(String algorithmCode) {
        this.algorithmCode = algorithmCode;
    }

    public String getDatasetCode() {
        return datasetCode;
    }

    public void setDatasetCode(String datasetCode) {
        this.datasetCode = datasetCode;
    }

    public String getLatestSessionId() {
        return latestSessionId;
    }

    public void setLatestSessionId(String latestSessionId) {
        this.latestSessionId = latestSessionId;
    }

    public Map<String, Object> getConfig() {
        return config;
    }

    public void setConfig(Map<String, Object> config) {
        this.config = config;
    }
}
