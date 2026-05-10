package com.example.mlplatform.dto.response;

import java.util.List;
import java.util.Map;

public class AlgorithmMetaResponse {

    private String code;
    private String name;
    private String category;
    private List<Map<String, Object>> paramsSchema;

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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public List<Map<String, Object>> getParamsSchema() {
        return paramsSchema;
    }

    public void setParamsSchema(List<Map<String, Object>> paramsSchema) {
        this.paramsSchema = paramsSchema;
    }
}
