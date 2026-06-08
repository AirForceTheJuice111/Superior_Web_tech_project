package com.example.mlplatform.persistence.entity;

import java.time.LocalDateTime;

/**
 * 上传数据集实体。数据行数受上限约束（默认 1000 行），因此整张表采用单表 CLOB JSON
 * 存储策略：headers_json / rows_json / feature_columns_json / numeric_columns_json
 * 均以 JSON 文本落库，读写为一个原子单元，避免额外的行明细表与多次 JOIN。
 */
public class UploadedDatasetEntity {

    private Long id;
    private String code;
    private String name;
    private String description;
    private Long ownerUserId;
    private String taskType;
    private String sourceType;
    private String featureColumnsJson;
    private String numericColumnsJson;
    private String labelColumn;
    private String headersJson;
    private String rowsJson;
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

    public String getFeatureColumnsJson() {
        return featureColumnsJson;
    }

    public void setFeatureColumnsJson(String featureColumnsJson) {
        this.featureColumnsJson = featureColumnsJson;
    }

    public String getNumericColumnsJson() {
        return numericColumnsJson;
    }

    public void setNumericColumnsJson(String numericColumnsJson) {
        this.numericColumnsJson = numericColumnsJson;
    }

    public String getLabelColumn() {
        return labelColumn;
    }

    public void setLabelColumn(String labelColumn) {
        this.labelColumn = labelColumn;
    }

    public String getHeadersJson() {
        return headersJson;
    }

    public void setHeadersJson(String headersJson) {
        this.headersJson = headersJson;
    }

    public String getRowsJson() {
        return rowsJson;
    }

    public void setRowsJson(String rowsJson) {
        this.rowsJson = rowsJson;
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
