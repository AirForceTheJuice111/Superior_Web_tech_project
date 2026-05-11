import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';

import { TrainingViewMode, VisualizationData } from './models';

@Component({
  selector: 'app-two-dimensional-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h3>{{ title }}</h3>
          <p>{{ subtitle }}</p>
        </div>
        <span class="badge">{{ modeLabel }}</span>
      </div>
      <div #chartContainer class="chart-container"></div>
    </section>
  `,
  styles: [`
    .card { background: #fff; border-radius: 18px; padding: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    h3 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0; color: #64748b; }
    .badge { padding: 6px 12px; border-radius: 999px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 600; }
    .chart-container { width: 100%; height: 380px; }
  `]
})
export class TwoDimensionalVisualizerComponent implements AfterViewInit, OnChanges {
  @Input() title = '训练过程二维可视化';
  @Input() subtitle = '根据算法类型展示散点、边界线和聚类中心';
  @Input() mode: TrainingViewMode = 'regression';
  @Input() chartData: VisualizationData = { points: [], boundary: [], centers: [] };
  @ViewChild('chartContainer') chartContainer!: ElementRef<HTMLDivElement>;

  private chartInstance: echarts.ECharts | null = null;

  get modeLabel(): string {
    return {
      classification: '分类',
      regression: '回归',
      clustering: '聚类'
    }[this.mode];
  }

  ngAfterViewInit(): void {
    this.chartInstance = echarts.init(this.chartContainer.nativeElement);
    this.renderChart();
    window.addEventListener('resize', this.handleResize);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['chartData'] || changes['mode']) && this.chartInstance) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    if (!this.chartInstance) {
      return;
    }

    const groupedPoints = new Map<string, Array<[number, number]>>();
    for (const point of this.chartData.points) {
      const key = point.label ?? '样本';
      if (!groupedPoints.has(key)) {
        groupedPoints.set(key, []);
      }
      groupedPoints.get(key)?.push([point.x, point.y]);
    }

    const series: echarts.SeriesOption[] = Array.from(groupedPoints.entries()).map(([label, points]) => ({
      name: label,
      type: 'scatter',
      symbolSize: 10,
      data: points
    }));

    for (const boundary of this.chartData.boundary) {
      series.push({
        name: this.mode === 'classification' ? '决策边界' : '回归线',
        type: 'line',
        smooth: this.mode === 'regression',
        showSymbol: false,
        lineStyle: {
          width: 3,
          type: this.mode === 'classification' ? 'dashed' : 'solid'
        },
        data: boundary.map((point) => [point.x, point.y])
      });
    }

    if (this.chartData.centers.length > 0) {
      series.push({
        name: '聚类中心',
        type: 'scatter',
        symbol: 'diamond',
        symbolSize: 18,
        itemStyle: {
          color: '#f97316'
        },
        data: this.chartData.centers.map((point) => [point.x, point.y])
      });
    }

    this.chartInstance.setOption({
      tooltip: { trigger: 'item' },
      legend: { top: 0 },
      grid: { left: 48, right: 24, top: 48, bottom: 32 },
      xAxis: { type: 'value', name: 'X' },
      yAxis: { type: 'value', name: 'Y' },
      series
    }, true);
  }

  private readonly handleResize = (): void => {
    this.chartInstance?.resize();
  };
}
