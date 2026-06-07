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

from stepwise_decision_tree import StepwiseDecisionTree
from stepwise_kmeans import StepwiseKMeans
from stepwise_linear_regression import StepwiseLinearRegression
from stepwise_logistic_regression import StepwiseLogisticRegression
from stepwise_pca import StepwisePCA
from stepwise_random_forest import StepwiseRandomForest
from stepwise_svm import StepwiseSVM


class InitTrainingRequest(BaseModel):
    algorithm: str
    datasetId: str
    featureColumns: list[str]
    labelColumn: str | None = None
    hyperParams: dict[str, Any] = Field(default_factory=dict)
    trainConfig: dict[str, Any] = Field(default_factory=dict)
    customDataset: dict[str, Any] | None = None


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
    max_steps = resolve_max_steps(request)

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
        with session.lock:
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
        if has_custom_dataset(request):
            x_train, y_train, _ = build_custom_dataset(request, require_label=True, classification=False)
        else:
            x_train, y_train = build_linear_regression_dataset(request)
        learning_rate = float(request.hyperParams.get("learningRate", 0.01))
        model = StepwiseLinearRegression(learning_rate=learning_rate)
        model.initialize(x_train, y_train)
        return x_train, y_train, [], model

    if request.algorithm == "svm":
        if has_custom_dataset(request):
            x_train, y_train, label_names = build_custom_dataset(
                request,
                require_label=True,
                classification=True,
                max_classes=2,
            )
        else:
            x_train, y_train, label_names = build_svm_dataset()
        learning_rate = float(request.hyperParams.get("learningRate", 0.01))
        model = StepwiseSVM(learning_rate=learning_rate)
        model.initialize(x_train, y_train, label_names=label_names)
        return x_train, y_train, label_names, model

    if request.algorithm == "logistic_regression":
        if has_custom_dataset(request):
            x_train, y_train, label_names = build_custom_dataset(
                request,
                require_label=True,
                classification=True,
                max_classes=2,
            )
        else:
            x_train, y_train, label_names = build_svm_dataset()
        learning_rate = float(request.hyperParams.get("learningRate", 0.05))
        model = StepwiseLogisticRegression(learning_rate=learning_rate)
        model.initialize(x_train, y_train, label_names=label_names)
        return x_train, y_train, label_names, model

    if request.algorithm == "decision_tree":
        if has_custom_dataset(request):
            x_train, y_train, label_names = build_custom_dataset(
                request,
                require_label=True,
                classification=True,
            )
        else:
            x_train, y_train, label_names = build_svm_dataset()
        model = StepwiseDecisionTree(
            max_depth=int(request.hyperParams.get("maxDepth", 4)),
            criterion=str(request.hyperParams.get("criterion", "gini")),
            min_samples_split=int(request.hyperParams.get("minSamplesSplit", 2)),
            random_state=42,
        )
        model.initialize(x_train, y_train, label_names=label_names, feature_names=request.featureColumns)
        return x_train, y_train, label_names, model

    if request.algorithm == "random_forest":
        if has_custom_dataset(request):
            x_train, y_train, label_names = build_custom_dataset(
                request,
                require_label=True,
                classification=True,
            )
        else:
            x_train, y_train, label_names = build_svm_dataset()
        model = StepwiseRandomForest(
            n_estimators=int(request.hyperParams.get("nEstimators", 30)),
            trees_per_step=int(request.hyperParams.get("treesPerStep", 5)),
            max_depth=int(request.hyperParams.get("maxDepth", 4)),
            min_samples_split=int(request.hyperParams.get("minSamplesSplit", 2)),
            random_state=42,
        )
        model.initialize(x_train, y_train, label_names=label_names, feature_names=request.featureColumns)
        return x_train, y_train, label_names, model

    if request.algorithm == "kmeans":
        if has_custom_dataset(request):
            x_train, _, _ = build_custom_dataset(request, require_label=False, classification=False)
        else:
            x_train = build_kmeans_dataset(int(request.hyperParams.get("kValue", 3)))
        model = StepwiseKMeans(
            n_clusters=int(request.hyperParams.get("kValue", 3)),
            random_state=42,
        )
        model.initialize(x_train)
        return x_train, None, [], model

    if request.algorithm == "pca":
        if has_custom_dataset(request):
            x_train, _, _ = build_custom_dataset(request, require_label=False, classification=False)
            y_train = None
            label_names: list[str] = []
        else:
            x_train, y_train, label_names = build_pca_dataset()
            request.featureColumns = [f"feature_{index + 1}" for index in range(x_train.shape[1])]
        model = StepwisePCA(
            n_components=int(request.hyperParams.get("nComponents", 2)),
            standardize=bool(request.hyperParams.get("standardize", True)),
        )
        model.initialize(x_train, labels=y_train, label_names=label_names)
        return x_train, y_train, label_names, model

    raise HTTPException(status_code=400, detail=f"不支持的算法类型: {request.algorithm}")


def resolve_max_steps(request: InitTrainingRequest) -> int:
    if request.algorithm == "decision_tree":
        return int(request.hyperParams.get("maxDepth", request.trainConfig.get("maxSteps", 4)))
    if request.algorithm == "random_forest":
        estimator_count = int(request.hyperParams.get("nEstimators", 30))
        trees_per_step = max(1, int(request.hyperParams.get("treesPerStep", 5)))
        return max(1, int(np.ceil(estimator_count / trees_per_step)))
    if request.algorithm == "pca":
        return 1
    return int(request.trainConfig.get("maxSteps", request.hyperParams.get("epochs", request.hyperParams.get("maxIter", 100))))


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


def build_pca_dataset() -> tuple[np.ndarray, np.ndarray, list[str]]:
    centers = [
        (-2.5, -1.8, 0.4, 1.1),
        (2.6, 2.2, 2.1, -1.2),
        (4.0, -2.6, -1.4, 2.8),
    ]
    x_train, labels = make_blobs(
        n_samples=60,
        centers=centers,
        cluster_std=0.75,
        random_state=42,
    )
    return x_train, labels.astype(int), ["Group A", "Group B", "Group C"]


def has_custom_dataset(request: InitTrainingRequest) -> bool:
    dataset = request.customDataset
    return isinstance(dataset, dict) and isinstance(dataset.get("rows"), list) and len(dataset.get("rows", [])) > 0


def build_custom_dataset(
    request: InitTrainingRequest,
    require_label: bool,
    classification: bool,
    max_classes: int | None = None,
) -> tuple[np.ndarray, np.ndarray | None, list[str]]:
    dataset = request.customDataset or {}
    rows = dataset.get("rows")
    if not isinstance(rows, list) or len(rows) == 0:
        raise HTTPException(status_code=400, detail="CSV dataset has no rows")

    feature_columns = request.featureColumns or dataset.get("featureColumns") or []
    if not isinstance(feature_columns, list):
        raise HTTPException(status_code=400, detail="CSV featureColumns must be a list")
    feature_columns = [str(item) for item in feature_columns if str(item).strip()]

    minimum_feature_count = 1 if request.algorithm == "linear_regression" else 2
    if len(feature_columns) < minimum_feature_count:
        raise HTTPException(status_code=400, detail=f"CSV dataset needs at least {minimum_feature_count} feature columns")

    label_column = request.labelColumn if request.labelColumn is not None else dataset.get("labelColumn")
    if require_label and not label_column:
        raise HTTPException(status_code=400, detail="CSV dataset needs a label column")
    if label_column and label_column in feature_columns:
        raise HTTPException(status_code=400, detail="CSV label column cannot also be a feature column")

    feature_values: list[list[float]] = []
    label_values: list[Any] = []

    for row_index, raw_row in enumerate(rows):
        if not isinstance(raw_row, dict):
            raise HTTPException(status_code=400, detail=f"CSV row {row_index + 1} is invalid")

        feature_values.append([
            read_csv_float(raw_row.get(column), column, row_index)
            for column in feature_columns
        ])

        if require_label:
            label_values.append(raw_row.get(str(label_column)))

    if len(feature_values) < 2:
        raise HTTPException(status_code=400, detail="CSV dataset needs at least 2 usable rows")

    x_train = np.asarray(feature_values, dtype=float)
    if not np.all(np.isfinite(x_train)):
        raise HTTPException(status_code=400, detail="CSV feature values must be finite numbers")

    if not require_label:
        return x_train, None, []

    if classification:
        label_names: list[str] = []
        encoded_labels: list[int] = []
        for row_index, value in enumerate(label_values):
            if value is None or str(value).strip() == "":
                raise HTTPException(status_code=400, detail=f"CSV label is missing on row {row_index + 1}")
            label = str(value).strip()
            if label not in label_names:
                label_names.append(label)
            encoded_labels.append(label_names.index(label))

        if len(label_names) < 2:
            raise HTTPException(status_code=400, detail="CSV classification dataset needs at least 2 classes")
        if max_classes is not None and len(label_names) > max_classes:
            raise HTTPException(status_code=400, detail=f"This algorithm supports at most {max_classes} classes")
        return x_train, np.asarray(encoded_labels, dtype=int), label_names

    y_train = np.asarray([
        read_csv_float(value, str(label_column), row_index)
        for row_index, value in enumerate(label_values)
    ], dtype=float)
    return x_train, y_train, []


def read_csv_float(value: Any, column: str, row_index: int) -> float:
    if value is None or str(value).strip() == "":
        raise HTTPException(status_code=400, detail=f"CSV value is missing at row {row_index + 1}, column {column}")
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exception:
        raise HTTPException(
            status_code=400,
            detail=f"CSV value must be numeric at row {row_index + 1}, column {column}",
        ) from exception
    if not np.isfinite(parsed):
        raise HTTPException(status_code=400, detail=f"CSV value must be finite at row {row_index + 1}, column {column}")
    return parsed


def build_status_response(session: TrainingSession) -> dict[str, Any]:
    if session.algorithm == "linear_regression":
        return build_linear_regression_response(session)
    if session.algorithm == "svm":
        return build_svm_response(session)
    if session.algorithm == "logistic_regression":
        return build_logistic_regression_response(session)
    if session.algorithm == "decision_tree":
        return build_decision_tree_response(session)
    if session.algorithm == "random_forest":
        return build_random_forest_response(session)
    if session.algorithm == "kmeans":
        return build_kmeans_response(session)
    if session.algorithm == "pca":
        return build_pca_response(session)
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
            "featureNames": session.feature_columns,
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
            "featureNames": session.feature_columns,
        },
        "predictions": build_svm_predictions(session, state["predictions"]),
        "visualization": build_svm_visualization(session),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def build_logistic_regression_response(session: TrainingSession) -> dict[str, Any]:
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
            "logLoss": state["loss"],
        },
        "parameters": {
            "weights": state["weights"],
            "bias": state["bias"],
            "featureNames": session.feature_columns,
        },
        "predictions": build_classification_predictions(session, state["predictions"]),
        "visualization": build_linear_classifier_visualization(session, state["weights"], state["bias"]),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def build_decision_tree_response(session: TrainingSession) -> dict[str, Any]:
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
            "errorRate": state["loss"],
        },
        "parameters": {
            "featureImportances": state["feature_importances"],
            "featureNames": session.feature_columns,
            "treeDepth": state["tree_depth"],
            "nodeCount": state["node_count"],
            "leafCount": state["leaf_count"],
            "splits": state["splits"],
            "tree": state["tree"],
        },
        "predictions": build_classification_predictions(session, state["predictions"]),
        "visualization": build_decision_tree_visualization(session, state["splits"]),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def build_random_forest_response(session: TrainingSession) -> dict[str, Any]:
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
            "errorRate": state["loss"],
            "treeCount": state["tree_count"],
        },
        "parameters": {
            "featureImportances": state["feature_importances"],
            "featureNames": session.feature_columns,
            "treeCount": state["tree_count"],
            "maxDepth": state["max_depth"],
            "splits": state["splits"],
        },
        "predictions": build_classification_predictions(session, state["predictions"]),
        "visualization": build_decision_tree_visualization(session, state["splits"]),
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
            "featureNames": session.feature_columns,
        },
        "predictions": build_kmeans_predictions(session, state["labels"]),
        "visualization": build_kmeans_visualization(session, state["labels"], state["centers"]),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def build_pca_response(session: TrainingSession) -> dict[str, Any]:
    state = session.model.get_state()
    return {
        "sessionId": session.session_id,
        "algorithm": session.algorithm,
        "status": session.status,
        "currentStep": state["step"],
        "maxSteps": session.max_steps,
        "progress": round(state["step"] / session.max_steps, 4) if session.max_steps else 0.0,
        "loss": state["reconstruction_error"],
        "metrics": {
            "explainedVariance": state["explained_variance_total"],
            "reconstructionError": state["reconstruction_error"],
        },
        "parameters": {
            "components": state["components"],
            "explainedVarianceRatio": state["explained_variance_ratio"],
            "featureNames": session.feature_columns,
        },
        "predictions": build_pca_predictions(session, state["transformed"], state["labels"]),
        "visualization": build_pca_visualization(session, state["transformed"], state["labels"]),
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


def build_classification_predictions(session: TrainingSession, predictions: list[int]) -> list[dict[str, Any]]:
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


def build_linear_classifier_visualization(
    session: TrainingSession,
    weights: list[float],
    bias: float,
) -> dict[str, Any]:
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
    weights_array = np.asarray(weights, dtype=float)
    boundary = []
    if len(weights_array) >= 2 and abs(weights_array[1]) > 1e-8:
        y_min = float((-(weights_array[0] * x_min) - bias) / weights_array[1])
        y_max = float((-(weights_array[0] * x_max) - bias) / weights_array[1])
        boundary = [[
            {"x": round(x_min, 6), "y": round(y_min, 6)},
            {"x": round(x_max, 6), "y": round(y_max, 6)},
        ]]

    return {
        "points": points,
        "boundary": boundary,
        "centers": [],
    }


def build_decision_tree_visualization(session: TrainingSession, splits: list[dict[str, Any]]) -> dict[str, Any]:
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
    y_min = float(np.min(session.x_train[:, 1])) - 1.0
    y_max = float(np.max(session.x_train[:, 1])) + 1.0
    boundary = []

    for split in splits:
        feature_index = int(split.get("featureIndex", -1))
        threshold = float(split.get("threshold", 0.0))
        if feature_index == 0 and x_min <= threshold <= x_max:
            boundary.append([
                {"x": round(threshold, 6), "y": round(y_min, 6)},
                {"x": round(threshold, 6), "y": round(y_max, 6)},
            ])
        elif feature_index == 1 and y_min <= threshold <= y_max:
            boundary.append([
                {"x": round(x_min, 6), "y": round(threshold, 6)},
                {"x": round(x_max, 6), "y": round(threshold, 6)},
            ])

    return {
        "points": points,
        "boundary": boundary,
        "centers": [],
    }


def build_pca_predictions(
    session: TrainingSession,
    transformed: list[list[float]],
    labels: list[int],
) -> list[dict[str, Any]]:
    values: list[dict[str, Any]] = []
    for index, point in enumerate(transformed):
        label_id = int(labels[index]) if index < len(labels) else 0
        label = session.model.decode_label(label_id) if session.label_names else "sample"
        values.append(
            {
                "x": round(float(point[0]), 6),
                "y": round(float(point[1]), 6),
                "label": label,
                "predicted": label,
            }
        )
    return values


def build_pca_visualization(
    session: TrainingSession,
    transformed: list[list[float]],
    labels: list[int],
) -> dict[str, Any]:
    points = []
    for index, point in enumerate(transformed):
        label_id = int(labels[index]) if index < len(labels) else 0
        label = session.model.decode_label(label_id) if session.label_names else "sample"
        points.append(
            {
                "x": round(float(point[0]), 6),
                "y": round(float(point[1]), 6),
                "label": label,
            }
        )

    return {
        "points": points,
        "boundary": [],
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


def validate_trainable(session: TrainingSession) -> None:
    if session.status == "stopped":
        raise HTTPException(status_code=400, detail="训练已停止，不能继续执行")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="训练已完成，不能继续执行")

