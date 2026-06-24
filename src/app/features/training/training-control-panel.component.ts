import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ExperimentConfig, TrainingSessionSummary, TrainingStatusResponse, TrainingViewMode } from '../../core/models/platform.models';
import { TrainingApiService } from '../../core/services/training-api.service';
import { ExperimentContextService } from '../../core/services/experiment-context.service';
import { GridWorldVisualizerComponent } from '../../shared/components/gridworld-visualizer.component';
import { MetricTrendChartComponent } from '../../shared/components/metric-trend-chart.component';
import { TwoDimensionalVisualizerComponent } from '../../shared/components/two-dimensional-visualizer.component';
import { EvaluationMetricsPanelComponent } from './evaluation-metrics-panel.component';
import { ModelExplanationPanelComponent } from './model-explanation-panel.component';

@Component({
  selector: 'app-training-control-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TwoDimensionalVisualizerComponent, GridWorldVisualizerComponent, MetricTrendChartComponent, EvaluationMetricsPanelComponent, ModelExplanationPanelComponent],
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
        <button class="primary" (click)="handleInit()" [disabled]="loading.init || !config">初始化</button>
        <button (click)="handleStep()" [disabled]="!sessionId || loading.step || isRunning || isTerminal">单步执行</button>
        <button class="success" (click)="startAutoRun()" [disabled]="!sessionId || isRunning || isTerminal">自动训练</button>
        <button class="warning" (click)="pause()" [disabled]="!sessionId || !isRunning">暂停</button>
        <button (click)="refreshStatus()" [disabled]="!sessionId || loading.status">刷新状态</button>
      </div>

      <p class="train-error" *ngIf="errorMessage" role="alert">⚠ {{ errorMessage }}</p>
      <p class="train-hint" *ngIf="isTerminal && !errorMessage">本轮训练已{{ statusLabel }}，如需继续请重新「初始化」。</p>

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

      <div class="status-ribbon">
        <span class="ribbon-item">算法：{{ config?.algorithm || '未选择' }}</span>
        <span class="ribbon-item">数据集：{{ config?.dataset || '未选择' }}</span>
        <span class="ribbon-item">状态：{{ trainingState.status }}</span>
        <span class="ribbon-item">进度：{{ trainingState.currentStep }}/{{ trainingState.maxSteps || maxSteps }}</span>
      </div>
    </section>

    <app-evaluation-metrics-panel
      [algorithm]="trainingState.algorithm || config?.algorithm || ''"
      [loss]="trainingState.loss"
      [metrics]="trainingState.metrics"
      [predictions]="trainingState.predictions"
      [parameters]="trainingState.parameters"
    ></app-evaluation-metrics-panel>

    <app-model-explanation-panel
      [algorithm]="trainingState.algorithm || config?.algorithm || ''"
      [parameters]="trainingState.parameters"
      [predictions]="trainingState.predictions"
      [visualization]="trainingState.visualization"
    ></app-model-explanation-panel>

    <app-gridworld-visualizer
      *ngIf="viewMode === 'reinforcement'; else scatterViz"
      [parameters]="trainingState.parameters"
    ></app-gridworld-visualizer>
    <ng-template #scatterViz>
      <app-two-dimensional-visualizer
        [mode]="viewMode"
        [chartData]="trainingState.visualization"
      ></app-two-dimensional-visualizer>
    </ng-template>

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
    :host { display: grid; gap: 18px; width: 100%; min-width: 0; }
    :host > * { min-width: 0; }
    .card { width: 100%; min-width: 0; background: rgba(255,255,255,0.94); border-radius: 20px; padding: 22px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08); margin-bottom: 0; border: 1px solid rgba(255,255,255,0.8); }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .card-header > div { min-width: 0; }
    h2 { margin: 0 0 8px; font-size: 26px; }
    h3 { margin: 0; }
    p { margin: 0; color: #64748b; line-height: 1.7; }
    .badge { padding: 8px 14px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .badge.running { background: #dcfce7; color: #15803d; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-top: 16px; }
    .field { display: flex; flex-direction: column; gap: 8px; font-weight: 600; color: #334155; }
    .field input { border: 1px solid #dbe2ea; border-radius: 14px; padding: 12px 14px; background: rgba(255,255,255,0.98); }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
    .actions button { flex: 0 1 auto; }
    button { border: 1px solid #cbd5f5; background: #fff; color: #1f2937; padding: 11px 16px; border-radius: 14px; cursor: pointer; font-weight: 700; }
    button.primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border-color: #2563eb; }
    button.success { background: linear-gradient(135deg, #10b981, #059669); color: #fff; border-color: #10b981; }
    button.warning { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; border-color: #f59e0b; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .train-error { margin: 12px 0 0; color: #b91c1c; font-weight: 700; font-size: 14px; }
    .train-hint { margin: 12px 0 0; color: #475569; font-size: 13px; }
    .summary { display: grid; grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(110px, 1fr)); gap: 12px; margin-top: 16px; padding: 14px; border-radius: 16px; background: linear-gradient(180deg, #f8fbff, #f8fafc); border: 1px solid #e2e8f0; }
    .summary > div { min-width: 0; }
    .summary strong { display: block; font-size: 12px; color: #64748b; }
    .summary span { display: block; min-width: 0; overflow-wrap: anywhere; word-break: break-word; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .status-ribbon {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }
    .ribbon-item {
      display: inline-flex;
      align-items: center;
      padding: 10px 14px;
      border-radius: 999px;
      background: linear-gradient(180deg, #eff6ff, #f8fafc);
      color: #334155;
      border: 1px solid #dbeafe;
      font-size: 13px;
      font-weight: 700;
    }
    .metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(280px, 1fr)); gap: 16px; min-width: 0; }
    .metrics-grid > * { min-width: 0; }
    .json-card pre { margin: 0; background: linear-gradient(180deg, #0f172a, #111827); color: #e2e8f0; padding: 18px; border-radius: 16px; overflow: auto; font-size: 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
    @media (max-width: 900px) {
      .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .metrics-grid { grid-template-columns: 1fr; }
      .card-header { flex-direction: column; }
    }
    @media (max-width: 560px) {
      .summary { grid-template-columns: 1fr; }
    }
  `]
})
export class TrainingControlPanelComponent implements OnDestroy {
  @Input() config: ExperimentConfig | null = null;
  @Output() readonly sessionChange = new EventEmitter<TrainingSessionSummary>();

  sessionId = '';
  maxSteps = 50;
  intervalMs = 800;
  isRunning = false;
  errorMessage: string | null = null;
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
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly trainingApi: TrainingApiService,
    private readonly experimentContext: ExperimentContextService
  ) {}

  get viewMode(): TrainingViewMode {
    if (this.config?.algorithm === 'q_learning') {
      return 'reinforcement';
    }
    if (this.config?.algorithm === 'pca') {
      return 'projection';
    }
    if (this.config?.algorithm === 'kmeans') {
      return 'clustering';
    }
    if (['svm', 'logistic_regression', 'decision_tree', 'random_forest'].includes(this.config?.algorithm ?? '')) {
      return 'classification';
    }
    return 'regression';
  }

  get safeAccuracy(): number | null {
    const accuracy = this.trainingState.metrics['accuracy'];
    return typeof accuracy === 'number' ? accuracy : null;
  }

  get isTerminal(): boolean {
    return ['completed', 'stopped', 'failed'].includes(this.trainingState.status);
  }

  get statusLabel(): string {
    switch (this.trainingState.status) {
      case 'completed': return '完成';
      case 'stopped': return '停止';
      case 'failed': return '失败';
      default: return this.trainingState.status;
    }
  }

  private toMessage(err: unknown, fallback: string): string {
    const message = err instanceof Error ? err.message : '';
    return message || fallback;
  }

  handleInit(): void {
    if (!this.config) {
      return;
    }

    this.clearTimer();
    this.loading.init = true;
    this.errorMessage = null;
    this.lossHistory = [];
    this.accuracyHistory = [];

    const sub = this.trainingApi.initTraining(this.buildInitPayload()).subscribe({
      next: (data) => {
        this.sessionId = data.sessionId;
        this.trainingState.sessionId = data.sessionId;
        this.trainingState.status = data.status;
        this.trainingState.currentStep = data.currentStep;
        this.trainingState.maxSteps = data.maxSteps;
        this.emitSessionChange();
        this.refreshStatus();
      },
      error: (err) => {
        this.loading.init = false;
        this.errorMessage = this.toMessage(err, '训练初始化失败，请稍后重试');
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
    this.errorMessage = null;
    const sub = this.trainingApi.stepTraining(this.sessionId, 1).subscribe({
      next: (data) => this.applyStatus(data),
      error: (err) => {
        this.loading.step = false;
        this.clearTimer();
        this.errorMessage = this.toMessage(err, '单步训练失败');
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
    this.errorMessage = null;
    this.timerId = setInterval(() => {
      if (!this.sessionId || this.loading.step) {
        return;
      }
      this.loading.step = true;
      const sub = this.trainingApi.stepTraining(this.sessionId, 1).subscribe({
        next: (data) => this.applyStatus(data),
        error: (err) => {
          this.loading.step = false;
          this.clearTimer();
          this.errorMessage = this.toMessage(err, '自动训练已中断');
        },
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
        this.emitSessionChange();
        this.refreshStatus();
      },
      error: (err) => {
        this.errorMessage = this.toMessage(err, '暂停失败');
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

  private applyStatus(payload: TrainingStatusResponse): void {
    this.trainingState = {
      ...payload,
      visualization: payload.visualization || { points: [], boundary: [], centers: [] }
    };

    this.lossHistory = this.appendMetric(this.lossHistory, payload.currentStep, payload.loss ?? 0);
    const accuracyValue = payload.metrics['accuracy'];
    const successRate = payload.metrics['successRate'];
    if (typeof accuracyValue === 'number') {
      this.accuracyHistory = this.appendMetric(this.accuracyHistory, payload.currentStep, accuracyValue);
    } else if (typeof successRate === 'number') {
      this.accuracyHistory = this.appendMetric(this.accuracyHistory, payload.currentStep, successRate);
    }

    this.experimentContext.patch({
      trainingStatus: payload.status,
      currentStep: payload.currentStep,
      maxSteps: this.maxSteps,
      loss: payload.loss,
      metrics: payload.metrics
    });

    this.emitSessionChange();

    if (['completed', 'stopped', 'failed'].includes(payload.status)) {
      this.clearTimer();
    }
  }

  private emitSessionChange(): void {
    if (!this.sessionId && !this.trainingState.sessionId) {
      return;
    }
    this.sessionChange.emit({
      sessionId: this.trainingState.sessionId || this.sessionId,
      status: this.trainingState.status,
      currentStep: this.trainingState.currentStep
    });
  }

  private appendMetric(history: Array<{ step: number; value: number }>, step: number, value: number): Array<{ step: number; value: number }> {
    const existingIndex = history.findIndex((item) => item.step === step);
    if (existingIndex >= 0) {
      return [...history.slice(0, existingIndex), { step, value }, ...history.slice(existingIndex + 1)];
    }
    return [...history, { step, value }];
  }

  private buildInitPayload(): Record<string, unknown> {
    const algorithm = this.config?.algorithm ?? 'linear_regression';
    const hyperParams = { ...(this.config?.params ?? {}) };
    const customDataset = this.config?.customDataset ?? null;
    const featureColumns = customDataset?.featureColumns?.length
      ? customDataset.featureColumns
      : (algorithm === 'q_learning' ? ['state'] : ['x1', 'x2']);
    const labelColumn = ['kmeans', 'pca', 'q_learning'].includes(algorithm) ? null : customDataset?.labelColumn ?? 'label';

    if (algorithm === 'svm' && !('learningRate' in hyperParams)) {
      hyperParams['learningRate'] = 0.01;
    }
    if (algorithm === 'linear_regression' && !('learningRate' in hyperParams)) {
      hyperParams['learningRate'] = 0.01;
    }
    if (algorithm === 'kmeans' && !('kValue' in hyperParams)) {
      hyperParams['kValue'] = 3;
    }
    if (algorithm === 'logistic_regression' && !('learningRate' in hyperParams)) {
      hyperParams['learningRate'] = 0.05;
    }
    if (algorithm === 'decision_tree') {
      if (!('maxDepth' in hyperParams)) {
        hyperParams['maxDepth'] = 4;
      }
      if (!('criterion' in hyperParams)) {
        hyperParams['criterion'] = 'gini';
      }
      if (!('minSamplesSplit' in hyperParams)) {
        hyperParams['minSamplesSplit'] = 2;
      }
    }
    if (algorithm === 'random_forest') {
      if (!('nEstimators' in hyperParams)) {
        hyperParams['nEstimators'] = 30;
      }
      if (!('treesPerStep' in hyperParams)) {
        hyperParams['treesPerStep'] = 5;
      }
      if (!('maxDepth' in hyperParams)) {
        hyperParams['maxDepth'] = 4;
      }
      if (!('minSamplesSplit' in hyperParams)) {
        hyperParams['minSamplesSplit'] = 2;
      }
    }
    if (algorithm === 'pca') {
      if (!('nComponents' in hyperParams)) {
        hyperParams['nComponents'] = 2;
      }
      if (!('standardize' in hyperParams)) {
        hyperParams['standardize'] = true;
      }
    }
    if (algorithm === 'q_learning') {
      if (!('gridSize' in hyperParams)) {
        hyperParams['gridSize'] = 5;
      }
      if (!('epsilon' in hyperParams)) {
        hyperParams['epsilon'] = 0.2;
      }
      if (!('learningRate' in hyperParams)) {
        hyperParams['learningRate'] = 0.1;
      }
      if (!('gamma' in hyperParams)) {
        hyperParams['gamma'] = 0.9;
      }
      if (!('maxEpisodeSteps' in hyperParams)) {
        hyperParams['maxEpisodeSteps'] = 100;
      }
    }

    const payload: Record<string, unknown> = {
      algorithm,
      datasetId: this.config?.dataset ?? 'frontend_dataset',
      featureColumns,
      labelColumn,
      hyperParams,
      trainConfig: { maxSteps: this.maxSteps }
    };

    if (customDataset) {
      payload['customDataset'] = customDataset;
    }

    return payload;
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }
}
