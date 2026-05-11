package com.example.mlplatform.persistence.entity;

import java.time.LocalDateTime;

public class AlgorithmMetaEntity {

    private Long id;
    private String code;
    private String name;
    private String category;
    private String learningType;
    private String description;
    private String paramsSchemaJson;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getLearningType() {
        return learningType;
    }

    public void setLearningType(String learningType) {
        this.learningType = learningType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getParamsSchemaJson() {
        return paramsSchemaJson;
    }

    public void setParamsSchemaJson(String paramsSchemaJson) {
        this.paramsSchemaJson = paramsSchemaJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
