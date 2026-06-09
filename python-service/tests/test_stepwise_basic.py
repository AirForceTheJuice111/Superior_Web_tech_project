import main
from main import InitTrainingRequest, build_status_response, build_training_bundle


def run_bundle(algorithm: str, hyper_params: dict, dataset_id: str = "frontend_dataset"):
    request = InitTrainingRequest(
        algorithm=algorithm,
        datasetId=dataset_id,
        featureColumns=["x1", "x2"],
        hyperParams=hyper_params,
        trainConfig={"maxSteps": 20},
    )
    x_train, y_train, label_names, model = build_training_bundle(request)
    return request, model


def test_kmeans_bundle_steps():
    _, model = run_bundle("kmeans", {"kValue": 3})
    for _ in range(3):
        model.step()
    state = model.get_state()
    assert len(state["centers"]) == 3
    assert state["step"] == 3


def test_linear_regression_bundle_steps():
    request = InitTrainingRequest(
        algorithm="linear_regression",
        datasetId="frontend_dataset",
        featureColumns=["x1"],
        hyperParams={"learningRate": 0.01},
        trainConfig={"maxSteps": 20},
    )
    x_train, y_train, label_names, model = build_training_bundle(request)
    for _ in range(5):
        model.step()
    state = model.get_state()
    assert state["step"] == 5
    assert "weights" in state


def test_status_response_contract_for_kmeans():
    request = InitTrainingRequest(
        algorithm="kmeans",
        datasetId="frontend_dataset",
        featureColumns=["x1", "x2"],
        hyperParams={"kValue": 3},
        trainConfig={"maxSteps": 20},
    )
    x_train, y_train, label_names, model = build_training_bundle(request)
    model.step()
    session = main.TrainingSession(
        session_id="t",
        algorithm="kmeans",
        dataset_id="frontend_dataset",
        feature_columns=["x1", "x2"],
        label_column=None,
        hyper_params=request.hyperParams,
        train_config=request.trainConfig,
        model=model,
        x_train=x_train,
        max_steps=20,
    )
    response = build_status_response(session)
    for key in ["sessionId", "status", "currentStep", "maxSteps", "metrics", "parameters", "visualization"]:
        assert key in response
