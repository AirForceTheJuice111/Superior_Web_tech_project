package com.example.mlplatform.common.enums;

public enum AlgorithmType {
    LINEAR_REGRESSION,
    KMEANS,
    SVM;

    public static AlgorithmType fromCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("算法类型不能为空");
        }

        return switch (code.trim().toLowerCase()) {
            case "linear_regression" -> LINEAR_REGRESSION;
            case "kmeans" -> KMEANS;
            case "svm" -> SVM;
            default -> throw new IllegalArgumentException("不支持的算法类型: " + code);
        };
    }

    public String toCode() {
        return switch (this) {
            case LINEAR_REGRESSION -> "linear_regression";
            case KMEANS -> "kmeans";
            case SVM -> "svm";
        };
    }
}
