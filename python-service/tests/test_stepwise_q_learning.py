import numpy as np

from stepwise_q_learning import StepwiseQLearning


def make_model(grid_size: int = 5) -> StepwiseQLearning:
    model = StepwiseQLearning(
        grid_size=grid_size,
        epsilon=0.3,
        alpha=0.2,
        gamma=0.9,
        max_episode_steps=80,
        random_state=42,
    )
    model.initialize()
    return model


def test_initialize_builds_reachable_grid():
    model = make_model()
    state = model.get_state()
    assert state["gridSize"] == 5
    assert state["start"] == [0, 0]
    assert state["goal"] == [4, 4]
    # 起点和终点不应是障碍
    obstacles = {tuple(cell) for cell in state["obstacles"]}
    assert (0, 0) not in obstacles
    assert (4, 4) not in obstacles


def test_step_updates_q_table():
    model = make_model()
    before = model.get_state()["values"]
    for _ in range(30):
        model.step()
    after = model.get_state()["values"]
    # 训练后价值矩阵应当发生变化
    assert before != after


def test_policy_converges_and_reaches_goal():
    model = make_model()
    for _ in range(150):
        model.step()
    state = model.get_state()
    assert state["successRate"] >= 0.8
    assert state["path"][0] == [0, 0]
    assert state["path"][-1] == state["goal"]
    # 探索率应当随训练衰减
    assert state["epsilon"] < 0.3


def test_epsilon_decays_and_step_increments():
    model = make_model()
    result = model.step()
    assert result.step == 1
    assert result.epsilon < 0.3


def test_reset_clears_state():
    model = make_model()
    for _ in range(20):
        model.step()
    model.reset()
    state = model.get_state()
    assert state["step"] == 0
    # 重置后 Q 值全部归零
    flat = np.array(state["values"]).flatten()
    assert np.allclose(flat, 0.0)
