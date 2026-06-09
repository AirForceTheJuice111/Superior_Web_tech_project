package com.example.mlplatform.common.enums;

public enum AlgorithmType {
    LINEAR_REGRESSION,
    KMEANS,
    SVM,
    LOGISTIC_REGRESSION,
    DECISION_TREE,
    RANDOM_FOREST,
    PCA,
    Q_LEARNING;

    public static AlgorithmType fromCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("算法类型不能为空");
        }

        return switch (code.trim().toLowerCase()) {
            case "linear_regression" -> LINEAR_REGRESSION;
            case "kmeans" -> KMEANS;
            case "svm" -> SVM;
            case "logistic_regression" -> LOGISTIC_REGRESSION;
            case "decision_tree" -> DECISION_TREE;
            case "random_forest" -> RANDOM_FOREST;
            case "pca" -> PCA;
            case "q_learning" -> Q_LEARNING;
            default -> throw new IllegalArgumentException("不支持的算法类型: " + code);
        };
    }

    public String toCode() {
        return switch (this) {
            case LINEAR_REGRESSION -> "linear_regression";
            case KMEANS -> "kmeans";
            case SVM -> "svm";
            case LOGISTIC_REGRESSION -> "logistic_regression";
            case DECISION_TREE -> "decision_tree";
            case RANDOM_FOREST -> "random_forest";
            case PCA -> "pca";
            case Q_LEARNING -> "q_learning";
        };
    }
}
