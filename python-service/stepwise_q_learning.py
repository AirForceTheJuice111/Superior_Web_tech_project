from __future__ import annotations

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
    coverage: float
    success: bool


class StepwiseQLearning:
    """表格型 Q-Learning：每次 step() 跑完一个完整 episode 并在线更新 Q 表。

    设计为面向训练过程可视化：保留 step()/get_state()/reset() 接口，
    每个 episode 结束后给出累计 reward、平均 TD 误差、Q 表覆盖率与当前贪婪策略。
    """

    def __init__(
        self,
        grid_size: int = 5,
        learning_rate: float = 0.1,
        discount_factor: float = 0.95,
        epsilon: float = 0.2,
        epsilon_decay: float = 0.99,
        min_epsilon: float = 0.01,
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
        self.max_episode_steps = max_episode_steps
        self.random_state = random_state

        self.env = GridWorld(size=grid_size, random_state=random_state)
        self._rng = np.random.default_rng(random_state)
        self._q: np.ndarray = np.zeros((self.env.n_states, self.env.n_actions), dtype=float)
        self._step_count = 0
        self._last_reward = 0.0
        self._last_loss = 0.0
        self._last_success = False

    def initialize(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._rng = np.random.default_rng(self.random_state)
        self._q = np.zeros((self.env.n_states, self.env.n_actions), dtype=float)
        self.epsilon = self.initial_epsilon
        self._step_count = 0
        self._last_reward = 0.0
        self._last_loss = 0.0
        self._last_success = False

    def _choose_action(self, state: int) -> int:
        if self._rng.random() < self.epsilon:
            return int(self._rng.integers(0, self.env.n_actions))
        row = self._q[state]
        best = np.flatnonzero(row == row.max())
        return int(self._rng.choice(best))

    def step(self) -> StepResult:
        """运行一个 episode，逐步用 Q-Learning 更新规则更新 Q 表。"""
        state = self.env.reset()
        total_reward = 0.0
        td_errors: list[float] = []
        success = False

        for _ in range(self.max_episode_steps):
            action = self._choose_action(state)
            outcome = self.env.step(action)

            best_next = float(np.max(self._q[outcome.next_state]))
            target = outcome.reward + (
                0.0 if outcome.done else self.discount_factor * best_next
            )
            td_error = target - self._q[state, action]
            self._q[state, action] += self.learning_rate * td_error
            td_errors.append(abs(td_error))

            total_reward += outcome.reward
            state = outcome.next_state
            if outcome.done:
                success = self.env.state_to_cell(state) == self.env.goal
                break

        self._step_count += 1
        self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)
        self._last_reward = total_reward
        self._last_loss = float(np.mean(td_errors)) if td_errors else 0.0
        self._last_success = success

        return StepResult(
            step=self._step_count,
            reward=round(total_reward, 6),
            loss=round(self._last_loss, 6),
            epsilon=round(self.epsilon, 6),
            coverage=round(self._coverage(), 6),
            success=success,
        )

    def _coverage(self) -> float:
        """已被更新过（非零）的状态-动作对比例，用于衡量 Q 表收敛进度。"""
        return float(np.count_nonzero(self._q)) / float(self._q.size)

    def greedy_policy(self) -> list[int]:
        return [int(np.argmax(self._q[state])) for state in range(self.env.n_states)]

    def state_values(self) -> list[float]:
        return [float(np.max(self._q[state])) for state in range(self.env.n_states)]

    def get_state(self) -> dict[str, Any]:
        policy = self.greedy_policy()
        values = self.state_values()
        return {
            "step": self._step_count,
            "reward": round(self._last_reward, 6),
            "loss": round(self._last_loss, 6),
            "epsilon": round(self.epsilon, 6),
            "coverage": round(self._coverage(), 6),
            "success": self._last_success,
            "qTable": self._q.round(6).tolist(),
            "policy": policy,
            "policyArrows": [ACTION_ARROWS[action] for action in policy],
            "policyNames": [ACTION_NAMES[action] for action in policy],
            "stateValues": [round(value, 6) for value in values],
            "grid": self.env.describe_layout(),
        }


if __name__ == "__main__":
    model = StepwiseQLearning(grid_size=5, learning_rate=0.2, epsilon=0.3)
    model.initialize()
    for _ in range(30):
        result = model.step()
    print("最终状态:", {k: v for k, v in model.get_state().items() if k != "qTable" and k != "grid"})
