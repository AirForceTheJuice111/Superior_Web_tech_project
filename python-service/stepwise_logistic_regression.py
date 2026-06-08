from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.metrics import accuracy_score, log_loss


@dataclass
class StepResult:
    weights: list[float]
    bias: float
    loss: float
    accuracy: float
    probabilities: list[float]
    predictions: list[int]
    step: int


class StepwiseLogisticRegression:
    """Binary logistic regression with one gradient update per step."""

    def __init__(self, learning_rate: float = 0.05) -> None:
        self.learning_rate = learning_rate
        self._x: np.ndarray | None = None
        self._y: np.ndarray | None = None
        self._weights: np.ndarray | None = None
        self._bias = 0.0
        self._step_count = 0
        self._label_names: list[str] = []

    def initialize(
        self,
        x: np.ndarray | list[list[float]],
        y: np.ndarray | list[int],
        label_names: list[str] | None = None,
    ) -> None:
        x_array = np.asarray(x, dtype=float)
        y_array = np.asarray(y, dtype=int).reshape(-1)

        if x_array.ndim != 2:
            raise ValueError("x 必须是二维数组")
        if len(x_array) != len(y_array):
            raise ValueError("x 和 y 的样本数量必须一致")
        if len(np.unique(y_array)) != 2:
            raise ValueError("当前逻辑回归演示仅支持二分类")

        self._x = x_array
        self._y = y_array
        self._label_names = label_names or [str(item) for item in np.unique(y_array)]
        self.reset()

    def step(self) -> StepResult:
        if self._x is None or self._y is None or self._weights is None:
            raise RuntimeError("请先调用 initialize(x, y)")

        probabilities = self._predict_proba_raw(self._x)
        errors = probabilities - self._y
        sample_count = len(self._x)

        grad_w = (self._x.T @ errors) / sample_count
        grad_b = float(np.sum(errors) / sample_count)

        self._weights = self._weights - self.learning_rate * grad_w
        self._bias = self._bias - self.learning_rate * grad_b
        self._step_count += 1
        return self._build_result()

    def predict(self, x: np.ndarray | list[list[float]]) -> list[int]:
        probabilities = self.predict_proba(x)
        return [1 if value >= 0.5 else 0 for value in probabilities]

    def predict_proba(self, x: np.ndarray | list[list[float]]) -> list[float]:
        if self._weights is None:
            raise RuntimeError("模型尚未初始化")
        x_array = np.asarray(x, dtype=float)
        return self._predict_proba_raw(x_array).round(6).tolist()

    def get_state(self) -> dict[str, Any]:
        return self._build_result().__dict__

    def decode_label(self, label_id: int) -> str:
        if label_id < 0 or label_id >= len(self._label_names):
            return str(label_id)
        return self._label_names[label_id]

    def reset(self) -> None:
        if self._x is None:
            raise RuntimeError("请先调用 initialize(x, y)")
        self._weights = np.zeros(self._x.shape[1], dtype=float)
        self._bias = 0.0
        self._step_count = 0

    def _build_result(self) -> StepResult:
        if self._x is None or self._y is None or self._weights is None:
            raise RuntimeError("模型尚未初始化")

        probabilities = self._predict_proba_raw(self._x)
        predictions = (probabilities >= 0.5).astype(int)
        loss = float(log_loss(self._y, probabilities, labels=[0, 1]))
        accuracy = float(accuracy_score(self._y, predictions))

        return StepResult(
            weights=self._weights.round(6).tolist(),
            bias=round(float(self._bias), 6),
            loss=round(loss, 6),
            accuracy=round(accuracy, 6),
            probabilities=probabilities.round(6).tolist(),
            predictions=predictions.tolist(),
            step=self._step_count,
        )

    def _predict_proba_raw(self, x: np.ndarray) -> np.ndarray:
        if self._weights is None:
            raise RuntimeError("模型尚未初始化")
        logits = x @ self._weights + self._bias
        return 1.0 / (1.0 + np.exp(-np.clip(logits, -40.0, 40.0)))
