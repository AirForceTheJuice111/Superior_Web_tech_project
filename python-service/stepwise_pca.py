from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler


@dataclass
class StepResult:
    transformed: list[list[float]]
    components: list[list[float]]
    explained_variance_ratio: list[float]
    explained_variance_total: float
    reconstruction_error: float
    labels: list[int]
    step: int


class StepwisePCA:
    """PCA demo that fits once and projects samples to the first two components."""

    def __init__(self, n_components: int = 2, standardize: bool = True) -> None:
        self.n_components = max(2, int(n_components))
        self.standardize = standardize
        self._x: np.ndarray | None = None
        self._labels: np.ndarray | None = None
        self._label_names: list[str] = []
        self._pca: PCA | None = None
        self._scaler: StandardScaler | None = None
        self._step_count = 0

    def initialize(
        self,
        x: np.ndarray | list[list[float]],
        labels: np.ndarray | list[int] | None = None,
        label_names: list[str] | None = None,
    ) -> None:
        x_array = np.asarray(x, dtype=float)
        if x_array.ndim != 2:
            raise ValueError("x must be a 2D array")
        if x_array.shape[1] < 2:
            raise ValueError("PCA needs at least two feature columns")

        self._x = x_array
        self._labels = None if labels is None else np.asarray(labels, dtype=int).reshape(-1)
        if self._labels is not None and len(self._labels) != len(x_array):
            raise ValueError("labels and x must contain the same number of samples")
        self._label_names = label_names or [str(item) for item in np.unique(self._labels)] if self._labels is not None else []
        self.reset()

    def step(self) -> StepResult:
        if self._x is None:
            raise RuntimeError("Call initialize(x) first")

        component_count = min(self.n_components, self._x.shape[1], len(self._x))
        self._scaler = StandardScaler() if self.standardize else None
        x_input = self._scaler.fit_transform(self._x) if self._scaler else self._x
        self._pca = PCA(n_components=component_count)
        self._pca.fit(x_input)
        self._step_count = 1
        return self._build_result()

    def get_state(self) -> dict[str, Any]:
        return self._build_result().__dict__

    def decode_label(self, label_id: int) -> str:
        if label_id < 0 or label_id >= len(self._label_names):
            return str(label_id)
        return self._label_names[label_id]

    def reset(self) -> None:
        if self._x is None:
            raise RuntimeError("Call initialize(x) first")
        self._pca = None
        self._scaler = None
        self._step_count = 0

    def _build_result(self) -> StepResult:
        if self._x is None:
            raise RuntimeError("Model is not initialized")

        if self._pca is None:
            transformed = np.zeros((len(self._x), 2), dtype=float)
            components = np.zeros((2, self._x.shape[1]), dtype=float)
            explained = np.zeros(2, dtype=float)
            reconstruction_error = 0.0
        else:
            x_input = self._scaler.transform(self._x) if self._scaler else self._x
            transformed_raw = self._pca.transform(x_input)
            transformed = self._pad_projection(transformed_raw)
            components = self._pad_components(self._pca.components_)
            explained = self._pad_explained(self._pca.explained_variance_ratio_)
            reconstructed = self._pca.inverse_transform(transformed_raw)
            reconstruction_error = float(np.mean((x_input - reconstructed) ** 2))

        labels = self._labels.astype(int).tolist() if self._labels is not None else [0 for _ in range(len(self._x))]
        return StepResult(
            transformed=np.round(transformed, 6).tolist(),
            components=np.round(components, 6).tolist(),
            explained_variance_ratio=np.round(explained, 6).tolist(),
            explained_variance_total=round(float(np.sum(explained)), 6),
            reconstruction_error=round(reconstruction_error, 6),
            labels=labels,
            step=self._step_count,
        )

    def _pad_projection(self, values: np.ndarray) -> np.ndarray:
        if values.shape[1] >= 2:
            return values[:, :2]
        return np.column_stack([values[:, 0], np.zeros(len(values), dtype=float)])

    def _pad_components(self, values: np.ndarray) -> np.ndarray:
        if len(values) >= 2:
            return values[:2]
        return np.vstack([values[0], np.zeros(values.shape[1], dtype=float)])

    def _pad_explained(self, values: np.ndarray) -> np.ndarray:
        if len(values) >= 2:
            return values[:2]
        return np.asarray([values[0], 0.0], dtype=float)
