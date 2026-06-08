package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.UploadDatasetRequest;
import com.example.mlplatform.dto.response.UploadedDatasetDetailResponse;
import com.example.mlplatform.dto.response.UploadedDatasetResponse;
import com.example.mlplatform.security.AuthPrincipal;
import com.example.mlplatform.security.CurrentUser;
import com.example.mlplatform.service.UploadedDatasetService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 上传数据集管理接口。
 *
 * 鉴权说明：所有归属判定均以 JWT 拦截器（M2）解析出的 {@link AuthPrincipal} 为准，
 * 不接受客户端自报的 userId，避免横向越权。
 */
@RestController
@RequestMapping("/api/datasets")
public class UploadedDatasetController {

    private final UploadedDatasetService uploadedDatasetService;

    public UploadedDatasetController(UploadedDatasetService uploadedDatasetService) {
        this.uploadedDatasetService = uploadedDatasetService;
    }

    @PostMapping("/upload")
    public ApiResponse<UploadedDatasetResponse> upload(@CurrentUser AuthPrincipal principal,
                                                       @Valid @RequestBody UploadDatasetRequest request) {
        request.setUserId(principal.userId());
        return ApiResponse.success("数据集上传成功", uploadedDatasetService.upload(request));
    }

    @GetMapping("/uploaded")
    public ApiResponse<List<UploadedDatasetResponse>> listUploaded(@CurrentUser AuthPrincipal principal) {
        return ApiResponse.success("获取上传数据集列表成功", uploadedDatasetService.listByOwner(principal.userId()));
    }

    @GetMapping("/uploaded/{code}")
    public ApiResponse<UploadedDatasetDetailResponse> getUploaded(@CurrentUser AuthPrincipal principal,
                                                                  @PathVariable String code) {
        return ApiResponse.success("获取上传数据集详情成功", uploadedDatasetService.getDetail(code, principal.userId()));
    }

    @DeleteMapping("/uploaded/{code}")
    public ApiResponse<Void> deleteUploaded(@CurrentUser AuthPrincipal principal, @PathVariable String code) {
        uploadedDatasetService.delete(code, principal.userId());
        return ApiResponse.success("数据集已删除", null);
    }
}
