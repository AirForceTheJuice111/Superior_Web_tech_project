package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.response.AlgorithmMetaResponse;
import com.example.mlplatform.service.AlgorithmService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AlgorithmServiceImpl implements AlgorithmService {

    @Override
    public List<AlgorithmMetaResponse> listAlgorithms() {
        return List.of(
                buildLinearRegression(),
                buildSvm(),
                buildKMeans()
        );
    }

    private AlgorithmMetaResponse buildLinearRegression() {
        AlgorithmMetaResponse response = new AlgorithmMetaResponse();
        response.setCode("linear_regression");
        response.setName("线性回归");
        response.setCategory("regression");
        response.setParamsSchema(List.of(
                Map.of("key", "learningRate", "type", "number", "defaultValue", 0.01),
                Map.of("key", "epochs", "type", "number", "defaultValue", 100),
                Map.of("key", "fitIntercept", "type", "boolean", "defaultValue", true)
        ));
        return response;
    }

    private AlgorithmMetaResponse buildSvm() {
        AlgorithmMetaResponse response = new AlgorithmMetaResponse();
        response.setCode("svm");
        response.setName("支持向量机");
        response.setCategory("classification");
        response.setParamsSchema(List.of(
                Map.of("key", "kernel", "type", "select", "defaultValue", "rbf"),
                Map.of("key", "cValue", "type", "number", "defaultValue", 1.0),
                Map.of("key", "gamma", "type", "number", "defaultValue", 0.1)
        ));
        return response;
    }

    private AlgorithmMetaResponse buildKMeans() {
        AlgorithmMetaResponse response = new AlgorithmMetaResponse();
        response.setCode("kmeans");
        response.setName("KMeans");
        response.setCategory("clustering");
        response.setParamsSchema(List.of(
                Map.of("key", "kValue", "type", "number", "defaultValue", 3),
                Map.of("key", "maxIter", "type", "number", "defaultValue", 100),
                Map.of("key", "initMethod", "type", "select", "defaultValue", "k-means++")
        ));
        return response;
    }
}
