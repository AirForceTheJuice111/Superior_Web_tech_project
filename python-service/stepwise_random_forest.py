from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score


@dataclass
class StepResult:
    accuracy: float
    loss: float
    predictions: list[int]
    feature_importances: list[float]
    tree_count: int
    max_depth: int
    splits: list[dict[str, Any]]
    step: int


class StepwiseRandomForest:
    """Random forest demo that adds a small batch of trees on every step."""

    def __init__(
        self,
        n_estimators: int = 30,
        trees_per_step: int = 5,
        max_depth: int | None = 4,
        min_samples_split: int = 2,
        random_state: int = 42,
    ) -> None:
        self.n_estimators = max(1, int(n_estimators))
        self.trees_per_step = max(1, int(trees_per_step))
        self.max_depth = max_depth if max_depth is None else max(1, int(max_depth))
        self.min_samples_split = max(2, int(min_samples_split))
        self.random_state = random_state
        self._x: np.ndarray | None = None
        self._y: np.ndarray | None = None
        self._classifier: RandomForestClassifier | None = None
        self._step_count = 0
        self._tree_count = 0
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
            raise ValueError("x must be a 2D array")
        if len(x_array) != len(y_array):
            raise ValueError("x and y must contain the same number of samples")

        self._x = x_array
        self._y = y_array
        self._label_names = label_names or [str(item) for item in np.unique(y_array)]
        self._feature_names = feature_names or [f"feature_{index + 1}" for index in range(x_array.shape[1])]
        self.reset()

    def step(self) -> StepResult:
        if self._x is None or self._y is None:
            raise RuntimeError("Call initialize(x, y) first")

        self._tree_count = min(self.n_estimators, self._tree_count + self.trees_per_step)
        self._classifier = RandomForestClassifier(
            n_estimators=self._tree_count,
            max_depth=self.max_depth,
            min_samples_split=self.min_samples_split,
            random_state=self.random_state,
        )
        self._classifier.fit(self._x, self._y)
        self._step_count += 1
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
            raise RuntimeError("Call initialize(x, y) first")
        self._classifier = None
        self._step_count = 0
        self._tree_count = 0

    def _build_result(self) -> StepResult:
        if self._x is None or self._y is None:
            raise RuntimeError("Model is not initialized")

        if self._classifier is None:
            predictions = np.asarray(self._majority_predictions(len(self._x)), dtype=int)
            feature_importances = np.zeros(self._x.shape[1], dtype=float)
            splits: list[dict[str, Any]] = []
            tree_count = 0
        else:
            predictions = self._classifier.predict(self._x).astype(int)
            feature_importances = self._classifier.feature_importances_
            splits = self._extract_representative_splits()
            tree_count = len(self._classifier.estimators_)

        accuracy = float(accuracy_score(self._y, predictions))
        loss = 1.0 - accuracy

        return StepResult(
            accuracy=round(accuracy, 6),
            loss=round(loss, 6),
            predictions=predictions.tolist(),
            feature_importances=feature_importances.round(6).tolist(),
            tree_count=tree_count,
            max_depth=int(self.max_depth or 0),
            splits=splits,
            step=self._step_count,
        )

    def _majority_predictions(self, sample_count: int) -> list[int]:
        if self._y is None:
            return [0 for _ in range(sample_count)]
        values, counts = np.unique(self._y, return_counts=True)
        majority = int(values[int(np.argmax(counts))])
        return [majority for _ in range(sample_count)]

    def _extract_representative_splits(self) -> list[dict[str, Any]]:
        if self._classifier is None or len(self._classifier.estimators_) == 0:
            return []

        tree = self._classifier.estimators_[0].tree_
        splits: list[dict[str, Any]] = []

        def visit(node_id: int, depth: int) -> None:
            feature_index = int(tree.feature[node_id])
            if feature_index >= 0:
                splits.append({
                    "nodeId": int(node_id),
                    "depth": int(depth),
                    "featureIndex": feature_index,
                    "featureName": self._feature_name(feature_index),
                    "threshold": round(float(tree.threshold[node_id]), 6),
                })
                visit(int(tree.children_left[node_id]), depth + 1)
                visit(int(tree.children_right[node_id]), depth + 1)

        visit(0, 0)
        return splits

    def _feature_name(self, feature_index: int) -> str:
        if 0 <= feature_index < len(self._feature_names):
            return self._feature_names[feature_index]
        return f"feature_{feature_index + 1}"
