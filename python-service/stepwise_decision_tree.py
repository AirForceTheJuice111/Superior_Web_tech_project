from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.metrics import accuracy_score
from sklearn.tree import DecisionTreeClassifier


@dataclass
class StepResult:
    accuracy: float
    loss: float
    predictions: list[int]
    feature_importances: list[float]
    tree_depth: int
    node_count: int
    leaf_count: int
    splits: list[dict[str, Any]]
    tree: dict[str, Any]
    step: int


class StepwiseDecisionTree:
    """Decision tree demo that grows one depth level per step."""

    def __init__(
        self,
        max_depth: int = 4,
        criterion: str = "gini",
        min_samples_split: int = 2,
        random_state: int = 42,
    ) -> None:
        self.max_depth = max(1, max_depth)
        self.criterion = criterion if criterion in {"gini", "entropy", "log_loss"} else "gini"
        self.min_samples_split = max(2, min_samples_split)
        self.random_state = random_state
        self._x: np.ndarray | None = None
        self._y: np.ndarray | None = None
        self._classifier: DecisionTreeClassifier | None = None
        self._step_count = 0
        self._label_names: list[str] = []
        self._feature_names: list[str] = []

    def initialize(
        self,
        x: np.ndarray | list[list[float]],
        y: np.ndarray | list[int],
        label_names: list[str] | None = None,
        feature_names: list[str] | None = None,
    ) -> None:
        x_array = np.asarray(x, dtype=float)
        y_array = np.asarray(y, dtype=int).reshape(-1)

        if x_array.ndim != 2:
            raise ValueError("x 必须是二维数组")
        if len(x_array) != len(y_array):
            raise ValueError("x 和 y 的样本数量必须一致")

        self._x = x_array
        self._y = y_array
        self._label_names = label_names or [str(item) for item in np.unique(y_array)]
        self._feature_names = feature_names or [f"feature_{index + 1}" for index in range(x_array.shape[1])]
        self.reset()

    def step(self) -> StepResult:
        if self._x is None or self._y is None:
            raise RuntimeError("请先调用 initialize(x, y)")

        next_depth = min(self._step_count + 1, self.max_depth)
        self._classifier = DecisionTreeClassifier(
            criterion=self.criterion,
            max_depth=next_depth,
            min_samples_split=self.min_samples_split,
            random_state=self.random_state,
        )
        self._classifier.fit(self._x, self._y)
        self._step_count = next_depth
        return self._build_result()

    def predict(self, x: np.ndarray | list[list[float]]) -> list[int]:
        if self._classifier is None:
            return self._majority_predictions(len(x))
        x_array = np.asarray(x, dtype=float)
        return self._classifier.predict(x_array).astype(int).tolist()

    def get_state(self) -> dict[str, Any]:
        return self._build_result().__dict__

    def decode_label(self, label_id: int) -> str:
        if label_id < 0 or label_id >= len(self._label_names):
            return str(label_id)
        return self._label_names[label_id]

    def reset(self) -> None:
        if self._x is None:
            raise RuntimeError("请先调用 initialize(x, y)")
        self._classifier = None
        self._step_count = 0

    def _build_result(self) -> StepResult:
        if self._x is None or self._y is None:
            raise RuntimeError("模型尚未初始化")

        if self._classifier is None:
            predictions = np.asarray(self._majority_predictions(len(self._x)), dtype=int)
            feature_importances = np.zeros(self._x.shape[1], dtype=float)
            tree_depth = 0
            node_count = 1
            leaf_count = 1
            splits: list[dict[str, Any]] = []
            tree = self._build_majority_tree()
        else:
            predictions = self._classifier.predict(self._x).astype(int)
            feature_importances = self._classifier.feature_importances_
            tree_depth = int(self._classifier.get_depth())
            node_count = int(self._classifier.tree_.node_count)
            leaf_count = int(self._classifier.get_n_leaves())
            splits = self._extract_splits()
            tree = self._extract_tree()

        accuracy = float(accuracy_score(self._y, predictions))
        loss = 1.0 - accuracy
        return StepResult(
            accuracy=round(accuracy, 6),
            loss=round(loss, 6),
            predictions=predictions.tolist(),
            feature_importances=feature_importances.round(6).tolist(),
            tree_depth=tree_depth,
            node_count=node_count,
            leaf_count=leaf_count,
            splits=splits,
            tree=tree,
            step=self._step_count,
        )

    def _majority_predictions(self, sample_count: int) -> list[int]:
        if self._y is None:
            return [0 for _ in range(sample_count)]
        values, counts = np.unique(self._y, return_counts=True)
        majority = int(values[int(np.argmax(counts))])
        return [majority for _ in range(sample_count)]

    def _extract_splits(self) -> list[dict[str, Any]]:
        if self._classifier is None:
            return []

        tree = self._classifier.tree_
        splits: list[dict[str, Any]] = []

        def visit(node_id: int, depth: int) -> None:
            feature_index = int(tree.feature[node_id])
            threshold = float(tree.threshold[node_id])
            if feature_index >= 0:
                splits.append({
                    "nodeId": node_id,
                    "depth": depth,
                    "featureIndex": feature_index,
                    "threshold": round(threshold, 6),
                })
                visit(int(tree.children_left[node_id]), depth + 1)
                visit(int(tree.children_right[node_id]), depth + 1)

        visit(0, 0)
        return splits

    def _build_majority_tree(self) -> dict[str, Any]:
        if self._y is None:
            return {
                "nodeId": 0,
                "depth": 0,
                "isLeaf": True,
                "samples": 0,
                "impurity": 0.0,
                "prediction": "0",
                "classCounts": [],
            }

        values, counts = np.unique(self._y, return_counts=True)
        majority = int(values[int(np.argmax(counts))])
        return {
            "nodeId": 0,
            "depth": 0,
            "isLeaf": True,
            "samples": int(len(self._y)),
            "impurity": 0.0,
            "prediction": self.decode_label(majority),
            "classCounts": [
                {
                    "label": self.decode_label(int(value)),
                    "count": int(count),
                }
                for value, count in zip(values, counts)
            ],
        }

    def _extract_tree(self) -> dict[str, Any]:
        if self._classifier is None:
            return self._build_majority_tree()

        tree = self._classifier.tree_
        classes = self._classifier.classes_.astype(int).tolist()

        def build(node_id: int, depth: int) -> dict[str, Any]:
            feature_index = int(tree.feature[node_id])
            threshold = float(tree.threshold[node_id])
            counts = np.asarray(tree.value[node_id][0], dtype=float)
            predicted_position = int(np.argmax(counts))
            predicted_class = int(classes[predicted_position]) if predicted_position < len(classes) else predicted_position
            is_leaf = feature_index < 0

            node = {
                "nodeId": int(node_id),
                "depth": int(depth),
                "isLeaf": is_leaf,
                "samples": int(tree.n_node_samples[node_id]),
                "impurity": round(float(tree.impurity[node_id]), 6),
                "prediction": self.decode_label(predicted_class),
                "classCounts": [
                    {
                        "label": self.decode_label(int(class_id)),
                        "count": round(float(count), 6),
                    }
                    for class_id, count in zip(classes, counts)
                ],
            }

            if not is_leaf:
                node["featureIndex"] = feature_index
                node["featureName"] = self._feature_name(feature_index)
                node["threshold"] = round(threshold, 6)
                node["left"] = build(int(tree.children_left[node_id]), depth + 1)
                node["right"] = build(int(tree.children_right[node_id]), depth + 1)

            return node

        return build(0, 0)

    def _feature_name(self, feature_index: int) -> str:
        if 0 <= feature_index < len(self._feature_names):
            return self._feature_names[feature_index]
        return f"feature_{feature_index + 1}"
