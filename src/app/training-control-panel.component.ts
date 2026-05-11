import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ExperimentConfig, TrainingStatusResponse, TrainingViewMode, VisualizationData } from './models';
import { TrainingApiService } from './training-api.service';
import { MetricTrendChartComponent } from './metric-trend-chart.component';
import { TwoDimensionalVisualizerComponent } from './two-dimensional-visualizer.component';

@Component({
  selector: 'app-training-control-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TwoDimensionalVisualizerComponent, MetricTrendChartComponent],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h2>训练控制模块</h2>
          <p>通过 setInterval 按步调用后端 API，实时更新图表、loss 曲线和 accuracy。</p>
        </div>
        <span class="badge" [class.running]="trainingState.status === 'running'">{{ trainingState.status }}</span>
      </div>

      <div class="grid">
        <label class="field">
          <span>最大步数</span>
          <input type="number" [(ngModel)]="maxSteps" min="1" max="500" />
        </label>

        <label class="field">
          <span>运行间隔 (ms)</span>
          <input type="number" [(ngModel)]="intervalMs" min="200" max="5000" step="100" />
        </label>
      </div>

      <div class="actions">
        <button class="primary" (click)="handleInit()" [disabled]="loading.init">初始化</button>
        <button (click)="handleStep()" [disabled]="!sessionId || loading.step || isRunning">单步执行</button>
        <button class="success" (click)="startAutoRun()" [disabled]="!sessionId || isRunning">自动训练</button>
        <button class="warning" (click)="pause()" [disabled]="!sessionId || !isRunning">暂停</button>
        <button (click)="refreshStatus()" [disabled]="!sessionId || loading.status">刷新状态</button>
      </div>

      <div class="summary">
        <div>
          <strong>Session</strong>
          <span>{{ sessionId || '未初始化' }}</span>
        </div>
        <div>
          <strong>当前步数</strong>
          <span>{{ trainingState.currentStep }}</span>
        </div>
        <div>
          <strong>Loss</strong>
          <span>{{ formatMetric(trainingState.loss) }}</span>
        </div>
        <div>
          <strong>Accuracy</strong>
          <span>{{ formatMetric(safeAccuracy) }}</span>
        </div>
      </div>
    </section>

    <app-two-dimensional-visualizer
      [mode]="viewMode"
      [chartData]="trainingState.visualization"
    ></app-two-dimensional-visualizer>

    <div class="metrics-grid">
      <app-metric-trend-chart
        title="Loss 曲线"
        subtitle="每次 step 后追加一个 loss 点"
        seriesName="Loss"
        color="#ef4444"
        [dataPoints]="lossHistory"
      ></app-metric-trend-chart>
      <app-metric-trend-chart
        title="Accuracy 曲线"
        subtitle="分类显示 accuracy，其他算法显示质量分数"
        seriesName="Accuracy"
        color="#10b981"
        [dataPoints]="accuracyHistory"
      ></app-metric-trend-chart>
    </div>

    <section class="card json-card">
      <div class="card-header">
        <h3>训练状态 JSON</h3>
      </div>
      <pre>{{ trainingState | json }}</pre>
    </section>
  `,
  styles: [`
    .card { background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); margin-bottom: 20px; }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    h2 { margin: 0 0 8px; font-size: 24px; }
    h3 { margin: 0; }
    p { margin: 0; color: #64748b; }
    .badge { padding: 6px 12px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .badge.running { background: #dcfce7; color: #15803d; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
    .field { display: flex; flex-direction: column; gap: 8px; font-weight: 600; color: #334155; }
    .field input { border: 1px solid #dbe2ea; border-radius: 12px; padding: 10px 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
    button { border: 1px solid #cbd5f5; background: #fff; color: #1f2937; padding: 10px 16px; border-radius: 12px; cursor: pointer; font-weight: 600; }
    button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    button.success { background: #10b981; color: #fff; border-color: #10b981; }
    button.warning { background: #f59e0b; color: #fff; border-color: #f59e0b; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 16px; padding: 12px; border-radius: 14px; background: #f8fafc; }
    .summary strong { display: block; font-size: 12px; color: #64748b; }
    .summary span { font-size: 15px; font-weight: 600; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .json-card pre { margin: 0; background: #111827; color: #e2e8f0; padding: 16px; border-radius: 12px; overflow: auto; font-size: 12px; }
  `]
})
export class TrainingControlPanelComponent implements OnDestroy {
  @Input() config: ExperimentConfig | null = null;

  sessionId = '';
  maxSteps = 50;
  intervalMs = 800;
  isRunning = false;
  loading = {
    init: false,
    step: false,
    status: false
  };

  trainingState: TrainingStatusResponse = {
    sessionId: '',
    algorithm: '',
    status: 'idle',
    currentStep: 0,
    maxSteps: 0,
    progress: 0,
    loss: null,
    metrics: {},
    parameters: {},
    predictions: [],
    visualization: { points: [], boundary: [], centers: [] },
    updatedAt: null
  };

  lossHistory: Array<{ step: number; value: number }> = [];
  accuracyHistory: Array<{ step: number; value: number }> = [];

  private timerId: ReturnType<typeof setInterval> | null = null;
  private subscriptions = new Subscription();

  constructor(private readonly trainingApi: TrainingApiService) {}

  get viewMode(): TrainingViewMode {
    if (this.config?.algorithm === 'kmeans') {
      return 'clustering';
    }
    if (this.config?.algorithm === 'svm') {
      return 'classification';
    }
    return 'regression';
  }

  get safeAccuracy(): number | null {
    const accuracy = this.trainingState.metrics?.['accuracy'];
    if (typeof accuracy === 'number') {
      return accuracy;
    }
    return null;
  }

  handleInit(): void {
    if (!this.config) {
      return;
    }

    this.clearTimer();
    this.loading.init = true;
    this.lossHistory = [];
    this.accuracyHistory = [];

    const payload = this.buildInitPayload();
    const sub = this.trainingApi.initTraining(payload).subscribe({
      next: (data) => {
        this.sessionId = data.sessionId;
        this.trainingState.sessionId = data.sessionId;
        this.trainingState.status = data.status;
        this.trainingState.currentStep = data.currentStep;
        this.trainingState.maxSteps = data.maxSteps;
        this.refreshStatus();
      },
      error: () => {
        this.loading.init = false;
      },
      complete: () => {
        this.loading.init = false;
      }
    });
    this.subscriptions.add(sub);
  }

  handleStep(): void {
    if (!this.sessionId || this.isRunning) {
      return;
    }
    this.loading.step = true;
    const sub = this.trainingApi.stepTraining(this.sessionId, 1).subscribe({
      next: (data) => this.applyStatus(data),
      error: () => {
        this.loading.step = false;
        this.clearTimer();
      },
      complete: () => {
        this.loading.step = false;
      }
    });
    this.subscriptions.add(sub);
  }

  startAutoRun(): void {
    if (!this.sessionId || this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.timerId = setInterval(() => {
      if (!this.sessionId || this.loading.step) {
        return;
      }
      this.loading.step = true;
      const sub = this.trainingApi.stepTraining(this.sessionId, 1).subscribe({
        next: (data) => this.applyStatus(data),
        error: () => this.clearTimer(),
        complete: () => {
          this.loading.step = false;
        }
      });
      this.subscriptions.add(sub);
    }, this.intervalMs);
  }

  pause(): void {
    this.clearTimer();
    if (!this.sessionId) {
      return;
    }
    const sub = this.trainingApi.pauseTraining(this.sessionId).subscribe({
      next: (data) => {
        this.trainingState.status = data.status;
        this.refreshStatus();
      }
    });
    this.subscriptions.add(sub);
  }

  refreshStatus(): void {
    if (!this.sessionId) {
      return;
    }
    this.loading.status = true;
    const sub = this.trainingApi.getTrainingStatus(this.sessionId).subscribe({
      next: (data) => this.applyStatus(data),
      error: () => {
        this.loading.status = false;
      },
      complete: () => {
        this.loading.status = false;
      }
    });
    this.subscriptions.add(sub);
  }

  private applyStatus(payload: TrainingStatusResponse): void {
    this.trainingState = {
      ...payload,
      visualization: payload.visualization || { points: [], boundary: [], centers: [] }
    };

    this.appendMetric(this.lossHistory, payload.currentStep, payload.loss ?? 0);
    const accuracyValue = typeof payload.metrics?.['accuracy'] === 'number'
      ? Number(payload.metrics['accuracy'])
      : null;
    if (accuracyValue !== null) {
      this.appendMetric(this.accuracyHistory, payload.currentStep, accuracyValue);
    }

    if (['completed', 'stopped', 'failed'].includes(payload.status)) {
      this.clearTimer();
    }
  }

  private appendMetric(history: Array<{ step: number; value: number }>, step: number, value: number): void {
    const existingIndex = history.findIndex((item) => item.step === step);
    if (existingIndex >= 0) {
      history.splice(existingIndex, 1, { step, value });
    } else {
      history.push({ step, value });
    }
  }

  private buildInitPayload(): Record<string, unknown> {
    const algorithm = this.config?.algorithm ?? 'linear_regression';
    const basePayload = {
      algorithm,
      datasetId: this.config?.dataset ?? 'frontend_dataset',
      featureColumns: ['x1', 'x2'],
      labelColumn: algorithm === 'kmeans' ? null : 'label',
      hyperParams: { ...this.config?.params },
      trainConfig: { maxSteps: this.maxSteps }
    };

    if (algorithm === 'svm' && !('learningRate' in basePayload.hyperParams)) {
      basePayload.hyperParams = { ...basePayload.hyperParams, learningRate: 0.01 };
    }
    if (algorithm === 'linear_regression' && !('learningRate' in basePayload.hyperParams)) {
      basePayload.hyperParams = { ...basePayload.hyperParams, learningRate: 0.01 };
    }
    if (algorithm === 'kmeans' && !('kValue' in basePayload.hyperParams)) {
      basePayload.hyperParams = { ...basePayload.hyperParams, kValue: 3 };
    }

    return basePayload;
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }

  formatMetric(value: number | null): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '-';
    }
    return Number(value).toFixed(4);
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.subscriptions.unsubscribe();
  }
}
