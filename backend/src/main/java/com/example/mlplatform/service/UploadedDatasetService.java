package com.example.mlplatform.service;

import com.example.mlplatform.dto.request.UploadDatasetRequest;
import com.example.mlplatform.dto.response.UploadedDatasetDetailResponse;
import com.example.mlplatform.dto.response.UploadedDatasetResponse;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface UploadedDatasetService {

    UploadedDatasetResponse upload(UploadDatasetRequest request);

    List<UploadedDatasetResponse> listByOwner(Long ownerUserId);

    UploadedDatasetDetailResponse getDetail(String code);

    void delete(String code, Long requesterUserId);

    /**
     * 训练初始化时调用：若 code 命中某个上传数据集，则把库中存储的数值化特征矩阵
     * 与标签封装为 Python 服务可消费的 customDataset 载荷；否则返回空。
     *
     * @param code                   数据集 code
     * @param requestedFeatureColumns 实验配置选择的特征列（为空则使用全部数值特征列）
     * @param requestedLabelColumn   实验配置选择的标签列（为空则使用数据集自带标签列）
     */
    Optional<Map<String, Object>> buildCustomDataset(String code,
                                                     List<String> requestedFeatureColumns,
                                                     String requestedLabelColumn);
}
