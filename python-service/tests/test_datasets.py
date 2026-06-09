import numpy as np

import main


def test_iris_binary_dataset():
    x, y, names = main.build_iris_dataset(max_classes=2)
    assert x.shape[1] == 2  # 取花瓣两个特征用于二维画布
    assert set(np.unique(y).tolist()) == {0, 1}
    assert len(names) == 2


def test_iris_multiclass_dataset():
    x, y, names = main.build_iris_dataset()
    assert x.shape == (150, 2)
    assert len(names) == 3


def test_builtin_classification_routes_iris():
    class Req:
        algorithm = "svm"
        datasetId = "iris"

    x, y, names = main.build_builtin_classification_dataset(Req(), max_classes=2)
    assert x.shape[1] == 2
    assert len(names) == 2


def test_builtin_classification_default_blobs():
    class Req:
        algorithm = "svm"
        datasetId = "frontend_dataset"

    x, y, names = main.build_builtin_classification_dataset(Req(), max_classes=2)
    assert x.shape[1] == 2
    assert names == ["A", "B"]


def test_california_dataset_shape():
    # 真实数据需联网下载；离线时函数内部回退到合成数据，两种情况形状一致
    x, y = main.build_california_dataset(samples=20)
    assert x.shape == (20, 1)
    assert y.shape == (20,)
    assert np.all(np.isfinite(x))
    assert np.all(np.isfinite(y))
