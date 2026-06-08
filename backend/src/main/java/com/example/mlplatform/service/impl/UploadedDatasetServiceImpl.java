package com.example.mlplatform.service.impl;

import com.example.mlplatform.config.DatasetUploadProperties;
import com.example.mlplatform.dto.request.UploadDatasetRequest;
import com.example.mlplatform.dto.response.UploadedDatasetDetailResponse;
import com.example.mlplatform.dto.response.UploadedDatasetResponse;
import com.example.mlplatform.persistence.entity.UploadedDatasetEntity;
import com.example.mlplatform.persistence.mapper.UploadedDatasetMapper;
import com.example.mlplatform.service.UploadedDatasetService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class UploadedDatasetServiceImpl implements UploadedDatasetService {

    private static final String SOURCE_TYPE = "upload";
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};
    private static final TypeReference<List<List<String>>> ROWS_TYPE = new TypeReference<>() {};

    private final UploadedDatasetMapper uploadedDatasetMapper;
    private final DatasetUploadProperties uploadProperties;
    private final ObjectMapper objectMapper;

    public UploadedDatasetServiceImpl(UploadedDatasetMapper uploadedDatasetMapper,
                                      DatasetUploadProperties uploadProperties,
                                      ObjectMapper objectMapper) {
        this.uploadedDatasetMapper = uploadedDatasetMapper;
        this.uploadProperties = uploadProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public UploadedDatasetResponse upload(UploadDatasetRequest request) {
        List<String> headers = sanitizeHeaders(request.getHeaders());
        List<List<String>> rows = validateAndSanitizeRows(request.getRows(), headers.size());

        String labelColumn = normalizeLabelColumn(request.getLabelColumn(), headers);
        List<String> numericColumns = detectNumericColumns(headers, rows);
        List<String> featureColumns = buildFeatureColumns(headers, labelColumn);
        if (featureColumns.isEmpty()) {
            throw new IllegalArgumentException("数据集至少需要一个特征列");
        }
        String taskType = resolveTaskType(request.getTaskType(), labelColumn);

        UploadedDatasetEntity entity = new UploadedDatasetEntity();
        entity.setCode(generateCode());
        entity.setName(request.getName().trim());
        entity.setDescription(request.getDescription() == null ? null : request.getDescription().trim());
        entity.setOwnerUserId(request.getUserId());
        entity.setTaskType(taskType);
        entity.setSourceType(SOURCE_TYPE);
        entity.setFeatureColumnsJson(writeJson(featureColumns));
        entity.setNumericColumnsJson(writeJson(numericColumns));
        entity.setLabelColumn(labelColumn);
        entity.setHeadersJson(writeJson(headers));
        entity.setRowsJson(writeJson(rows));
        entity.setRowCount(rows.size());
        entity.setColumnCount(headers.size());
        entity.setCreatedAt(LocalDateTime.now());

        uploadedDatasetMapper.insert(entity);
        return toResponse(entity);
    }

    @Override
    public List<UploadedDatasetResponse> listByOwner(Long ownerUserId) {
        if (ownerUserId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }
        return uploadedDatasetMapper.findByOwner(ownerUserId).stream().map(this::toResponse).toList();
    }

    @Override
    public UploadedDatasetDetailResponse getDetail(String code) {
        UploadedDatasetEntity entity = getOrThrow(code);
        List<String> headers = readJson(entity.getHeadersJson(), STRING_LIST, List.of());
        List<List<String>> rows = readJson(entity.getRowsJson(), ROWS_TYPE, List.of());
        int limit = Math.max(1, uploadProperties.getPreviewLimit());

        UploadedDatasetDetailResponse detail = new UploadedDatasetDetailResponse();
        detail.setMeta(toResponse(entity));
        detail.setHeaders(headers);
        detail.setPreviewRows(rows.size() > limit ? rows.subList(0, limit) : rows);
        detail.setPreviewLimit(limit);
        return detail;
    }

    @Override
    public void delete(String code, Long requesterUserId) {
        if (requesterUserId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }
        UploadedDatasetEntity entity = getOrThrow(code);
        if (!entity.getOwnerUserId().equals(requesterUserId)) {
            // 归属校验：禁止删除他人数据集
            throw new IllegalArgumentException("无权删除该数据集");
        }
        uploadedDatasetMapper.deleteByCode(code);
    }

    @Override
    public Optional<Map<String, Object>> buildCustomDataset(String code,
                                                            List<String> requestedFeatureColumns,
                                                            String requestedLabelColumn) {
        UploadedDatasetEntity entity = uploadedDatasetMapper.findByCode(code);
        if (entity == null) {
            return Optional.empty();
        }

        List<String> headers = readJson(entity.getHeadersJson(), STRING_LIST, List.of());
        List<List<String>> rows = readJson(entity.getRowsJson(), ROWS_TYPE, List.of());
        List<String> numericColumns = readJson(entity.getNumericColumnsJson(), STRING_LIST, List.of());
        List<String> storedFeatures = readJson(entity.getFeatureColumnsJson(), STRING_LIST, List.of());

        String labelColumn = (requestedLabelColumn != null && headers.contains(requestedLabelColumn))
                ? requestedLabelColumn
                : entity.getLabelColumn();

        List<String> featureColumns = resolveFeatureSelection(
                requestedFeatureColumns, storedFeatures, numericColumns, headers, labelColumn);
        if (featureColumns.isEmpty()) {
            throw new IllegalArgumentException("上传数据集没有可用的数值特征列用于训练");
        }

        List<List<Double>> featureMatrix = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        int labelIndex = labelColumn == null ? -1 : headers.indexOf(labelColumn);
        List<Integer> featureIndices = featureColumns.stream().map(headers::indexOf).toList();

        for (List<String> row : rows) {
            List<Double> featureRow = new ArrayList<>(featureIndices.size());
            boolean valid = true;
            for (int idx : featureIndices) {
                Double value = parseDouble(idx < row.size() ? row.get(idx) : null);
                if (value == null) {
                    valid = false;
                    break;
                }
                featureRow.add(value);
            }
            if (!valid) {
                continue;
            }
            featureMatrix.add(featureRow);
            if (labelIndex >= 0 && labelIndex < row.size()) {
                labels.add(row.get(labelIndex));
            }
        }

        if (featureMatrix.isEmpty()) {
            throw new IllegalArgumentException("上传数据集无有效的数值样本可用于训练");
        }

        Map<String, Object> custom = new java.util.HashMap<>();
        custom.put("code", entity.getCode());
        custom.put("featureColumns", featureColumns);
        custom.put("labelColumn", labelColumn);
        custom.put("features", featureMatrix);
        custom.put("labels", labelIndex >= 0 ? labels : List.of());
        custom.put("taskType", entity.getTaskType());
        return Optional.of(custom);
    }

    // ===== 校验与解析辅助方法 =====

    private List<String> sanitizeHeaders(List<String> rawHeaders) {
        int maxColumns = uploadProperties.getMaxColumns();
        if (rawHeaders.size() > maxColumns) {
            throw new IllegalArgumentException("列数超过上限 " + maxColumns);
        }
        List<String> headers = new ArrayList<>(rawHeaders.size());
        Set<String> seen = new HashSet<>();
        for (String raw : rawHeaders) {
            if (raw == null || raw.isBlank()) {
                throw new IllegalArgumentException("存在空列名");
            }
            String header = sanitizeCell(raw.trim());
            if (!seen.add(header)) {
                throw new IllegalArgumentException("存在重复列名: " + header);
            }
            headers.add(header);
        }
        if (headers.isEmpty()) {
            throw new IllegalArgumentException("headers 不能为空");
        }
        return headers;
    }

    private List<List<String>> validateAndSanitizeRows(List<List<String>> rawRows, int columnCount) {
        int maxRows = uploadProperties.getMaxRows();
        if (rawRows.size() > maxRows) {
            throw new IllegalArgumentException("行数超过上限 " + maxRows);
        }
        List<List<String>> rows = new ArrayList<>(rawRows.size());
        for (List<String> rawRow : rawRows) {
            if (rawRow == null || rawRow.size() != columnCount) {
                throw new IllegalArgumentException("数据行的列数与表头不一致");
            }
            List<String> row = new ArrayList<>(columnCount);
            for (String cell : rawRow) {
                row.add(sanitizeCell(cell == null ? "" : cell));
            }
            rows.add(row);
        }
        return rows;
    }

    /**
     * 防 CSV 注入：对以 = + - @ 开头的单元格加前导单引号转义，避免被电子表格当作公式执行；
     * 同时去除控制字符并限制单元格长度。后端只做存储，不解释任何单元格内容。
     */
    private String sanitizeCell(String value) {
        String cleaned = value.replaceAll("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "").trim();
        if (cleaned.length() > uploadProperties.getMaxCellLength()) {
            throw new IllegalArgumentException("单元格长度超过上限 " + uploadProperties.getMaxCellLength());
        }
        if (!cleaned.isEmpty()) {
            char first = cleaned.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@') {
                return "'" + cleaned;
            }
        }
        return cleaned;
    }

    private String normalizeLabelColumn(String labelColumn, List<String> headers) {
        if (labelColumn == null || labelColumn.isBlank()) {
            return null;
        }
        String trimmed = labelColumn.trim();
        if (!headers.contains(trimmed)) {
            throw new IllegalArgumentException("标签列不在表头中: " + trimmed);
        }
        return trimmed;
    }

    private List<String> buildFeatureColumns(List<String> headers, String labelColumn) {
        List<String> features = new ArrayList<>();
        for (String header : headers) {
            if (!header.equals(labelColumn)) {
                features.add(header);
            }
        }
        return features;
    }

    private List<String> detectNumericColumns(List<String> headers, List<List<String>> rows) {
        List<String> numeric = new ArrayList<>();
        for (int col = 0; col < headers.size(); col++) {
            boolean allNumeric = !rows.isEmpty();
            for (List<String> row : rows) {
                String cell = row.get(col);
                if (cell.isEmpty() || parseDouble(cell) == null) {
                    allNumeric = false;
                    break;
                }
            }
            if (allNumeric) {
                numeric.add(headers.get(col));
            }
        }
        return numeric;
    }

    private List<String> resolveFeatureSelection(List<String> requested,
                                                 List<String> storedFeatures,
                                                 List<String> numericColumns,
                                                 List<String> headers,
                                                 String labelColumn) {
        Set<String> numericSet = new HashSet<>(numericColumns);
        Set<String> ordered = new LinkedHashSet<>();
        List<String> candidates = (requested != null && !requested.isEmpty()) ? requested : storedFeatures;
        for (String column : candidates) {
            if (headers.contains(column) && !column.equals(labelColumn) && numericSet.contains(column)) {
                ordered.add(column);
            }
        }
        // 兜底：若选择列均非数值，则退回到全部数值特征列
        if (ordered.isEmpty()) {
            for (String column : numericColumns) {
                if (!column.equals(labelColumn)) {
                    ordered.add(column);
                }
            }
        }
        return new ArrayList<>(ordered);
    }

    private String resolveTaskType(String requestedTaskType, String labelColumn) {
        if (requestedTaskType != null && !requestedTaskType.isBlank()) {
            String normalized = requestedTaskType.trim().toLowerCase(Locale.ROOT);
            if (normalized.equals("supervised") || normalized.equals("unsupervised")) {
                return normalized;
            }
        }
        return labelColumn == null ? "unsupervised" : "supervised";
    }

    private Double parseDouble(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(trimmed);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String generateCode() {
        return "upload_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    private UploadedDatasetEntity getOrThrow(String code) {
        UploadedDatasetEntity entity = uploadedDatasetMapper.findByCode(code);
        if (entity == null) {
            throw new IllegalArgumentException("未找到上传数据集: " + code);
        }
        return entity;
    }

    private UploadedDatasetResponse toResponse(UploadedDatasetEntity entity) {
        UploadedDatasetResponse response = new UploadedDatasetResponse();
        response.setId(entity.getId());
        response.setCode(entity.getCode());
        response.setName(entity.getName());
        response.setDescription(entity.getDescription());
        response.setOwnerUserId(entity.getOwnerUserId());
        response.setTaskType(entity.getTaskType());
        response.setSourceType(entity.getSourceType());
        response.setFeatureColumns(readJson(entity.getFeatureColumnsJson(), STRING_LIST, List.of()));
        response.setNumericColumns(readJson(entity.getNumericColumnsJson(), STRING_LIST, List.of()));
        response.setLabelColumn(entity.getLabelColumn());
        response.setRowCount(entity.getRowCount());
        response.setColumnCount(entity.getColumnCount());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("序列化上传数据集失败", exception);
        }
    }

    private <T> T readJson(String value, TypeReference<T> typeReference, T defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return objectMapper.readValue(value, typeReference);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("反序列化上传数据集失败", exception);
        }
    }
}
