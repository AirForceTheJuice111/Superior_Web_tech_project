package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.response.DatasetResponse;
import com.example.mlplatform.persistence.entity.DatasetMetaEntity;
import com.example.mlplatform.persistence.mapper.DatasetMetaMapper;
import com.example.mlplatform.service.DatasetService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DatasetServiceImpl implements DatasetService {

    private final DatasetMetaMapper datasetMetaMapper;

    public DatasetServiceImpl(DatasetMetaMapper datasetMetaMapper) {
        this.datasetMetaMapper = datasetMetaMapper;
    }

    @Override
    public List<DatasetResponse> listDatasets() {
        return datasetMetaMapper.findAll().stream().map(this::toResponse).toList();
    }

    private DatasetResponse toResponse(DatasetMetaEntity entity) {
        DatasetResponse response = new DatasetResponse();
        response.setId(entity.getId());
        response.setCode(entity.getCode());
        response.setName(entity.getName());
        response.setDescription(entity.getDescription());
        response.setTaskType(entity.getTaskType());
        response.setSourceType(entity.getSourceType());
        response.setFeatureCount(entity.getFeatureCount());
        response.setSampleCount(entity.getSampleCount());
        response.setLabelColumn(entity.getLabelColumn());
        return response;
    }
}
