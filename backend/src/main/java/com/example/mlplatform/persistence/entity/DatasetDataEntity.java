package com.example.mlplatform.persistence.entity;

import java.time.LocalDateTime;

public class DatasetDataEntity {

    private Long datasetId;
    private String columnsJson;
    private String rowsJson;
    private String featureColumnsJson;
    private String labelColumn;
    private LocalDateTime createdAt;

    public Long getDatasetId() {
        return datasetId;
    }

    public void setDatasetId(Long datasetId) {
        this.datasetId = datasetId;
    }

    public String getColumnsJson() {
        return columnsJson;
    }

    public void setColumnsJson(String columnsJson) {
        this.columnsJson = columnsJson;
    }

    public String getRowsJson() {
        return rowsJson;
    }

    public void setRowsJson(String rowsJson) {
        this.rowsJson = rowsJson;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
