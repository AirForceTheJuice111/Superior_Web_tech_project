from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score


@dataclass
class StepResult:
    weights: list[float]
    bias: float
    loss: float
    accuracy: float
    predictions: list[int]
    step: int


class StepwiseSVM:
    """基于 SGDClassifier(partial_fit) 的可单步训练 SVM 近似实现。"""

    def __init__(self, learning_rate: float = 0.01, random_state: int = 42) -> None:
        self.learning_rate = learning_rate
        self.random_state = random_state
        self._x: np.ndarray | None = None
        self._y: np.ndarray | None = None
        self._weights: np.ndarray | None = None
        self._bias = 0.0
        self._step_count = 0
        self._classifier: SGDClassifier | None = None
        self._classes: np.ndarray | None = None
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

        self._x = x_array
        self._y = y_array
        self._classes = np.unique(y_array)
        self._label_names = label_names or [str(item) for item in self._classes]
        self.reset()

    def step(self) -> StepResult:
        if self._classifier is None or self._x is None or self._y is None or self._classes is None:
            raise RuntimeError("请先调用 initialize(x, y)")

        if self._step_count == 0:
            self._classifier.partial_fit(self._x, self._y, classes=self._classes)
        else:
            self._classifier.partial_fit(self._x, self._y)

        self._step_count += 1
        self._weights = self._classifier.coef_[0].copy()
        self._bias = float(self._classifier.intercept_[0])

        predictions = self._classifier.predict(self._x)
        accuracy = float(accuracy_score(self._y, predictions))
        loss = float(self._hinge_loss(self._x, self._y))

        return StepResult(
            weights=self._weights.round(6).tolist(),
            bias=round(self._bias, 6),
            loss=round(loss, 6),
            accuracy=round(accuracy, 6),
            predictions=predictions.tolist(),
            step=self._step_count,
        )

    def predict(self, x: np.ndarray | list[list[float]]) -> list[int]:
        if self._classifier is None:
            raise RuntimeError("模型尚未初始化")
        x_array = np.asarray(x, dtype=float)
        if self._step_count == 0 and self._weights is not None:
            decision = x_array @ self._weights + self._bias
            return (decision >= 0.0).astype(int).tolist()
        return self._classifier.predict(x_array).tolist()

    def get_state(self) -> dict[str, Any]:
        if self._x is None or self._y is None or self._weights is None:
            raise RuntimeError("模型尚未初始化")

        predictions = np.asarray(self.predict(self._x), dtype=int)
        accuracy = float(accuracy_score(self._y, predictions))
        loss = float(self._hinge_loss(self._x, self._y))

        return {
            "weights": self._weights.round(6).tolist(),
            "bias": round(float(self._bias), 6),
            "loss": round(loss, 6),
            "accuracy": round(accuracy, 6),
            "predictions": predictions.tolist(),
            "step": self._step_count,
        }

    def decode_label(self, label_id: int) -> str:
        if label_id < 0 or label_id >= len(self._label_names):
            return str(label_id)
        return self._label_names[label_id]

    def reset(self) -> None:
        if self._x is None:
            raise RuntimeError("请先调用 initialize(x, y)")

        self._classifier = SGDClassifier(
            loss="hinge",
            penalty="l2",
            alpha=0.0001,
            learning_rate="constant",
            eta0=self.learning_rate,
            random_state=self.random_state,
        )
        self._weights = np.zeros(self._x.shape[1], dtype=float)
        self._bias = 0.0
        self._step_count = 0

    def _hinge_loss(self, x: np.ndarray, y: np.ndarray) -> float:
        signed_labels = np.where(y == 0, -1.0, 1.0)
        decision = x @ self._weights + self._bias
        margin = 1.0 - signed_labels * decision
        return float(np.mean(np.maximum(0.0, margin)))
