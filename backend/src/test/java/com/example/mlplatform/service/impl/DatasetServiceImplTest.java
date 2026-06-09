package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.request.CreateDatasetRequest;
import com.example.mlplatform.dto.response.DatasetResponse;
import com.example.mlplatform.persistence.entity.DatasetDataEntity;
import com.example.mlplatform.persistence.entity.DatasetMetaEntity;
import com.example.mlplatform.persistence.mapper.DatasetDataMapper;
import com.example.mlplatform.persistence.mapper.DatasetMetaMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatasetServiceImplTest {

    private DatasetMetaMapper datasetMetaMapper;
    private DatasetDataMapper datasetDataMapper;
    private DatasetServiceImpl service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        datasetMetaMapper = mock(DatasetMetaMapper.class);
        datasetDataMapper = mock(DatasetDataMapper.class);
        service = new DatasetServiceImpl(datasetMetaMapper, datasetDataMapper, objectMapper);
    }

    @Test
    void createDatasetPersistsMetaAndData() {
        CreateDatasetRequest request = new CreateDatasetRequest();
        request.setName("my.csv");
        request.setColumns(List.of("a", "b", "label"));
        request.setRows(List.of(
                Map.of("a", 1, "b", 2, "label", "x"),
                Map.of("a", 3, "b", 4, "label", "y")
        ));
        request.setFeatureColumns(List.of("a", "b"));
        request.setLabelColumn("label");

        doAnswer(invocation -> {
            DatasetMetaEntity entity = invocation.getArgument(0);
            entity.setId(42L);
            return null;
        }).when(datasetMetaMapper).insert(any(DatasetMetaEntity.class));

        DatasetResponse response = service.createDataset(request);

        assertEquals(42L, response.getId());
        assertEquals("upload", response.getSourceType());
        assertEquals(2, response.getSampleCount());
        assertEquals("supervised", response.getTaskType());
        verify(datasetDataMapper).insert(any(DatasetDataEntity.class));
    }

    @Test
    void loadCustomDatasetReturnsNullForBuiltin() {
        DatasetMetaEntity builtin = new DatasetMetaEntity();
        builtin.setSourceType("builtin");
        when(datasetMetaMapper.findByCode("iris")).thenReturn(builtin);

        assertNull(service.loadCustomDataset("iris"));
    }

    @Test
    void loadCustomDatasetReturnsPayloadForUpload() throws Exception {
        DatasetMetaEntity meta = new DatasetMetaEntity();
        meta.setId(7L);
        meta.setName("up.csv");
        meta.setSourceType("upload");
        when(datasetMetaMapper.findByCode("upload_x")).thenReturn(meta);

        DatasetDataEntity data = new DatasetDataEntity();
        data.setDatasetId(7L);
        data.setColumnsJson(objectMapper.writeValueAsString(List.of("a", "b")));
        data.setRowsJson(objectMapper.writeValueAsString(List.of(Map.of("a", 1, "b", 2))));
        data.setFeatureColumnsJson(objectMapper.writeValueAsString(List.of("a", "b")));
        data.setLabelColumn("b");
        when(datasetDataMapper.findByDatasetId(7L)).thenReturn(data);

        Map<String, Object> payload = service.loadCustomDataset("upload_x");

        assertNotNull(payload);
        assertEquals("csv", payload.get("sourceType"));
        assertEquals("b", payload.get("labelColumn"));
        assertEquals(1, ((List<?>) payload.get("rows")).size());
    }
}
