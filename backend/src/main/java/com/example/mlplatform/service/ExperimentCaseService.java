package com.example.mlplatform.service;

import com.example.mlplatform.dto.response.ExperimentCaseResponse;

import java.util.List;

public interface ExperimentCaseService {

    List<ExperimentCaseResponse> listCases();
}
