from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.metrics import mean_squared_error


@dataclass
class StepResult:
    weights: list[float]
    bias: float
    loss: float
    predictions: list[float]
    step: int


class StepwiseLinearRegression:
    """支持单步梯度下降的线性回归模型。

    这个实现专门面向可视化训练过程，因此保留了 step()、reset() 和状态快照。
    """

    def __init__(self, learning_rate: float = 0.01) -> None:
        self.learning_rate = learning_rate
        self._x: np.ndarray | None = None
        self._y: np.ndarray | None = None
        self._weights: np.ndarray | None = None
        self._bias: float = 0.0
        self._step_count = 0

    def initialize(self, x: np.ndarray | list[list[float]], y: np.ndarray | list[float]) -> None:
        x_array = np.asarray(x, dtype=float)
        y_array = np.asarray(y, dtype=float).reshape(-1)

        if x_array.ndim != 2:
            raise ValueError("x 必须是二维数组，形状为 [n_samples, n_features]")
        if y_array.ndim != 1:
            raise ValueError("y 必须是一维数组")
        if len(x_array) != len(y_array):
            raise ValueError("x 和 y 的样本数量必须一致")

        self._x = x_array
        self._y = y_array
        self.reset()

    def step(self) -> StepResult:
        if self._x is None or self._y is None or self._weights is None:
            raise RuntimeError("请先调用 initialize(x, y)")

        predictions = self._predict_raw(self._x)
        errors = predictions - self._y
        sample_count = len(self._x)

        grad_w = (2.0 / sample_count) * (self._x.T @ errors)
        grad_b = float((2.0 / sample_count) * np.sum(errors))

        self._weights = self._weights - self.learning_rate * grad_w
        self._bias = self._bias - self.learning_rate * grad_b
        self._step_count += 1

        updated_predictions = self._predict_raw(self._x)
        loss = float(mean_squared_error(self._y, updated_predictions))
        return StepResult(
            weights=self._weights.round(6).tolist(),
            bias=round(float(self._bias), 6),
            loss=round(loss, 6),
            predictions=updated_predictions.round(6).tolist(),
            step=self._step_count,
        )

    def predict(self, x: np.ndarray | list[list[float]]) -> list[float]:
        if self._weights is None:
            raise RuntimeError("模型尚未初始化")
        x_array = np.asarray(x, dtype=float)
        return self._predict_raw(x_array).round(6).tolist()

    def get_state(self) -> dict[str, Any]:
        if self._weights is None:
            raise RuntimeError("模型尚未初始化")

        predictions = self._predict_raw(self._x) if self._x is not None else np.array([])
        loss = float(mean_squared_error(self._y, predictions)) if self._y is not None else 0.0
        return {
            "weights": self._weights.round(6).tolist(),
            "bias": round(float(self._bias), 6),
            "loss": round(loss, 6),
            "predictions": predictions.round(6).tolist(),
            "step": self._step_count,
        }

    def reset(self) -> None:
        if self._x is None:
            raise RuntimeError("请先调用 initialize(x, y)")
        self._weights = np.zeros(self._x.shape[1], dtype=float)
        self._bias = 0.0
        self._step_count = 0

    def _predict_raw(self, x: np.ndarray) -> np.ndarray:
        if self._weights is None:
            raise RuntimeError("模型尚未初始化")
        return x @ self._weights + self._bias


if __name__ == "__main__":
    x_train = np.array([[1.0], [2.0], [3.0], [4.0]], dtype=float)
    y_train = np.array([2.0, 4.0, 6.0, 8.0], dtype=float)

    model = StepwiseLinearRegression(learning_rate=0.05)
    model.initialize(x_train, y_train)

    print("初始化状态:", model.get_state())
    for _ in range(5):
        print("单步训练:", model.step())
    print("重置后状态:")
    model.reset()
    print(model.get_state())
