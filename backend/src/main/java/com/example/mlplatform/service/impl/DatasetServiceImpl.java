package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.request.CreateDatasetRequest;
import com.example.mlplatform.dto.response.DatasetResponse;
import com.example.mlplatform.persistence.entity.DatasetDataEntity;
import com.example.mlplatform.persistence.entity.DatasetMetaEntity;
import com.example.mlplatform.persistence.mapper.DatasetDataMapper;
import com.example.mlplatform.persistence.mapper.DatasetMetaMapper;
import com.example.mlplatform.service.DatasetService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DatasetServiceImpl implements DatasetService {

    private static final String UPLOAD_SOURCE_TYPE = "upload";

    private final DatasetMetaMapper datasetMetaMapper;
    private final DatasetDataMapper datasetDataMapper;
    private final ObjectMapper objectMapper;

    public DatasetServiceImpl(DatasetMetaMapper datasetMetaMapper,
                              DatasetDataMapper datasetDataMapper,
                              ObjectMapper objectMapper) {
        this.datasetMetaMapper = datasetMetaMapper;
        this.datasetDataMapper = datasetDataMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<DatasetResponse> listDatasets() {
        return datasetMetaMapper.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    public DatasetResponse createDataset(CreateDatasetRequest request) {
        List<String> columns = request.getColumns();
        List<Map<String, Object>> rows = request.getRows();
        if (columns == null || columns.isEmpty()) {
            throw new IllegalArgumentException("数据集列不能为空");
        }
        if (rows == null || rows.size() < 2) {
            throw new IllegalArgumentException("数据集至少需要两行数据");
        }

        List<String> featureColumns = request.getFeatureColumns() != null
                ? request.getFeatureColumns()
                : new ArrayList<>();
        String labelColumn = request.getLabelColumn();
        LocalDateTime now = LocalDateTime.now();

        DatasetMetaEntity meta = new DatasetMetaEntity();
        meta.setCode("upload_" + now.toString().replaceAll("[^0-9]", ""));
        meta.setName(request.getName());
        meta.setDescription("用户上传 CSV 数据集");
        meta.setTaskType(labelColumn != null && !labelColumn.isBlank() ? "supervised" : "unsupervised");
        meta.setSourceType(UPLOAD_SOURCE_TYPE);
        meta.setFeatureCount(featureColumns.size());
        meta.setSampleCount(rows.size());
        meta.setLabelColumn(labelColumn);
        meta.setCreatedAt(now);
        datasetMetaMapper.insert(meta);

        DatasetDataEntity data = new DatasetDataEntity();
        data.setDatasetId(meta.getId());
        data.setColumnsJson(writeJson(columns));
        data.setRowsJson(writeJson(rows));
        data.setFeatureColumnsJson(writeJson(featureColumns));
        data.setLabelColumn(labelColumn);
        data.setCreatedAt(now);
        datasetDataMapper.insert(data);

        return toResponse(meta);
    }

    @Override
    public Map<String, Object> loadCustomDataset(String datasetCode) {
        DatasetMetaEntity meta = datasetMetaMapper.findByCode(datasetCode);
        if (meta == null || !UPLOAD_SOURCE_TYPE.equals(meta.getSourceType())) {
            return null;
        }
        DatasetDataEntity data = datasetDataMapper.findByDatasetId(meta.getId());
        if (data == null) {
            return null;
        }

        List<String> columns = readList(data.getColumnsJson(), new TypeReference<>() {
        });
        List<Map<String, Object>> rows = readList(data.getRowsJson(), new TypeReference<>() {
        });
        List<String> featureColumns = readList(data.getFeatureColumnsJson(), new TypeReference<>() {
        });

        Map<String, Object> payload = new HashMap<>();
        payload.put("name", meta.getName());
        payload.put("sourceType", "csv");
        payload.put("columns", columns);
        payload.put("rows", rows);
        payload.put("featureColumns", featureColumns);
        payload.put("labelColumn", data.getLabelColumn());
        payload.put("sampleCount", rows.size());
        return payload;
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

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("数据集序列化失败", exception);
        }
    }

    private <T> T readList(String json, TypeReference<T> typeReference) {
        if (json == null || json.isBlank()) {
            throw new IllegalStateException("数据集内容为空");
        }
        try {
            return objectMapper.readValue(json, typeReference);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("数据集反序列化失败", exception);
        }
    }
}
