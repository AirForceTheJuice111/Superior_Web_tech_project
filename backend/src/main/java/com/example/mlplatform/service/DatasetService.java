package com.example.mlplatform.service;

import com.example.mlplatform.dto.request.CreateDatasetRequest;
import com.example.mlplatform.dto.response.DatasetResponse;

import java.util.List;
import java.util.Map;

public interface DatasetService {

    List<DatasetResponse> listDatasets();

    DatasetResponse createDataset(CreateDatasetRequest request);

    /**
     * 若该 code 对应一个已落库的上传数据集，返回可直接转发给 Python 的 customDataset 负载，
     * 否则返回 null（内置数据集走各自的内置构造逻辑）。
     */
    Map<String, Object> loadCustomDataset(String datasetCode);
}
