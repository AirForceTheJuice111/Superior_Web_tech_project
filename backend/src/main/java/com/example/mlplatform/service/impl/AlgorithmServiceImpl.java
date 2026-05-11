package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.response.AlgorithmMetaResponse;
import com.example.mlplatform.persistence.entity.AlgorithmMetaEntity;
import com.example.mlplatform.persistence.mapper.AlgorithmMetaMapper;
import com.example.mlplatform.service.AlgorithmService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AlgorithmServiceImpl implements AlgorithmService {

    private final AlgorithmMetaMapper algorithmMetaMapper;
    private final ObjectMapper objectMapper;

    public AlgorithmServiceImpl(AlgorithmMetaMapper algorithmMetaMapper, ObjectMapper objectMapper) {
        this.algorithmMetaMapper = algorithmMetaMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<AlgorithmMetaResponse> listAlgorithms() {
        return algorithmMetaMapper.findAll().stream().map(this::toResponse).toList();
    }

    private AlgorithmMetaResponse toResponse(AlgorithmMetaEntity entity) {
        AlgorithmMetaResponse response = new AlgorithmMetaResponse();
        response.setCode(entity.getCode());
        response.setName(entity.getName());
        response.setCategory(entity.getCategory());
        response.setLearningType(entity.getLearningType());
        response.setDescription(entity.getDescription());
        try {
            response.setParamsSchema(objectMapper.readValue(entity.getParamsSchemaJson(), new TypeReference<List<Map<String, Object>>>() {}));
        } catch (Exception exception) {
            throw new IllegalStateException("解析算法元数据失败", exception);
        }
        return response;
    }
}
