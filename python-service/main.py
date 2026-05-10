from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sklearn.datasets import make_blobs

from stepwise_kmeans import StepwiseKMeans
from stepwise_linear_regression import StepwiseLinearRegression
from stepwise_svm import StepwiseSVM


class InitTrainingRequest(BaseModel):
    algorithm: str
    datasetId: str
    featureColumns: list[str]
    labelColumn: str | None = None
    hyperParams: dict[str, Any] = Field(default_factory=dict)
    trainConfig: dict[str, Any] = Field(default_factory=dict)


class StepTrainingRequest(BaseModel):
    stepCount: int = Field(default=1, ge=1)


class RunTrainingRequest(BaseModel):
    targetSteps: int = Field(default=10, ge=1)
    pushInterval: int = Field(default=1, ge=1)
    async_mode: bool = Field(default=True, alias="async")


@dataclass
class TrainingSession:
    session_id: str
    algorithm: str
    dataset_id: str
    feature_columns: list[str]
    label_column: str | None
    hyper_params: dict[str, Any]
    train_config: dict[str, Any]
    model: Any
    x_train: np.ndarray
    y_train: np.ndarray | None = None
    label_names: list[str] = field(default_factory=list)
    status: str = "initialized"
    max_steps: int = 100
    stop_requested: bool = False
    pause_requested: bool = False
    lock: threading.RLock = field(default_factory=threading.RLock)
    run_thread: threading.Thread | None = None


app = FastAPI(title="ML Python Training Service", version="1.0.0")
SESSIONS: dict[str, TrainingSession] = {}


@app.get("/internal/health")
def health() -> str:
    return "ok"


@app.post("/internal/trainings")
def init_training(request: InitTrainingRequest) -> dict[str, Any]:
    x_train, y_train, label_names, model = build_training_bundle(request)
    max_steps = int(request.trainConfig.get("maxSteps", request.hyperParams.get("epochs", 100)))

    session_id = f"py_train_{uuid.uuid4().hex}"
    session = TrainingSession(
        session_id=session_id,
        algorithm=request.algorithm,
        dataset_id=request.datasetId,
        feature_columns=request.featureColumns,
        label_column=request.labelColumn,
        hyper_params=request.hyperParams,
        train_config=request.trainConfig,
        model=model,
        x_train=x_train,
        y_train=y_train,
        label_names=label_names,
        max_steps=max_steps,
    )

    SESSIONS[session_id] = session
    return build_status_response(session)


@app.post("/internal/trainings/{session_id}/step")
def step_training(session_id: str, request: StepTrainingRequest) -> dict[str, Any]:
    session = get_session(session_id)
    with session.lock:
        validate_trainable(session)
        session.status = "running"
        for _ in range(request.stepCount):
            if current_step(session) >= session.max_steps:
                break
            session.model.step()
        session.status = "completed" if current_step(session) >= session.max_steps else "paused"
        session.pause_requested = False
        session.stop_requested = False
        return build_status_response(session)


@app.post("/internal/trainings/{session_id}/run")
def run_training(session_id: str, request: RunTrainingRequest) -> dict[str, Any]:
    session = get_session(session_id)
    with session.lock:
        validate_trainable(session)
        session.status = "running"
        session.pause_requested = False
        session.stop_requested = False

    if request.async_mode:
        thread = threading.Thread(
            target=run_loop,
            args=(session, request.targetSteps, request.pushInterval),
            daemon=True,
            name=f"py-run-{session_id}",
        )
        session.run_thread = thread
        thread.start()
        return build_status_response(session)

    run_loop(session, request.targetSteps, request.pushInterval)
    return build_status_response(session)


@app.get("/internal/trainings/{session_id}/status")
def get_status(session_id: str) -> dict[str, Any]:
    session = get_session(session_id)
    with session.lock:
        return build_status_response(session)


@app.post("/internal/trainings/{session_id}/reset")
def reset_training(session_id: str) -> dict[str, Any]:
    session = get_session(session_id)
    with session.lock:
        session.stop_requested = True
        session.pause_requested = False
        session.model.reset()
        session.status = "initialized"
        return build_status_response(session)


@app.post("/internal/trainings/{session_id}/pause")
def pause_training(session_id: str) -> dict[str, Any]:
    session = get_session(session_id)
    with session.lock:
        session.pause_requested = True
        if session.status == "running":
            session.status = "paused"
        return build_status_response(session)


@app.post("/internal/trainings/{session_id}/stop")
def stop_training(session_id: str) -> dict[str, Any]:
    session = get_session(session_id)
    with session.lock:
        session.stop_requested = True
        session.pause_requested = False
        session.status = "stopped"
        return build_status_response(session)


def run_loop(session: TrainingSession, target_steps: int, push_interval: int) -> None:
    remaining = target_steps
    while remaining > 0:
        with session.lock:
            if session.stop_requested:
                session.status = "stopped"
                return
            if session.pause_requested:
                session.status = "paused"
                return
            if current_step(session) >= session.max_steps:
                session.status = "completed"
                return

            session.status = "running"
            chunk = min(push_interval, remaining)
            for _ in range(chunk):
                if current_step(session) >= session.max_steps:
                    break
                session.model.step()
            remaining -= chunk

            if current_step(session) >= session.max_steps:
                session.status = "completed"
                return

        time.sleep(0.25)

    with session.lock:
        if not session.stop_requested and not session.pause_requested:
            session.status = "paused"


def build_training_bundle(
    request: InitTrainingRequest,
) -> tuple[np.ndarray, np.ndarray | None, list[str], Any]:
    if request.algorithm == "linear_regression":
        x_train, y_train = build_linear_regression_dataset(request)
        learning_rate = float(request.hyperParams.get("learningRate", 0.01))
        model = StepwiseLinearRegression(learning_rate=learning_rate)
        model.initialize(x_train, y_train)
        return x_train, y_train, [], model

    if request.algorithm == "svm":
        x_train, y_train, label_names = build_svm_dataset()
        learning_rate = float(request.hyperParams.get("learningRate", 0.01))
        model = StepwiseSVM(learning_rate=learning_rate)
        model.initialize(x_train, y_train, label_names=label_names)
        return x_train, y_train, label_names, model

    if request.algorithm == "kmeans":
        x_train = build_kmeans_dataset(int(request.hyperParams.get("kValue", 3)))
        model = StepwiseKMeans(
            n_clusters=int(request.hyperParams.get("kValue", 3)),
            random_state=42,
        )
        model.initialize(x_train)
        return x_train, None, [], model

    raise HTTPException(status_code=400, detail=f"不支持的算法类型: {request.algorithm}")


def build_linear_regression_dataset(request: InitTrainingRequest) -> tuple[np.ndarray, np.ndarray]:
    feature_count = max(1, len(request.featureColumns))
    samples = 20
    x_axis = np.linspace(1.0, 5.0, samples)

    features: list[np.ndarray] = []
    for index in range(feature_count):
        features.append(x_axis + index * 0.35)

    x_train = np.column_stack(features)
    weights = np.array([1.8 + index * 0.4 for index in range(feature_count)], dtype=float)
    y_train = x_train @ weights + 0.75
    return x_train, y_train


def build_svm_dataset() -> tuple[np.ndarray, np.ndarray, list[str]]:
    centers = [(-2.5, -1.8), (2.6, 2.2)]
    x_train, y_train = make_blobs(
        n_samples=36,
        centers=centers,
        cluster_std=0.75,
        random_state=42,
    )
    return x_train, y_train.astype(int), ["A", "B"]


def build_kmeans_dataset(cluster_count: int) -> np.ndarray:
    base_centers = [(-3.0, -2.0), (2.8, 2.4), (4.0, -2.6), (-1.2, 3.5), (5.0, 3.8), (-4.2, 2.7)]
    if cluster_count > len(base_centers):
        raise HTTPException(status_code=400, detail="当前 KMeans 示例数据最多支持 6 个聚类中心")
    x_train, _ = make_blobs(
        n_samples=max(cluster_count * 12, 36),
        centers=base_centers[: max(cluster_count, 1)],
        cluster_std=0.65,
        random_state=42,
    )
    return x_train


def build_status_response(session: TrainingSession) -> dict[str, Any]:
    if session.algorithm == "linear_regression":
        return build_linear_regression_response(session)
    if session.algorithm == "svm":
        return build_svm_response(session)
    if session.algorithm == "kmeans":
        return build_kmeans_response(session)
    raise HTTPException(status_code=400, detail=f"不支持的算法类型: {session.algorithm}")


def build_linear_regression_response(session: TrainingSession) -> dict[str, Any]:
    state = session.model.get_state()
    return {
        "sessionId": session.session_id,
        "algorithm": session.algorithm,
        "status": session.status,
        "currentStep": state["step"],
        "maxSteps": session.max_steps,
        "progress": round(state["step"] / session.max_steps, 4) if session.max_steps else 0.0,
        "loss": state["loss"],
        "metrics": {
            "mse": state["loss"],
            "accuracy": max(0.0, round(1.0 / (1.0 + state["loss"]), 6)),
        },
        "parameters": {
            "weights": state["weights"],
            "bias": state["bias"],
        },
        "predictions": build_linear_regression_predictions(session, state["predictions"]),
        "visualization": build_linear_regression_visualization(session, state["predictions"]),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def build_svm_response(session: TrainingSession) -> dict[str, Any]:
    state = session.model.get_state()
    return {
        "sessionId": session.session_id,
        "algorithm": session.algorithm,
        "status": session.status,
        "currentStep": state["step"],
        "maxSteps": session.max_steps,
        "progress": round(state["step"] / session.max_steps, 4) if session.max_steps else 0.0,
        "loss": state["loss"],
        "metrics": {
            "accuracy": state["accuracy"],
            "hingeLoss": state["loss"],
        },
        "parameters": {
            "weights": state["weights"],
            "bias": state["bias"],
        },
        "predictions": build_svm_predictions(session, state["predictions"]),
        "visualization": build_svm_visualization(session),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def build_kmeans_response(session: TrainingSession) -> dict[str, Any]:
    state = session.model.get_state()
    return {
        "sessionId": session.session_id,
        "algorithm": session.algorithm,
        "status": session.status,
        "currentStep": state["step"],
        "maxSteps": session.max_steps,
        "progress": round(state["step"] / session.max_steps, 4) if session.max_steps else 0.0,
        "loss": state["loss"],
        "metrics": {
            "inertia": state["loss"],
            "accuracy": state["accuracy"],
            "silhouette": state["accuracy"],
        },
        "parameters": {
            "centers": state["centers"],
            "clusterCount": session.model.n_clusters,
        },
        "predictions": build_kmeans_predictions(session, state["labels"]),
        "visualization": build_kmeans_visualization(session, state["labels"], state["centers"]),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def build_linear_regression_predictions(session: TrainingSession, predictions: list[float]) -> list[dict[str, Any]]:
    values: list[dict[str, Any]] = []
    x_feature = session.x_train[:, 0]
    for index, predicted in enumerate(predictions):
        values.append(
            {
                "x": round(float(x_feature[index]), 6),
                "y": round(float(session.y_train[index]), 6),
                "label": "true",
                "predicted": str(round(float(predicted), 6)),
            }
        )
    return values


def build_linear_regression_visualization(session: TrainingSession, predictions: list[float]) -> dict[str, Any]:
    order = np.argsort(session.x_train[:, 0])
    sorted_x = session.x_train[order, 0]
    sorted_y = session.y_train[order]
    sorted_pred = np.asarray(predictions, dtype=float)[order]

    return {
        "points": [
            {
                "x": round(float(sorted_x[index]), 6),
                "y": round(float(sorted_y[index]), 6),
                "label": "sample",
            }
            for index in range(len(sorted_x))
        ],
        "boundary": [[
            {
                "x": round(float(sorted_x[index]), 6),
                "y": round(float(sorted_pred[index]), 6),
            }
            for index in range(len(sorted_x))
        ]],
        "centers": [],
    }


def build_svm_predictions(session: TrainingSession, predictions: list[int]) -> list[dict[str, Any]]:
    values: list[dict[str, Any]] = []
    for index, predicted in enumerate(predictions):
        actual_label = session.model.decode_label(int(session.y_train[index]))
        predicted_label = session.model.decode_label(int(predicted))
        values.append(
            {
                "x": round(float(session.x_train[index][0]), 6),
                "y": round(float(session.x_train[index][1]), 6),
                "label": actual_label,
                "predicted": predicted_label,
            }
        )
    return values


def build_svm_visualization(session: TrainingSession) -> dict[str, Any]:
    state = session.model.get_state()
    weights = np.asarray(state["weights"], dtype=float)
    bias = float(state["bias"])

    points = []
    for index, point in enumerate(session.x_train):
        points.append(
            {
                "x": round(float(point[0]), 6),
                "y": round(float(point[1]), 6),
                "label": session.model.decode_label(int(session.y_train[index])),
            }
        )

    x_min = float(np.min(session.x_train[:, 0])) - 1.0
    x_max = float(np.max(session.x_train[:, 0])) + 1.0
    boundary = []
    if len(weights) >= 2 and abs(weights[1]) > 1e-8:
        y_min = float((-(weights[0] * x_min) - bias) / weights[1])
        y_max = float((-(weights[0] * x_max) - bias) / weights[1])
        boundary = [[
            {"x": round(x_min, 6), "y": round(y_min, 6)},
            {"x": round(x_max, 6), "y": round(y_max, 6)},
        ]]

    return {
        "points": points,
        "boundary": boundary,
        "centers": [],
    }


def build_kmeans_predictions(session: TrainingSession, labels: list[int]) -> list[dict[str, Any]]:
    values: list[dict[str, Any]] = []
    for index, label in enumerate(labels):
        values.append(
            {
                "x": round(float(session.x_train[index][0]), 6),
                "y": round(float(session.x_train[index][1]), 6),
                "label": f"cluster-{int(label) + 1}",
                "predicted": f"cluster-{int(label) + 1}",
            }
        )
    return values


def build_kmeans_visualization(
    session: TrainingSession,
    labels: list[int],
    centers: list[list[float]],
) -> dict[str, Any]:
    points = []
    for index, point in enumerate(session.x_train):
        points.append(
            {
                "x": round(float(point[0]), 6),
                "y": round(float(point[1]), 6),
                "label": f"cluster-{int(labels[index]) + 1}",
            }
        )

    return {
        "points": points,
        "boundary": [],
        "centers": [
            {
                "x": round(float(center[0]), 6),
                "y": round(float(center[1]), 6),
                "label": f"center-{index + 1}",
            }
            for index, center in enumerate(centers)
        ],
    }


def get_session(session_id: str) -> TrainingSession:
    session = SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"未找到训练会话: {session_id}")
    return session


def current_step(session: TrainingSession) -> int:
    return int(session.model.get_state()["step"])


def validate_trainable(session: LinearRegressionSession) -> None:
    if session.status == "stopped":
        raise HTTPException(status_code=400, detail="训练已停止，不能继续执行")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="训练已完成，不能继续执行")

