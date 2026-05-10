from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.metrics import silhouette_score


@dataclass
class StepResult:
    centers: list[list[float]]
    labels: list[int]
    loss: float
    accuracy: float
    step: int


class StepwiseKMeans:
    """自定义单步 KMeans：每次 step() 完成一次分配和一次中心更新。"""

    def __init__(self, n_clusters: int = 3, random_state: int = 42) -> None:
        self.n_clusters = n_clusters
        self.random_state = random_state
        self._x: np.ndarray | None = None
        self._centers: np.ndarray | None = None
        self._initial_centers: np.ndarray | None = None
        self._labels: np.ndarray | None = None
        self._step_count = 0

    def initialize(self, x: np.ndarray | list[list[float]]) -> None:
        x_array = np.asarray(x, dtype=float)
        if x_array.ndim != 2:
            raise ValueError("x 必须是二维数组")
        if len(x_array) < self.n_clusters:
            raise ValueError("样本数量必须大于等于聚类数")

        self._x = x_array
        self.reset()

    def step(self) -> StepResult:
        if self._x is None or self._centers is None:
            raise RuntimeError("请先调用 initialize(x)")

        labels = self._assign_clusters(self._x, self._centers)
        updated_centers = self._centers.copy()

        for cluster_index in range(self.n_clusters):
            cluster_points = self._x[labels == cluster_index]
            if len(cluster_points) > 0:
                updated_centers[cluster_index] = np.mean(cluster_points, axis=0)

        self._centers = updated_centers
        self._labels = self._assign_clusters(self._x, self._centers)
        self._step_count += 1

        loss = self._inertia(self._x, self._labels, self._centers)
        accuracy = self._silhouette(self._x, self._labels)
        return StepResult(
            centers=self._centers.round(6).tolist(),
            labels=self._labels.tolist(),
            loss=round(loss, 6),
            accuracy=round(accuracy, 6),
            step=self._step_count,
        )

    def get_state(self) -> dict[str, Any]:
        if self._x is None or self._centers is None or self._labels is None:
            raise RuntimeError("模型尚未初始化")

        loss = self._inertia(self._x, self._labels, self._centers)
        accuracy = self._silhouette(self._x, self._labels)
        return {
            "centers": self._centers.round(6).tolist(),
            "labels": self._labels.tolist(),
            "loss": round(loss, 6),
            "accuracy": round(accuracy, 6),
            "step": self._step_count,
        }

    def reset(self) -> None:
        if self._x is None:
            raise RuntimeError("请先调用 initialize(x)")

        rng = np.random.default_rng(self.random_state)
        indices = rng.choice(len(self._x), size=self.n_clusters, replace=False)
        self._initial_centers = self._x[indices].copy()
        self._centers = self._initial_centers.copy()
        self._labels = self._assign_clusters(self._x, self._centers)
        self._step_count = 0

    def _assign_clusters(self, x: np.ndarray, centers: np.ndarray) -> np.ndarray:
        distances = np.linalg.norm(x[:, None, :] - centers[None, :, :], axis=2)
        return np.argmin(distances, axis=1)

    def _inertia(self, x: np.ndarray, labels: np.ndarray, centers: np.ndarray) -> float:
        distances = x - centers[labels]
        return float(np.sum(distances ** 2))

    def _silhouette(self, x: np.ndarray, labels: np.ndarray) -> float:
        unique_labels = np.unique(labels)
        if len(unique_labels) < 2:
            return 0.0
        return float(silhouette_score(x, labels))
