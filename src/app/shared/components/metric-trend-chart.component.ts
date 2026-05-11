import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';

@Component({
  selector: 'app-metric-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h3>{{ title }}</h3>
          <p>{{ subtitle }}</p>
        </div>
        <span class="badge">{{ dataPoints.length }} 个点</span>
      </div>
      <div class="chart-shell">
        <div #chartContainer class="chart-container"></div>
      </div>
    </section>
  `,
  styles: [`
    .card { background: rgba(255,255,255,0.94); border-radius: 24px; padding: 22px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08); border: 1px solid rgba(255,255,255,0.8); }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    h3 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0; color: #64748b; line-height: 1.7; }
    .badge { padding: 8px 14px; border-radius: 999px; background: linear-gradient(135deg, #f8fafc, #eef2ff); color: #475569; font-size: 12px; font-weight: 800; }
    .chart-shell {
      border-radius: 20px;
      padding: 12px;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
      border: 1px solid #e2e8f0;
    }
    .chart-container { width: 100%; height: 280px; }
  `]
})
export class MetricTrendChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = '指标曲线';
  @Input() subtitle = '训练过程中动态刷新';
  @Input() seriesName = 'Metric';
  @Input() color = '#2563eb';
  @Input() dataPoints: Array<{ step: number; value: number }> = [];
  @ViewChild('chartContainer') chartContainer!: ElementRef<HTMLDivElement>;

  private chartInstance: echarts.ECharts | null = null;

  ngAfterViewInit(): void {
    this.chartInstance = echarts.init(this.chartContainer.nativeElement);
    this.renderChart();
    window.addEventListener('resize', this.handleResize);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataPoints'] && this.chartInstance) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.chartInstance?.dispose();
  }

  private renderChart(): void {
    if (!this.chartInstance) {
      return;
    }

    this.chartInstance.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        name: 'Step',
        data: this.dataPoints.map((item) => item.step)
      },
      yAxis: {
        type: 'value',
        name: this.seriesName
      },
      series: [
        {
          name: this.seriesName,
          type: 'line',
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: this.color },
          itemStyle: { color: this.color },
          areaStyle: { color: this.color, opacity: 0.12 },
          data: this.dataPoints.map((item) => item.value)
        }
      ]
    }, true);
  }

  private readonly handleResize = (): void => {
    this.chartInstance?.resize();
  };
}
