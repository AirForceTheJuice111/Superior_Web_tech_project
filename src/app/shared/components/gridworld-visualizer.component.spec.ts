import { GridWorldVisualizerComponent } from './gridworld-visualizer.component';

describe('GridWorldVisualizerComponent', () => {
  it('builds N*N cells with start/goal/obstacle/path flags', () => {
    const component = new GridWorldVisualizerComponent();
    component.parameters = {
      gridSize: 3,
      start: [0, 0],
      goal: [2, 2],
      obstacles: [[1, 1]],
      values: [[0, 1, 2], [1, 2, 3], [2, 3, 4]],
      policy: [[3, 3, 1], [3, -1, 1], [3, 3, -1]],
      path: [[0, 0], [0, 1], [1, 0]]
    };

    expect(component.gridSize).toBe(3);
    expect(component.cells.length).toBe(9);

    const start = component.cells.find((cell) => cell.isStart);
    const goal = component.cells.find((cell) => cell.isGoal);
    const obstacle = component.cells.find((cell) => cell.isObstacle);

    expect(start?.row).toBe(0);
    expect(goal?.row).toBe(2);
    expect(obstacle?.row).toBe(1);
    expect(obstacle?.col).toBe(1);
  });

  it('renders policy direction arrows for non-terminal cells', () => {
    const component = new GridWorldVisualizerComponent();
    component.parameters = {
      gridSize: 2,
      start: [0, 0],
      goal: [1, 1],
      obstacles: [],
      values: [[0, 0], [0, 0]],
      policy: [[3, 1], [1, -1]],
      path: []
    };
    const first = component.cells[0];
    expect(first.arrow).toBe('→');
  });

  it('returns empty cells for missing parameters', () => {
    const component = new GridWorldVisualizerComponent();
    component.parameters = {};
    expect(component.gridSize).toBe(0);
    expect(component.cells.length).toBe(0);
  });
});
