import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';

import { GridCellType, RlParameters } from '../../core/models/platform.models';

// 不同格子类型的底色，价值热力图覆盖在自由格上，特殊格用纯色高亮。
const CELL_COLORS: Record<GridCellType, string> = {
  free: 'transparent',
  start: '#2563eb',
  goal: '#10b981',
  trap: '#ef4444',
  obstacle: '#475569'
};

@Component({
  selector: 'app-reinforcement-grid-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h3>{{ title }}</h3>
          <p>{{ subtitle }}</p>
        </div>
        <span class="badge">ε = {{ epsilonLabel }}</span>
      </div>
      <div class="chart-shell">
        <div #chartContainer class="chart-container"></div>
      </div>
    </section>
  `,
  styles: [`
    .card { background: rgba(255,255,255,0.94); border-radius: 24px; padding: 24px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08); border: 1px solid rgba(255,255,255,0.8); margin-bottom: 20px; }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    h3 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0; color: #64748b; line-height: 1.7; }
    .badge { padding: 8px 14px; border-radius: 999px; background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #2563eb; font-size: 12px; font-weight: 800; }
    .chart-shell { border-radius: 20px; padding: 14px; background: linear-gradient(180deg, #f8fbff, #ffffff); border: 1px solid #e2e8f0; }
    .chart-container { width: 100%; height: 460px; }
  `]
})
export class ReinforcementGridVisualizerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = '强化学习网格世界';
  @Input() subtitle = '状态价值热力图 + 贪婪策略箭头，起点蓝、终点绿、陷阱红、障碍灰';
  @Input() data: RlParameters | null = null;
  @ViewChild('chartContainer') chartContainer!: ElementRef<HTMLDivElement>;

  private chartInstance: echarts.ECharts | null = null;

  get epsilonLabel(): string {
    return this.data ? this.data.epsilon.toFixed(3) : '-';
  }

  ngAfterViewInit(): void {
    this.chartInstance = echarts.init(this.chartContainer.nativeElement);
    this.renderChart();
    window.addEventListener('resize', this.handleResize);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chartInstance) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.chartInstance?.dispose();
  }

  private renderChart(): void {
    if (!this.chartInstance || !this.data) {
      return;
    }

    const { grid, policy, policyArrows, stateValues } = this.data;
    const size = grid.size;
    // ECharts 笛卡尔坐标系 y 轴向上，网格行号向下，故用 (size-1-row) 翻转，使第 0 行显示在顶部。
    const flip = (row: number): number => size - 1 - row;

    const heatData = grid.cells
      .filter((cell) => cell.type === 'free' || cell.type === 'start' || cell.type === 'goal')
      .map((cell) => [cell.col, flip(cell.row), Number(stateValues[cell.state] ?? 0)]);

    const blockData = grid.cells
      .filter((cell) => cell.type === 'obstacle' || cell.type === 'trap')
      .map((cell) => ({ value: [cell.col, flip(cell.row)], itemStyle: { color: CELL_COLORS[cell.type] } }));

    const markers = grid.cells
      .filter((cell) => cell.type === 'start' || cell.type === 'goal')
      .map((cell) => ({
        value: [cell.col, flip(cell.row)],
        label: { show: true, formatter: cell.type === 'goal' ? '终点' : '起点', color: '#fff', fontWeight: 'bold' },
        itemStyle: { color: CELL_COLORS[cell.type] }
      }));

    // 仅在非终止、非障碍格画策略箭头：这些格才真正参与决策。
    const arrows = grid.cells
      .filter((cell) => !cell.terminal && cell.type !== 'obstacle')
      .map((cell) => ({
        value: [cell.col, flip(cell.row)],
        label: { show: true, formatter: policyArrows[cell.state] ?? '', fontSize: 22, color: '#0f172a' },
        itemStyle: { color: 'transparent' },
        tooltip: { formatter: () => `状态 ${cell.state} 策略动作：${policy[cell.state]}` }
      }));

    const values = heatData.map((item) => item[2] as number);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;

    this.chartInstance.setOption({
      tooltip: { trigger: 'item' },
      grid: { left: 40, right: 24, top: 24, bottom: 40 },
      xAxis: { type: 'category', data: Array.from({ length: size }, (_, i) => `${i}`), name: '列', splitArea: { show: true } },
      yAxis: { type: 'category', data: Array.from({ length: size }, (_, i) => `${flip(i)}`), name: '行', splitArea: { show: true } },
      visualMap: {
        min,
        max: max > min ? max : min + 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#f1f5f9', '#bae6fd', '#3b82f6', '#1e3a8a'] }
      },
      series: [
        { name: '状态价值', type: 'heatmap', data: heatData, label: { show: false } },
        { name: '障碍/陷阱', type: 'scatter', symbol: 'rect', symbolSize: 38, data: blockData },
        { name: '起点/终点', type: 'scatter', symbol: 'rect', symbolSize: 38, data: markers },
        { name: '策略', type: 'scatter', symbol: 'circle', symbolSize: 1, data: arrows }
      ]
    }, true);
  }

  private readonly handleResize = (): void => {
    this.chartInstance?.resize();
  };
}
