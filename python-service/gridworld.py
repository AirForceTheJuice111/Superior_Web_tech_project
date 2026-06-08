from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

# 动作编码：0=上, 1=右, 2=下, 3=左
ACTION_DELTAS: list[tuple[int, int]] = [(-1, 0), (0, 1), (1, 0), (0, -1)]
ACTION_NAMES: list[str] = ["up", "right", "down", "left"]
ACTION_ARROWS: list[str] = ["↑", "→", "↓", "←"]

CELL_FREE = "free"
CELL_OBSTACLE = "obstacle"
CELL_TRAP = "trap"
CELL_GOAL = "goal"
CELL_START = "start"


@dataclass
class StepOutcome:
    next_state: int
    reward: float
    done: bool


class GridWorld:
    """一个确定性离散网格世界环境，用于表格型与近似型强化学习教学演示。

    布局规则（根据网格尺寸确定性生成，保证每次实验可复现）：
    - 起点固定在左上角 (0, 0)
    - 终点固定在右下角 (size-1, size-1)，到达获得正奖励且回合结束
    - 障碍格不可进入（撞墙则停留原地）
    - 陷阱格为负奖励终止状态
    - 其余每步给一个小的负奖励，鼓励智能体尽快到达终点
    """

    def __init__(self, size: int = 5, random_state: int = 42) -> None:
        if size < 3:
            raise ValueError("网格尺寸至少为 3")
        self.size = size
        self.random_state = random_state
        self.n_states = size * size
        self.n_actions = len(ACTION_DELTAS)

        self.step_reward = -0.1
        self.goal_reward = 10.0
        self.trap_reward = -10.0

        self.start = (0, 0)
        self.goal = (size - 1, size - 1)
        self.obstacles, self.traps = self._build_layout()

        self._agent: tuple[int, int] = self.start

    def _build_layout(self) -> tuple[set[tuple[int, int]], set[tuple[int, int]]]:
        """确定性地放置障碍与陷阱，并避开起点/终点。"""
        rng = np.random.default_rng(self.random_state)
        size = self.size
        forbidden = {self.start, self.goal}

        obstacle_count = max(1, (size * size) // 6)
        trap_count = max(1, (size * size) // 10)

        candidates = [
            (r, c)
            for r in range(size)
            for c in range(size)
            if (r, c) not in forbidden
        ]
        rng.shuffle(candidates)

        obstacles: set[tuple[int, int]] = set()
        traps: set[tuple[int, int]] = set()
        for cell in candidates:
            if len(obstacles) < obstacle_count:
                obstacles.add(cell)
            elif len(traps) < trap_count:
                traps.add(cell)
            else:
                break

        # 保证起点周围至少有一条出路，避免环境一开局就无解。
        sr, sc = self.start
        for dr, dc in ACTION_DELTAS:
            neighbor = (sr + dr, sc + dc)
            if self._in_bounds(neighbor):
                obstacles.discard(neighbor)
                traps.discard(neighbor)
                break
        return obstacles, traps

    def _in_bounds(self, cell: tuple[int, int]) -> bool:
        r, c = cell
        return 0 <= r < self.size and 0 <= c < self.size

    def state_to_cell(self, state: int) -> tuple[int, int]:
        return divmod(state, self.size)

    def cell_to_state(self, cell: tuple[int, int]) -> int:
        r, c = cell
        return r * self.size + c

    def cell_type(self, cell: tuple[int, int]) -> str:
        if cell == self.start:
            return CELL_START
        if cell == self.goal:
            return CELL_GOAL
        if cell in self.traps:
            return CELL_TRAP
        if cell in self.obstacles:
            return CELL_OBSTACLE
        return CELL_FREE

    def is_terminal_cell(self, cell: tuple[int, int]) -> bool:
        return cell == self.goal or cell in self.traps

    def reset(self) -> int:
        self._agent = self.start
        return self.cell_to_state(self._agent)

    def step(self, action: int) -> StepOutcome:
        if not 0 <= action < self.n_actions:
            raise ValueError(f"非法动作: {action}")

        r, c = self._agent
        dr, dc = ACTION_DELTAS[action]
        target = (r + dr, c + dc)

        # 越界或撞到障碍则停留原地。
        if not self._in_bounds(target) or target in self.obstacles:
            target = (r, c)

        self._agent = target
        if target == self.goal:
            return StepOutcome(self.cell_to_state(target), self.goal_reward, True)
        if target in self.traps:
            return StepOutcome(self.cell_to_state(target), self.trap_reward, True)
        return StepOutcome(self.cell_to_state(target), self.step_reward, False)

    def state_features(self, state: int) -> np.ndarray:
        """把状态编码成归一化的二维坐标特征，供函数逼近型算法（DQN）使用。"""
        r, c = self.state_to_cell(state)
        denom = max(1, self.size - 1)
        return np.array([r / denom, c / denom], dtype=float)

    def describe_layout(self) -> dict[str, Any]:
        """返回前端绘制网格所需的结构化布局信息。"""
        cells: list[dict[str, Any]] = []
        for state in range(self.n_states):
            r, c = self.state_to_cell(state)
            cells.append(
                {
                    "state": state,
                    "row": int(r),
                    "col": int(c),
                    "type": self.cell_type((r, c)),
                    "terminal": self.is_terminal_cell((r, c)),
                }
            )
        return {
            "size": self.size,
            "start": {"row": self.start[0], "col": self.start[1]},
            "goal": {"row": self.goal[0], "col": self.goal[1]},
            "obstacles": [{"row": r, "col": c} for r, c in sorted(self.obstacles)],
            "traps": [{"row": r, "col": c} for r, c in sorted(self.traps)],
            "cells": cells,
        }
