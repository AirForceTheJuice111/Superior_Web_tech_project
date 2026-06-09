from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Any

import numpy as np

# 动作编码：0=上 1=下 2=左 3=右
ACTION_DELTAS = [(-1, 0), (1, 0), (0, -1), (0, 1)]


@dataclass
class StepResult:
    episode_reward: float
    steps: int
    success: bool
    epsilon: float
    step: int


class StepwiseQLearning:
    """GridWorld 上的单步 Q-Learning：每次 step() 跑一个 episode 并更新 Q 表。"""

    def __init__(
        self,
        grid_size: int = 5,
        epsilon: float = 0.2,
        alpha: float = 0.1,
        gamma: float = 0.9,
        max_episode_steps: int = 100,
        random_state: int = 42,
    ) -> None:
        self.grid_size = max(3, min(int(grid_size), 8))
        self.epsilon = float(epsilon)
        self.initial_epsilon = float(epsilon)
        self.alpha = float(alpha)
        self.gamma = float(gamma)
        self.max_episode_steps = max(10, int(max_episode_steps))
        self.random_state = int(random_state)

        self.n_states = self.grid_size * self.grid_size
        self.n_actions = 4
        self.start = (0, 0)
        self.goal = (self.grid_size - 1, self.grid_size - 1)
        self._obstacles: set[tuple[int, int]] = set()
        self._q: np.ndarray | None = None
        self._rng = np.random.default_rng(self.random_state)
        self._step_count = 0
        self._episode_rewards: list[float] = []
        self._episode_steps: list[int] = []
        self._episode_success: list[bool] = []

    # —— 生命周期 ——
    def initialize(self, *_args: Any, **_kwargs: Any) -> None:
        self._obstacles = self._generate_obstacles()
        self.reset()

    def reset(self) -> None:
        self._q = np.zeros((self.n_states, self.n_actions), dtype=float)
        self._rng = np.random.default_rng(self.random_state)
        self.epsilon = self.initial_epsilon
        self._step_count = 0
        self._episode_rewards = []
        self._episode_steps = []
        self._episode_success = []

    def step(self) -> StepResult:
        if self._q is None:
            raise RuntimeError("请先调用 initialize()")

        state = self._to_index(self.start)
        total_reward = 0.0
        success = False
        steps = 0
        for steps in range(1, self.max_episode_steps + 1):
            action = self._choose_action(state)
            next_state, reward, done = self._transition(state, action)
            best_next = float(np.max(self._q[next_state]))
            self._q[state, action] += self.alpha * (reward + self.gamma * best_next - self._q[state, action])
            total_reward += reward
            state = next_state
            if done:
                success = True
                break

        self._step_count += 1
        self._episode_rewards.append(total_reward)
        self._episode_steps.append(steps)
        self._episode_success.append(success)
        self.epsilon = max(0.01, self.epsilon * 0.97)

        return StepResult(
            episode_reward=round(total_reward, 6),
            steps=steps,
            success=success,
            epsilon=round(self.epsilon, 6),
            step=self._step_count,
        )

    def get_state(self) -> dict[str, Any]:
        if self._q is None:
            raise RuntimeError("模型尚未初始化")

        size = self.grid_size
        values = [[0.0 for _ in range(size)] for _ in range(size)]
        policy = [[-1 for _ in range(size)] for _ in range(size)]
        for row in range(size):
            for col in range(size):
                cell = (row, col)
                index = self._to_index(cell)
                values[row][col] = round(float(np.max(self._q[index])), 6)
                if cell == self.goal or cell in self._obstacles:
                    policy[row][col] = -1
                else:
                    policy[row][col] = int(np.argmax(self._q[index]))

        return {
            "step": self._step_count,
            "gridSize": size,
            "start": list(self.start),
            "goal": list(self.goal),
            "obstacles": [list(item) for item in sorted(self._obstacles)],
            "values": values,
            "policy": policy,
            "qTable": np.round(self._q, 6).tolist(),
            "path": [list(cell) for cell in self._greedy_path()],
            "epsilon": round(self.epsilon, 6),
            "avgReward": self._recent_mean(self._episode_rewards),
            "successRate": self._recent_mean([1.0 if ok else 0.0 for ok in self._episode_success]),
            "stepsToGoal": self._recent_success_steps(),
        }

    # —— 内部工具 ——
    def _to_index(self, cell: tuple[int, int]) -> int:
        return cell[0] * self.grid_size + cell[1]

    def _choose_action(self, state: int) -> int:
        if self._rng.random() < self.epsilon:
            return int(self._rng.integers(self.n_actions))
        return int(np.argmax(self._q[state]))

    def _transition(self, state: int, action: int) -> tuple[int, float, bool]:
        row, col = divmod(state, self.grid_size)
        d_row, d_col = ACTION_DELTAS[action]
        next_row, next_col = row + d_row, col + d_col

        # 撞墙或撞障碍：原地不动并惩罚
        if not (0 <= next_row < self.grid_size and 0 <= next_col < self.grid_size):
            return state, -1.0, False
        if (next_row, next_col) in self._obstacles:
            return state, -1.0, False

        next_index = next_row * self.grid_size + next_col
        if (next_row, next_col) == self.goal:
            return next_index, 10.0, True
        return next_index, -0.04, False

    def _greedy_path(self) -> list[tuple[int, int]]:
        path: list[tuple[int, int]] = [self.start]
        state = self._to_index(self.start)
        visited = {state}
        for _ in range(self.max_episode_steps):
            cell = divmod(state, self.grid_size)
            if cell == self.goal:
                break
            action = int(np.argmax(self._q[state]))
            next_state, _, done = self._transition(state, action)
            if next_state == state or next_state in visited:
                break
            visited.add(next_state)
            path.append(divmod(next_state, self.grid_size))
            state = next_state
            if done:
                break
        return path

    def _generate_obstacles(self) -> set[tuple[int, int]]:
        rng = np.random.default_rng(self.random_state)
        count = self.grid_size  # 障碍数量与网格边长一致
        for _ in range(50):
            candidates: set[tuple[int, int]] = set()
            while len(candidates) < count:
                cell = (int(rng.integers(self.grid_size)), int(rng.integers(self.grid_size)))
                if cell not in (self.start, self.goal):
                    candidates.add(cell)
            if self._is_reachable(candidates):
                return candidates
        return set()  # 兜底：极端情况下不放障碍

    def _is_reachable(self, obstacles: set[tuple[int, int]]) -> bool:
        queue: deque[tuple[int, int]] = deque([self.start])
        seen = {self.start}
        while queue:
            row, col = queue.popleft()
            if (row, col) == self.goal:
                return True
            for d_row, d_col in ACTION_DELTAS:
                nxt = (row + d_row, col + d_col)
                if (
                    0 <= nxt[0] < self.grid_size
                    and 0 <= nxt[1] < self.grid_size
                    and nxt not in obstacles
                    and nxt not in seen
                ):
                    seen.add(nxt)
                    queue.append(nxt)
        return False

    def _recent_mean(self, values: list[float], window: int = 20) -> float:
        if not values:
            return 0.0
        recent = values[-window:]
        return round(float(np.mean(recent)), 6)

    def _recent_success_steps(self, window: int = 20) -> float:
        recent = list(zip(self._episode_steps[-window:], self._episode_success[-window:]))
        success_steps = [steps for steps, ok in recent if ok]
        if not success_steps:
            return 0.0
        return round(float(np.mean(success_steps)), 6)
