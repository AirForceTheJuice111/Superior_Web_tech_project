from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Any

import numpy as np

from gridworld import ACTION_ARROWS, ACTION_NAMES, GridWorld


@dataclass
class StepResult:
    step: int
    reward: float
    loss: float
    epsilon: float
    success: bool


class TwoLayerQNetwork:
    """手写两层全连接网络（输入 -> 隐藏层 ReLU -> 输出 Q 值），不依赖深度学习框架。

    使用 numpy 实现前向传播与基于均方 TD 误差的反向传播，纯教学用途。
    """

    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int, rng: np.random.Generator) -> None:
        # He 初始化，缓解 ReLU 下的梯度消失。
        self.w1 = rng.normal(0.0, np.sqrt(2.0 / input_dim), size=(input_dim, hidden_dim))
        self.b1 = np.zeros(hidden_dim, dtype=float)
        self.w2 = rng.normal(0.0, np.sqrt(2.0 / hidden_dim), size=(hidden_dim, output_dim))
        self.b2 = np.zeros(output_dim, dtype=float)

    def forward(self, x: np.ndarray) -> tuple[np.ndarray, dict[str, np.ndarray]]:
        z1 = x @ self.w1 + self.b1
        a1 = np.maximum(0.0, z1)
        q = a1 @ self.w2 + self.b2
        cache = {"x": x, "z1": z1, "a1": a1}
        return q, cache

    def predict(self, x: np.ndarray) -> np.ndarray:
        q, _ = self.forward(x)
        return q

    def train_step(
        self,
        x: np.ndarray,
        target_q: np.ndarray,
        action_mask: np.ndarray,
        learning_rate: float,
    ) -> float:
        """仅对被采取的动作（action_mask）计算 MSE 损失并做一次梯度下降。"""
        q, cache = self.forward(x)
        batch_size = x.shape[0]

        diff = (q - target_q) * action_mask
        loss = float(np.sum(diff ** 2) / batch_size)

        grad_q = (2.0 / batch_size) * diff
        grad_w2 = cache["a1"].T @ grad_q
        grad_b2 = np.sum(grad_q, axis=0)

        grad_a1 = grad_q @ self.w2.T
        grad_z1 = grad_a1 * (cache["z1"] > 0.0)
        grad_w1 = cache["x"].T @ grad_z1
        grad_b1 = np.sum(grad_z1, axis=0)

        # 梯度裁剪，避免数值爆炸。
        for grad in (grad_w1, grad_b1, grad_w2, grad_b2):
            np.clip(grad, -5.0, 5.0, out=grad)

        self.w2 -= learning_rate * grad_w2
        self.b2 -= learning_rate * grad_b2
        self.w1 -= learning_rate * grad_w1
        self.b1 -= learning_rate * grad_b1
        return loss

    def copy_weights_from(self, other: "TwoLayerQNetwork") -> None:
        self.w1 = other.w1.copy()
        self.b1 = other.b1.copy()
        self.w2 = other.w2.copy()
        self.b2 = other.b2.copy()


class StepwiseDQN:
    """轻量教学版 DQN：用 numpy 两层网络逼近 Q 值，含经验回放与目标网络。

    每次 step() 跑完一个 episode，期间逐步收集经验并按 batch 训练在线网络，
    按设定频率把在线网络权重同步给目标网络。
    """

    def __init__(
        self,
        grid_size: int = 5,
        learning_rate: float = 0.01,
        discount_factor: float = 0.95,
        epsilon: float = 0.3,
        epsilon_decay: float = 0.97,
        min_epsilon: float = 0.05,
        batch_size: int = 16,
        target_update_freq: int = 5,
        hidden_dim: int = 24,
        replay_capacity: int = 2000,
        max_episode_steps: int = 100,
        random_state: int = 42,
    ) -> None:
        self.grid_size = grid_size
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.initial_epsilon = epsilon
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.min_epsilon = min_epsilon
        self.batch_size = batch_size
        self.target_update_freq = max(1, target_update_freq)
        self.hidden_dim = hidden_dim
        self.replay_capacity = replay_capacity
        self.max_episode_steps = max_episode_steps
        self.random_state = random_state

        self.env = GridWorld(size=grid_size, random_state=random_state)
        self.input_dim = 2
        self.output_dim = self.env.n_actions

        self._rng = np.random.default_rng(random_state)
        self._online: TwoLayerQNetwork | None = None
        self._target: TwoLayerQNetwork | None = None
        self._replay: deque[tuple[np.ndarray, int, float, np.ndarray, bool]] = deque(maxlen=replay_capacity)
        self._step_count = 0
        self._last_reward = 0.0
        self._last_loss = 0.0
        self._last_success = False

    def initialize(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._rng = np.random.default_rng(self.random_state)
        self._online = TwoLayerQNetwork(self.input_dim, self.hidden_dim, self.output_dim, self._rng)
        self._target = TwoLayerQNetwork(self.input_dim, self.hidden_dim, self.output_dim, self._rng)
        self._target.copy_weights_from(self._online)
        self._replay.clear()
        self.epsilon = self.initial_epsilon
        self._step_count = 0
        self._last_reward = 0.0
        self._last_loss = 0.0
        self._last_success = False

    def _choose_action(self, features: np.ndarray) -> int:
        if self._online is None:
            raise RuntimeError("请先调用 initialize()")
        if self._rng.random() < self.epsilon:
            return int(self._rng.integers(0, self.output_dim))
        q = self._online.predict(features.reshape(1, -1))[0]
        best = np.flatnonzero(q == q.max())
        return int(self._rng.choice(best))

    def _train_on_batch(self) -> float:
        if self._online is None or self._target is None:
            raise RuntimeError("请先调用 initialize()")
        if len(self._replay) < self.batch_size:
            return self._last_loss

        indices = self._rng.choice(len(self._replay), size=self.batch_size, replace=False)
        batch = [self._replay[i] for i in indices]

        states = np.stack([item[0] for item in batch])
        actions = np.array([item[1] for item in batch], dtype=int)
        rewards = np.array([item[2] for item in batch], dtype=float)
        next_states = np.stack([item[3] for item in batch])
        dones = np.array([item[4] for item in batch], dtype=bool)

        current_q = self._online.predict(states)
        next_q = self._target.predict(next_states)
        max_next_q = np.max(next_q, axis=1)
        targets = rewards + np.where(dones, 0.0, self.discount_factor * max_next_q)

        target_q = current_q.copy()
        mask = np.zeros_like(current_q)
        for row in range(self.batch_size):
            target_q[row, actions[row]] = targets[row]
            mask[row, actions[row]] = 1.0

        return self._online.train_step(states, target_q, mask, self.learning_rate)

    def step(self) -> StepResult:
        if self._online is None or self._target is None:
            raise RuntimeError("请先调用 initialize()")

        state = self.env.reset()
        features = self.env.state_features(state)
        total_reward = 0.0
        losses: list[float] = []
        success = False

        for _ in range(self.max_episode_steps):
            action = self._choose_action(features)
            outcome = self.env.step(action)
            next_features = self.env.state_features(outcome.next_state)

            self._replay.append((features, action, outcome.reward, next_features, outcome.done))
            losses.append(self._train_on_batch())

            total_reward += outcome.reward
            features = next_features
            if outcome.done:
                success = self.env.state_to_cell(outcome.next_state) == self.env.goal
                break

        self._step_count += 1
        self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)
        if self._step_count % self.target_update_freq == 0:
            self._target.copy_weights_from(self._online)

        self._last_reward = total_reward
        self._last_loss = float(np.mean(losses)) if losses else 0.0
        self._last_success = success

        return StepResult(
            step=self._step_count,
            reward=round(total_reward, 6),
            loss=round(self._last_loss, 6),
            epsilon=round(self.epsilon, 6),
            success=success,
        )

    def _q_table(self) -> np.ndarray:
        if self._online is None:
            raise RuntimeError("请先调用 initialize()")
        features = np.stack([self.env.state_features(s) for s in range(self.env.n_states)])
        return self._online.predict(features)

    def greedy_policy(self) -> list[int]:
        q = self._q_table()
        return [int(np.argmax(q[state])) for state in range(self.env.n_states)]

    def get_state(self) -> dict[str, Any]:
        q = self._q_table()
        policy = [int(np.argmax(q[state])) for state in range(self.env.n_states)]
        values = [float(np.max(q[state])) for state in range(self.env.n_states)]
        return {
            "step": self._step_count,
            "reward": round(self._last_reward, 6),
            "loss": round(self._last_loss, 6),
            "epsilon": round(self.epsilon, 6),
            "success": self._last_success,
            "replaySize": len(self._replay),
            "qTable": q.round(6).tolist(),
            "policy": policy,
            "policyArrows": [ACTION_ARROWS[action] for action in policy],
            "policyNames": [ACTION_NAMES[action] for action in policy],
            "stateValues": [round(value, 6) for value in values],
            "grid": self.env.describe_layout(),
        }


if __name__ == "__main__":
    model = StepwiseDQN(grid_size=5, learning_rate=0.02, epsilon=0.4)
    model.initialize()
    for _ in range(40):
        result = model.step()
    state = model.get_state()
    print("最终状态:", {k: v for k, v in state.items() if k not in ("qTable", "grid")})
