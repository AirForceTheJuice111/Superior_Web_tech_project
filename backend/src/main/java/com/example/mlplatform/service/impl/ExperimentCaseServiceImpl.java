package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.response.ExperimentCaseResponse;
import com.example.mlplatform.persistence.entity.ExperimentCaseEntity;
import com.example.mlplatform.persistence.mapper.ExperimentCaseMapper;
import com.example.mlplatform.service.ExperimentCaseService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExperimentCaseServiceImpl implements ExperimentCaseService {

    private final ExperimentCaseMapper experimentCaseMapper;
    private final ObjectMapper objectMapper;

    public ExperimentCaseServiceImpl(ExperimentCaseMapper experimentCaseMapper, ObjectMapper objectMapper) {
        this.experimentCaseMapper = experimentCaseMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<ExperimentCaseResponse> listCases() {
        return experimentCaseMapper.findAll().stream().map(this::toResponse).toList();
    }

    private ExperimentCaseResponse toResponse(ExperimentCaseEntity entity) {
        ExperimentCaseResponse response = new ExperimentCaseResponse();
        response.setId(entity.getId());
        response.setCode(entity.getCode());
        response.setTitle(entity.getTitle());
        response.setDescription(entity.getDescription());
        response.setLearningType(entity.getLearningType());
        response.setAlgorithmCode(entity.getAlgorithmCode());
        response.setDatasetCode(entity.getDatasetCode());
        response.setConfig(readJson(entity.getConfigJson()));
        response.setGuideText(entity.getGuideText());
        response.setExpectedResult(entity.getExpectedResult());
        response.setDisplayOrder(entity.getDisplayOrder());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }

    private Map<String, Object> readJson(String value) {
        if (value == null || value.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (Exception exception) {
            throw new IllegalStateException("实验案例配置解析失败", exception);
        }
    }
}
