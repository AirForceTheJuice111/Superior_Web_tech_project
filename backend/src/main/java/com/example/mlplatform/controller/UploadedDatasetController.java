package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.UploadDatasetRequest;
import com.example.mlplatform.dto.response.UploadedDatasetDetailResponse;
import com.example.mlplatform.dto.response.UploadedDatasetResponse;
import com.example.mlplatform.service.UploadedDatasetService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 上传数据集管理接口。
 *
 * 鉴权说明：本模块（M3）与鉴权拦截器模块（M2）正交开发，此处沿用现有 DatasetController
 * 的无 Filter 模式，归属与权限校验在 service 层通过 userId / owner_user_id 完成
 * （删除接口强制校验归属）。接入 M2 的 JWT 拦截器后，userId 可改由 SecurityContext 提供。
 */
@RestController
@RequestMapping("/api/datasets")
public class UploadedDatasetController {

    private final UploadedDatasetService uploadedDatasetService;

    public UploadedDatasetController(UploadedDatasetService uploadedDatasetService) {
        this.uploadedDatasetService = uploadedDatasetService;
    }

    @PostMapping("/upload")
    public ApiResponse<UploadedDatasetResponse> upload(@Valid @RequestBody UploadDatasetRequest request) {
        return ApiResponse.success("数据集上传成功", uploadedDatasetService.upload(request));
    }

    @GetMapping("/uploaded")
    public ApiResponse<List<UploadedDatasetResponse>> listUploaded(@RequestParam Long userId) {
        return ApiResponse.success("获取上传数据集列表成功", uploadedDatasetService.listByOwner(userId));
    }

    @GetMapping("/uploaded/{code}")
    public ApiResponse<UploadedDatasetDetailResponse> getUploaded(@PathVariable String code) {
        return ApiResponse.success("获取上传数据集详情成功", uploadedDatasetService.getDetail(code));
    }

    @DeleteMapping("/uploaded/{code}")
    public ApiResponse<Void> deleteUploaded(@PathVariable String code, @RequestParam Long userId) {
        uploadedDatasetService.delete(code, userId);
        return ApiResponse.success("数据集已删除", null);
    }
}
