import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, map, switchMap } from 'rxjs';

import { AlgorithmMeta, ExperimentConfig, ParamValue, TrainingStatusResponse } from '../../core/models/platform.models';
import { TrainingApiService } from '../../core/services/training-api.service';

interface ComparisonTarget {
  label: string;
  algorithm: string;
}

interface ComparisonResult {
  label: string;
  algorithm: string;
  sessionId: string;
  status: string;
  step: number;
  loss: number | null;
  metricLabel: string;
  metricValue: string;
}

@Component({
  selector: 'app-model-comparison-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h2>模型对比</h2>
          <p>在同一个数据集和特征配置上，快速比较当前算法与另一个算法的训练表现。</p>
        </div>
        <span class="badge">对比实验</span>
      </div>

      <div class="compare-grid">
        <label class="field">
          <span>对比算法</span>
          <select [(ngModel)]="comparisonAlgorithm">
            <option *ngFor="let item of comparableAlgorithms" [ngValue]="item.code">{{ item.name }}</option>
          </select>
        </label>

        <label class="field">
          <span>对比步数</span>
          <input type="number" [(ngModel)]="compareSteps" min="1" max="50" />
        </label>
      </div>

      <div class="actions">
        <button class="primary" type="button" (click)="runComparison()" [disabled]="loading || !canCompare">
          {{ loading ? '对比中...' : '运行对比' }}
        </button>
      </div>

      <p class="message" [class.error]="!!errorMessage">{{ errorMessage || helperText }}</p>

      <div class="result-table" *ngIf="results.length > 0">
        <div class="result-row header">
          <span>模型</span>
          <span>核心指标</span>
          <span>Loss</span>
          <span>步数</span>
          <span>Session</span>
        </div>
        <div class="result-row" *ngFor="let item of results">
          <strong>{{ item.label }}：{{ item.algorithm }}</strong>
          <span>{{ item.metricLabel }} {{ item.metricValue }}</span>
          <span>{{ formatLoss(item.loss) }}</span>
          <span>{{ item.step }}</span>
          <small>{{ item.sessionId }}</small>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .card {
      background: rgba(255,255,255,0.92);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(255,255,255,0.7);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    h2 { margin: 0 0 8px; color: #0f172a; }
    p { margin: 0; color: #64748b; line-height: 1.7; }
    .badge {
      padding: 8px 14px;
      border-radius: 999px;
      color: #0f766e;
      background: #ccfbf1;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .compare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #334155;
      font-weight: 800;
    }
    select,
    input {
      min-height: 48px;
      border: 1px solid #d7e1f0;
      border-radius: 14px;
      padding: 10px 12px;
      background: #ffffff;
      color: #0f172a;
      font-weight: 700;
    }
    .actions { margin-top: 16px; }
    button.primary {
      border: 0;
      border-radius: 14px;
      padding: 12px 18px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }
    button.primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .message {
      min-height: 24px;
      margin-top: 12px;
      font-weight: 600;
    }
    .message.error { color: #dc2626; }
    .result-table {
      display: grid;
      gap: 8px;
      margin-top: 16px;
    }
    .result-row {
      display: grid;
      grid-template-columns: minmax(170px, 1.2fr) minmax(130px, 0.8fr) minmax(90px, 0.5fr) minmax(60px, 0.4fr) minmax(160px, 1fr);
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
      border-radius: 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .result-row.header {
      color: #64748b;
      background: #f8fafc;
      font-size: 12px;
      font-weight: 900;
    }
    .result-row small {
      color: #64748b;
      word-break: break-all;
    }
    @media (max-width: 760px) {
      .card-header { flex-direction: column; }
      .result-row { grid-template-columns: 1fr; }
    }
  `]
})
export class ModelComparisonPanelComponent implements OnChanges, OnDestroy {
  @Input() config: ExperimentConfig | null = null;
  @Input() algorithms: AlgorithmMeta[] = [];

  comparisonAlgorithm = '';
  compareSteps = 5;
  loading = false;
  errorMessage = '';
  results: ComparisonResult[] = [];

  private readonly subscriptions = new Subscription();

  constructor(private readonly trainingApi: TrainingApiService) {}

  get comparableAlgorithms(): AlgorithmMeta[] {
    if (!this.config) {
      return [];
    }
    return this.algorithms.filter((item) => item.learningType === this.config?.learningType);
  }

  get canCompare(): boolean {
    return !!this.config && !!this.comparisonAlgorithm && this.comparableAlgorithms.length > 1;
  }

  get helperText(): string {
    if (!this.config) {
      return '先选择一个实验配置后再运行模型对比。';
    }
    if (this.comparableAlgorithms.length <= 1) {
      return '当前学习类型下没有足够的算法可供对比。';
    }
    return '系统会临时创建两个训练 session，不影响主训练控制区。';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] || changes['algorithms']) {
      this.ensureComparisonAlgorithm();
      this.results = [];
      this.errorMessage = '';
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  runComparison(): void {
    if (!this.config || !this.canCompare) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.results = [];

    const targets: ComparisonTarget[] = [
      { label: '当前', algorithm: this.config.algorithm },
      { label: '对比', algorithm: this.comparisonAlgorithm }
    ];

    const jobs = targets.map((target) => {
      const payload = this.buildPayload(target.algorithm);
      return this.trainingApi.initTraining(payload).pipe(
        switchMap((session) => this.trainingApi.stepTraining(session.sessionId, this.compareSteps)),
        map((status) => this.toResult(target.label, status))
      );
    });

    const sub = forkJoin(jobs).subscribe({
      next: (items) => {
        this.results = items;
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : '模型对比失败，请检查算法和数据集是否匹配。';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
    this.subscriptions.add(sub);
  }

  formatLoss(value: number | null): string {
    return typeof value === 'number' ? value.toFixed(4) : '-';
  }

  private ensureComparisonAlgorithm(): void {
    if (!this.config) {
      this.comparisonAlgorithm = '';
      return;
    }
    const fallback = this.comparableAlgorithms.find((item) => item.code !== this.config?.algorithm)
      ?? this.comparableAlgorithms[0];
    if (!this.comparableAlgorithms.some((item) => item.code === this.comparisonAlgorithm)
        || this.comparisonAlgorithm === this.config.algorithm) {
      this.comparisonAlgorithm = fallback?.code ?? '';
    }
  }

  private buildPayload(algorithm: string): Record<string, unknown> {
    const customDataset = this.config?.customDataset ?? null;
    const featureColumns = customDataset?.featureColumns?.length ? customDataset.featureColumns : ['x1', 'x2'];
    const labelColumn = ['kmeans', 'pca'].includes(algorithm) ? null : customDataset?.labelColumn ?? 'label';

    return {
      algorithm,
      datasetId: this.config?.dataset ?? 'frontend_dataset',
      featureColumns,
      labelColumn,
      hyperParams: this.buildHyperParams(algorithm),
      trainConfig: { maxSteps: this.compareSteps },
      ...(customDataset ? { customDataset } : {})
    };
  }

  private buildHyperParams(algorithm: string): Record<string, ParamValue> {
    if (algorithm === this.config?.algorithm) {
      return { ...this.config.params };
    }

    const meta = this.algorithms.find((item) => item.code === algorithm);
    const params: Record<string, ParamValue> = {};
    for (const item of meta?.paramsSchema ?? []) {
      params[item.key] = item.defaultValue;
    }
    return params;
  }

  private toResult(label: string, status: TrainingStatusResponse): ComparisonResult {
    const metric = this.pickPrimaryMetric(status);
    return {
      label,
      algorithm: status.algorithm,
      sessionId: status.sessionId,
      status: status.status,
      step: status.currentStep,
      loss: status.loss,
      metricLabel: metric.label,
      metricValue: metric.value
    };
  }

  private pickPrimaryMetric(status: TrainingStatusResponse): { label: string; value: string } {
    const metrics = status.metrics;
    if (typeof metrics['accuracy'] === 'number') {
      return { label: 'Accuracy', value: `${(metrics['accuracy'] * 100).toFixed(1)}%` };
    }
    if (typeof metrics['explainedVariance'] === 'number') {
      return { label: 'Explained', value: `${(metrics['explainedVariance'] * 100).toFixed(1)}%` };
    }
    if (typeof metrics['silhouette'] === 'number') {
      return { label: 'Silhouette', value: metrics['silhouette'].toFixed(4) };
    }
    if (typeof metrics['mse'] === 'number') {
      return { label: 'MSE', value: metrics['mse'].toFixed(4) };
    }
    return { label: 'Loss', value: this.formatLoss(status.loss) };
  }
}
