package com.example.mlplatform.service;

import com.example.mlplatform.dto.response.DatasetResponse;

import java.util.List;

public interface DatasetService {

    List<DatasetResponse> listDatasets();
}
