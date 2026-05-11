package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.request.SaveExperimentRequest;
import com.example.mlplatform.dto.response.ExperimentResponse;
import com.example.mlplatform.persistence.entity.ExperimentEntity;
import com.example.mlplatform.persistence.mapper.AlgorithmMetaMapper;
import com.example.mlplatform.persistence.mapper.DatasetMetaMapper;
import com.example.mlplatform.persistence.mapper.ExperimentMapper;
import com.example.mlplatform.persistence.mapper.UserMapper;
import com.example.mlplatform.service.ExperimentService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExperimentServiceImpl implements ExperimentService {

    private final ExperimentMapper experimentMapper;
    private final UserMapper userMapper;
    private final DatasetMetaMapper datasetMetaMapper;
    private final AlgorithmMetaMapper algorithmMetaMapper;
    private final ObjectMapper objectMapper;

    public ExperimentServiceImpl(ExperimentMapper experimentMapper,
                                 UserMapper userMapper,
                                 DatasetMetaMapper datasetMetaMapper,
                                 AlgorithmMetaMapper algorithmMetaMapper,
                                 ObjectMapper objectMapper) {
        this.experimentMapper = experimentMapper;
        this.userMapper = userMapper;
        this.datasetMetaMapper = datasetMetaMapper;
        this.algorithmMetaMapper = algorithmMetaMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public ExperimentResponse saveExperiment(SaveExperimentRequest request) {
        validateRequest(request);

        LocalDateTime now = LocalDateTime.now();
        ExperimentEntity entity = new ExperimentEntity();
        entity.setUserId(request.getUserId());
        entity.setName(request.getName());
        entity.setLearningType(request.getLearningType());
        entity.setAlgorithmCode(request.getAlgorithmCode());
        entity.setDatasetCode(request.getDatasetCode());
        entity.setLatestSessionId(request.getLatestSessionId());
        entity.setConfigJson(writeJson(request.getConfig()));
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        experimentMapper.insert(entity);
        return toResponse(entity);
    }

    @Override
    public List<ExperimentResponse> listHistory(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        if (userMapper.findById(userId) == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        return experimentMapper.findByUserId(userId).stream().map(this::toResponse).toList();
    }

    private void validateRequest(SaveExperimentRequest request) {
        if (userMapper.findById(request.getUserId()) == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        if (datasetMetaMapper.findByCode(request.getDatasetCode()) == null) {
            throw new IllegalArgumentException("数据集不存在");
        }
        if (algorithmMetaMapper.findByCode(request.getAlgorithmCode()) == null) {
            throw new IllegalArgumentException("算法不存在");
        }
    }

    private ExperimentResponse toResponse(ExperimentEntity entity) {
        ExperimentResponse response = new ExperimentResponse();
        response.setId(entity.getId());
        response.setUserId(entity.getUserId());
        response.setName(entity.getName());
        response.setLearningType(entity.getLearningType());
        response.setAlgorithmCode(entity.getAlgorithmCode());
        response.setDatasetCode(entity.getDatasetCode());
        response.setLatestSessionId(entity.getLatestSessionId());
        response.setConfig(readJson(entity.getConfigJson()));
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? new HashMap<>() : value);
        } catch (Exception exception) {
            throw new IllegalStateException("实验配置序列化失败", exception);
        }
    }

    private Map<String, Object> readJson(String value) {
        if (value == null || value.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (Exception exception) {
            throw new IllegalStateException("实验配置解析失败", exception);
        }
    }
}
