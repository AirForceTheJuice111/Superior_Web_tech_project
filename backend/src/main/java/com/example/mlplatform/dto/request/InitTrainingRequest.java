package com.example.mlplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public class InitTrainingRequest {

    @NotBlank(message = "algorithm 不能为空")
    private String algorithm;

    @NotBlank(message = "datasetId 不能为空")
    private String datasetId;

    @NotEmpty(message = "featureColumns 不能为空")
    private List<String> featureColumns;

    private String labelColumn;

    @NotNull(message = "hyperParams 不能为空")
    private Map<String, Object> hyperParams;

    @NotNull(message = "trainConfig 不能为空")
    private Map<String, Object> trainConfig;

    /**
     * 上传数据集透传载荷。前端不直接提供；当 datasetId 命中某个上传数据集时，
     * 由后端从库中取出数值化样本填充，再透传给 Python 算法服务。
     */
    private Map<String, Object> customDataset;

    public String getAlgorithm() {
        return algorithm;
    }

    public void setAlgorithm(String algorithm) {
        this.algorithm = algorithm;
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

    public Map<String, Object> getCustomDataset() {
        return customDataset;
    }

    public void setCustomDataset(Map<String, Object> customDataset) {
        this.customDataset = customDataset;
    }
}
