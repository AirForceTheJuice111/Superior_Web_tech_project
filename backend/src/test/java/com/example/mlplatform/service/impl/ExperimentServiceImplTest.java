package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.request.SaveExperimentRequest;
import com.example.mlplatform.dto.response.ExperimentResponse;
import com.example.mlplatform.persistence.entity.AlgorithmMetaEntity;
import com.example.mlplatform.persistence.entity.DatasetMetaEntity;
import com.example.mlplatform.persistence.entity.ExperimentEntity;
import com.example.mlplatform.persistence.entity.UserEntity;
import com.example.mlplatform.persistence.mapper.AlgorithmMetaMapper;
import com.example.mlplatform.persistence.mapper.DatasetMetaMapper;
import com.example.mlplatform.persistence.mapper.ExperimentMapper;
import com.example.mlplatform.persistence.mapper.UserMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExperimentServiceImplTest {

    private ExperimentMapper experimentMapper;
    private UserMapper userMapper;
    private DatasetMetaMapper datasetMetaMapper;
    private AlgorithmMetaMapper algorithmMetaMapper;
    private ExperimentServiceImpl service;

    @BeforeEach
    void setUp() {
        experimentMapper = mock(ExperimentMapper.class);
        userMapper = mock(UserMapper.class);
        datasetMetaMapper = mock(DatasetMetaMapper.class);
        algorithmMetaMapper = mock(AlgorithmMetaMapper.class);
        service = new ExperimentServiceImpl(experimentMapper, userMapper, datasetMetaMapper,
                algorithmMetaMapper, new ObjectMapper());
    }

    private SaveExperimentRequest validRequest() {
        SaveExperimentRequest request = new SaveExperimentRequest();
        request.setUserId(1L);
        request.setName("exp");
        request.setLearningType("supervised");
        request.setAlgorithmCode("svm");
        request.setDatasetCode("iris");
        return request;
    }

    @Test
    void saveExperimentSucceedsForValidRequest() {
        when(userMapper.findById(1L)).thenReturn(new UserEntity());
        when(datasetMetaMapper.findByCode("iris")).thenReturn(new DatasetMetaEntity());
        when(algorithmMetaMapper.findByCode("svm")).thenReturn(new AlgorithmMetaEntity());

        ExperimentResponse response = service.saveExperiment(validRequest());

        assertEquals("exp", response.getName());
        verify(experimentMapper).insert(any(ExperimentEntity.class));
    }

    @Test
    void saveExperimentRejectsMissingUser() {
        when(userMapper.findById(1L)).thenReturn(null);
        assertThrows(IllegalArgumentException.class, () -> service.saveExperiment(validRequest()));
    }

    @Test
    void saveExperimentRejectsMissingDataset() {
        when(userMapper.findById(1L)).thenReturn(new UserEntity());
        when(datasetMetaMapper.findByCode("iris")).thenReturn(null);
        assertThrows(IllegalArgumentException.class, () -> service.saveExperiment(validRequest()));
    }

    @Test
    void uploadedCsvDatasetBypassesDatasetLookup() {
        SaveExperimentRequest request = validRequest();
        request.setDatasetCode("uploaded_csv");
        when(userMapper.findById(1L)).thenReturn(new UserEntity());
        when(algorithmMetaMapper.findByCode("svm")).thenReturn(new AlgorithmMetaEntity());

        ExperimentResponse response = service.saveExperiment(request);

        assertEquals("uploaded_csv", response.getDatasetCode());
        verify(experimentMapper).insert(any(ExperimentEntity.class));
    }
}
