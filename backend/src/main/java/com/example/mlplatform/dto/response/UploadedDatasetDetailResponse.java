package com.example.mlplatform.dto.response;

import java.util.List;

/**
 * 上传数据集详情响应：摘要信息 + 表头 + 预览数据行（前 N 行）。
 */
public class UploadedDatasetDetailResponse {

    private UploadedDatasetResponse meta;
    private List<String> headers;
    private List<List<String>> previewRows;
    private int previewLimit;

    public UploadedDatasetResponse getMeta() {
        return meta;
    }

    public void setMeta(UploadedDatasetResponse meta) {
        this.meta = meta;
    }

    public List<String> getHeaders() {
        return headers;
    }

    public void setHeaders(List<String> headers) {
        this.headers = headers;
    }

    public List<List<String>> getPreviewRows() {
        return previewRows;
    }

    public void setPreviewRows(List<List<String>> previewRows) {
        this.previewRows = previewRows;
    }

    public int getPreviewLimit() {
        return previewLimit;
    }

    public void setPreviewLimit(int previewLimit) {
        this.previewLimit = previewLimit;
    }
}
