package com.example.mlplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * CSV 上传请求。前端负责把 CSV 文件解析为表头 + 行数据后以 JSON 提交，
 * 后端只做纯数据存储与校验，绝不执行内容。
 */
public class UploadDatasetRequest {

    /** 由后端从认证主体注入，不接受客户端自报。 */
    private Long userId;

    @NotBlank(message = "数据集名称不能为空")
    @Size(max = 128, message = "数据集名称不能超过 128 个字符")
    private String name;

    @Size(max = 255, message = "数据集描述不能超过 255 个字符")
    private String description;

    /** 表头列名，前端从 CSV 第一行解析得到 */
    @NotEmpty(message = "headers 不能为空")
    @Size(max = 50, message = "列数不能超过 50")
    private List<String> headers;

    /** 数据行，每行是一组与 headers 等长的字符串值 */
    @NotEmpty(message = "rows 不能为空")
    @Size(max = 1000, message = "行数不能超过 1000")
    private List<List<String>> rows;

    /** 标签列名；为空表示无监督数据集 */
    private String labelColumn;

    /** 任务类型：supervised / unsupervised；为空时后端按是否有 labelColumn 推断 */
    private String taskType;

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getHeaders() {
        return headers;
    }

    public void setHeaders(List<String> headers) {
        this.headers = headers;
    }

    public List<List<String>> getRows() {
        return rows;
    }

    public void setRows(List<List<String>> rows) {
        this.rows = rows;
    }

    public String getLabelColumn() {
        return labelColumn;
    }

    public void setLabelColumn(String labelColumn) {
        this.labelColumn = labelColumn;
    }

    public String getTaskType() {
        return taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }
}
