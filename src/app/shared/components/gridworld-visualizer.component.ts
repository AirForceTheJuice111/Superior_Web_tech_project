import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

interface GridCell {
  row: number;
  col: number;
  value: number;
  arrow: string;
  isStart: boolean;
  isGoal: boolean;
  isObstacle: boolean;
  isPath: boolean;
  background: string;
}

const ARROWS = ['↑', '↓', '←', '→'];

@Component({
  selector: 'app-gridworld-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h3>{{ title }}</h3>
          <p>{{ subtitle }}</p>
        </div>
        <span class="badge">强化学习</span>
      </div>

      <div class="grid-shell" *ngIf="gridSize > 0; else empty">
        <div class="grid" [style.gridTemplateColumns]="'repeat(' + gridSize + ', 1fr)'">
          <div
            *ngFor="let cell of cells"
            class="cell"
            [class.path]="cell.isPath"
            [style.background]="cell.background"
          >
            <span class="tag start" *ngIf="cell.isStart">起点</span>
            <span class="tag goal" *ngIf="cell.isGoal">终点</span>
            <span class="obstacle" *ngIf="cell.isObstacle">▩</span>
            <span class="arrow" *ngIf="!cell.isObstacle && !cell.isGoal && cell.arrow">{{ cell.arrow }}</span>
            <span class="value" *ngIf="!cell.isObstacle">{{ cell.value | number: '1.1-1' }}</span>
          </div>
        </div>
        <div class="legend">
          <span><i class="dot low"></i> 低价值</span>
          <span><i class="dot high"></i> 高价值</span>
          <span><i class="dot route"></i> 智能体路径</span>
          <span>箭头 = 当前最优动作</span>
        </div>
      </div>
      <ng-template #empty>
        <p class="hint">初始化并单步训练后，这里会显示价值热力图、策略箭头与智能体路径。</p>
      </ng-template>
    </section>
  `,
  styles: [`
    .card { background: rgba(255,255,255,0.94); border-radius: 24px; padding: 24px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08); border: 1px solid rgba(255,255,255,0.8); }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    h3 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0; color: #64748b; line-height: 1.7; }
    .badge { padding: 8px 14px; border-radius: 999px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); color: #16a34a; font-size: 12px; font-weight: 800; }
    .grid-shell { border-radius: 20px; padding: 16px; background: linear-gradient(180deg, #f8fbff, #ffffff); border: 1px solid #e2e8f0; }
    .grid { display: grid; gap: 6px; max-width: 460px; margin: 0 auto; }
    .cell {
      position: relative; aspect-ratio: 1 / 1; border-radius: 10px; border: 1px solid #e2e8f0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-size: 12px; color: #0f172a;
    }
    .cell.path { outline: 3px solid #2563eb; outline-offset: -3px; }
    .arrow { font-size: 20px; font-weight: 800; line-height: 1; }
    .value { font-size: 10px; color: #475569; margin-top: 2px; }
    .obstacle { font-size: 20px; color: #475569; }
    .tag { font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 6px; }
    .tag.start { background: #dbeafe; color: #2563eb; }
    .tag.goal { background: #fef9c3; color: #b45309; }
    .legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; color: #64748b; font-size: 12px; align-items: center; justify-content: center; }
    .legend i.dot { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-right: 4px; vertical-align: middle; }
    .dot.low { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .dot.high { background: #16a34a; }
    .dot.route { background: #2563eb; }
    .hint { color: #94a3b8; }
  `]
})
export class GridWorldVisualizerComponent {
  @Input() title = 'GridWorld 网格世界';
  @Input() subtitle = '价值热力图 + 策略箭头 + 智能体路径';

  private _parameters: Record<string, unknown> = {};

  @Input() set parameters(value: Record<string, unknown> | null | undefined) {
    this._parameters = value ?? {};
    this.cells = this.buildCells();
  }

  gridSize = 0;
  cells: GridCell[] = [];

  private buildCells(): GridCell[] {
    const params = this._parameters;
    const size = this.toNumber(params['gridSize']);
    this.gridSize = size;
    if (size <= 0) {
      return [];
    }

    const values = this.toMatrix(params['values'], size);
    const policy = this.toMatrix(params['policy'], size);
    const start = this.toPair(params['start']);
    const goal = this.toPair(params['goal']);
    const obstacles = this.toPairs(params['obstacles']);
    const path = this.toPairs(params['path']);
    const obstacleSet = new Set(obstacles.map(([r, c]) => `${r},${c}`));
    const pathSet = new Set(path.map(([r, c]) => `${r},${c}`));

    const flat = values.flat();
    const min = Math.min(...flat, 0);
    const max = Math.max(...flat, 0);

    const cells: GridCell[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const key = `${row},${col}`;
        const isObstacle = obstacleSet.has(key);
        const isGoal = goal[0] === row && goal[1] === col;
        const isStart = start[0] === row && start[1] === col;
        const action = policy[row]?.[col] ?? -1;
        cells.push({
          row,
          col,
          value: values[row]?.[col] ?? 0,
          arrow: action >= 0 && action < ARROWS.length ? ARROWS[action] : '',
          isStart,
          isGoal,
          isObstacle,
          isPath: pathSet.has(key) && !isStart && !isGoal,
          background: this.cellColor(values[row]?.[col] ?? 0, min, max, isObstacle, isGoal)
        });
      }
    }
    return cells;
  }

  private cellColor(value: number, min: number, max: number, isObstacle: boolean, isGoal: boolean): string {
    if (isObstacle) {
      return '#cbd5e1';
    }
    if (isGoal) {
      return '#fde68a';
    }
    const ratio = max > min ? (value - min) / (max - min) : 0;
    // 从浅绿到深绿
    const light = Math.round(245 - ratio * 145);
    return `rgb(${light}, ${Math.round(250 - ratio * 80)}, ${light})`;
  }

  private toNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private toPair(value: unknown): [number, number] {
    if (Array.isArray(value) && value.length >= 2) {
      return [Number(value[0]), Number(value[1])];
    }
    return [-1, -1];
  }

  private toPairs(value: unknown): Array<[number, number]> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((item) => Array.isArray(item) && item.length >= 2)
      .map((item) => [Number((item as unknown[])[0]), Number((item as unknown[])[1])] as [number, number]);
  }

  private toMatrix(value: unknown, size: number): number[][] {
    if (!Array.isArray(value)) {
      return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
    }
    return (value as unknown[]).map((row) =>
      Array.isArray(row) ? (row as unknown[]).map((cell) => Number(cell) || 0) : []
    );
  }
}
