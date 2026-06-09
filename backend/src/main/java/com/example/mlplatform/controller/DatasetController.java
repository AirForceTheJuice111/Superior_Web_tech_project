package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.CreateDatasetRequest;
import com.example.mlplatform.dto.response.DatasetResponse;
import com.example.mlplatform.service.DatasetService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

    private final DatasetService datasetService;

    public DatasetController(DatasetService datasetService) {
        this.datasetService = datasetService;
    }

    @GetMapping
    public ApiResponse<List<DatasetResponse>> listDatasets() {
        return ApiResponse.success("获取数据集列表成功", datasetService.listDatasets());
    }

    @PostMapping
    public ApiResponse<DatasetResponse> createDataset(@Valid @RequestBody CreateDatasetRequest request) {
        return ApiResponse.success("数据集保存成功", datasetService.createDataset(request));
    }
}
