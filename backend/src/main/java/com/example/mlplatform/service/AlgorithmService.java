package com.example.mlplatform.service;

import com.example.mlplatform.dto.response.AlgorithmMetaResponse;

import java.util.List;

public interface AlgorithmService {

    List<AlgorithmMetaResponse> listAlgorithms();
}
