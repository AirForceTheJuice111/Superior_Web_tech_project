package com.example.mlplatform.service;

import com.example.mlplatform.dto.request.SaveExperimentRequest;
import com.example.mlplatform.dto.response.ExperimentResponse;

import java.util.List;

public interface ExperimentService {

    ExperimentResponse saveExperiment(SaveExperimentRequest request);

    List<ExperimentResponse> listHistory(Long userId);
}
