package com.example.mlplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 上传数据集的安全上限配置，可在 application.yml 的 app.dataset-upload 下覆盖。
 */
@ConfigurationProperties(prefix = "app.dataset-upload")
public class DatasetUploadProperties {

    /** 最大数据行数 */
    private int maxRows = 1000;

    /** 最大列数 */
    private int maxColumns = 50;

    /** 单个单元格最大字符数 */
    private int maxCellLength = 256;

    /** 预览返回的行数 */
    private int previewLimit = 20;

    public int getMaxRows() {
        return maxRows;
    }

    public void setMaxRows(int maxRows) {
        this.maxRows = maxRows;
    }

    public int getMaxColumns() {
        return maxColumns;
    }

    public void setMaxColumns(int maxColumns) {
        this.maxColumns = maxColumns;
    }

    public int getMaxCellLength() {
        return maxCellLength;
    }

    public void setMaxCellLength(int maxCellLength) {
        this.maxCellLength = maxCellLength;
    }

    public int getPreviewLimit() {
        return previewLimit;
    }

    public void setPreviewLimit(int previewLimit) {
        this.previewLimit = previewLimit;
    }
}
