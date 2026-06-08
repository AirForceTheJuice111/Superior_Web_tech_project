package com.example.mlplatform.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 上传数据集摘要响应（列表用）。不含完整行数据，只含元信息。
 */
public class UploadedDatasetResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private Long ownerUserId;
    private String taskType;
    private String sourceType;
    private List<String> featureColumns;
    private List<String> numericColumns;
    private String labelColumn;
    private int rowCount;
    private int columnCount;
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(Long ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public String getTaskType() {
        return taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public List<String> getFeatureColumns() {
        return featureColumns;
    }

    public void setFeatureColumns(List<String> featureColumns) {
        this.featureColumns = featureColumns;
    }

    public List<String> getNumericColumns() {
        return numericColumns;
    }

    public void setNumericColumns(List<String> numericColumns) {
        this.numericColumns = numericColumns;
    }

    public String getLabelColumn() {
        return labelColumn;
    }

    public void setLabelColumn(String labelColumn) {
        this.labelColumn = labelColumn;
    }

    public int getRowCount() {
        return rowCount;
    }

    public void setRowCount(int rowCount) {
        this.rowCount = rowCount;
    }

    public int getColumnCount() {
        return columnCount;
    }

    public void setColumnCount(int columnCount) {
        this.columnCount = columnCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
