import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as echarts from 'echarts';

import { AlgorithmMeta, DatasetMeta, TrainingStatusResponse, VisualizationData } from '../../core/models/platform.models';
import { TrainingApiService } from '../../core/services/training-api.service';
import { TwoDimensionalVisualizerComponent } from '../../shared/components/two-dimensional-visualizer.component';

interface ComparePair {
  key: string;
  label: string;
  a: string;
  b: string;
}

interface CompareSide {
  algorithm: string;
  name: string;
  sessionId: string;
  status: TrainingStatusResponse | null;
  accHistory: number[];
}

const EMPTY_VIS: VisualizationData = { points: [], boundary: [], centers: [] };

@Component({
  selector: 'app-algorithm-comparison-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TwoDimensionalVisualizerComponent],
  template: `
    <section class="content-card compare-card">
      <div class="section-heading">
        <span>Compare</span>
        <h2>算法对比</h2>
        <p>在同一数据集（Iris）上同步训练两个算法，对比决策边界与 Accuracy 收敛。</p>
      </div>

      <div class="compare-controls">
        <label class="field">
          <span>对比配对</span>
          <select [(ngModel)]="selectedPairKey" [disabled]="loading || autoRunning">
            <option *ngFor="let p of pairs" [ngValue]="p.key">{{ p.label }}</option>
          </select>
        </label>
        <label class="field">
          <span>数据集</span>
          <input type="text" value="Iris 鸢尾花" disabled />
        </label>
        <label class="field">
          <span>最大步数</span>
          <input type="number" min="5" max="100" [(ngModel)]="maxSteps" [disabled]="autoRunning" />
        </label>
        <div class="compare-actions">
          <button class="primary-action" type="button" (click)="initBoth()" [disabled]="loading">
            {{ loading ? '初始化中...' : '初始化两者' }}
          </button>
          <button type="button" (click)="stepBoth()" [disabled]="!ready || autoRunning">单步</button>
          <button type="button" (click)="toggleAuto()" [disabled]="!ready">{{ autoRunning ? '暂停' : '自动' }}</button>
        </div>
      </div>

      <p class="compare-msg" *ngIf="message">{{ message }}</p>
      <p class="compare-empty" *ngIf="!sideA && !message">点击「初始化两者」开始同步对比训练。</p>

      <div class="compare-grid" *ngIf="sideA && sideB">
        <div class="compare-col">
          <h3>{{ sideA.name }} <small>Acc {{ lastAcc(sideA) }}</small></h3>
          <app-two-dimensional-visualizer
            [title]="sideA.name"
            subtitle="决策边界"
            mode="classification"
            [chartData]="sideA.status?.visualization || emptyVis"
          ></app-two-dimensional-visualizer>
        </div>
        <div class="compare-col">
          <h3>{{ sideB.name }} <small>Acc {{ lastAcc(sideB) }}</small></h3>
          <app-two-dimensional-visualizer
            [title]="sideB.name"
            subtitle="决策边界"
            mode="classification"
            [chartData]="sideB.status?.visualization || emptyVis"
          ></app-two-dimensional-visualizer>
        </div>
      </div>

      <div class="compare-metric">
        <div class="metric-head">Accuracy 对比曲线</div>
        <div #accChart class="acc-chart"></div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; width: 100%; min-width: 0; }
    .compare-card { width: 100%; min-width: 0; }
    .section-heading span { color: var(--text-muted, #6b7280); font-size: 12px; font-weight: 800; letter-spacing: 0.08em; }
    .section-heading h2 { margin: 6px 0 4px; }
    .section-heading p { margin: 0 0 16px; color: var(--text-muted, #6b7280); }
    .compare-controls { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; }
    .field { display: grid; gap: 6px; }
    .field span { font-size: 12px; color: var(--text-muted, #6b7280); font-weight: 700; }
    .field select, .field input { padding: 8px 12px; border: 1px solid var(--border-strong, #e5e7eb); border-radius: 10px; min-width: 180px; }
    .compare-actions { display: flex; gap: 10px; }
    .compare-actions button { padding: 9px 16px; border: 1px solid var(--border-strong, #e5e7eb); background: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; }
    .compare-actions .primary-action { background: #1c2024; color: #fff; border-color: #1c2024; }
    .compare-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
    .compare-msg { margin: 14px 0 0; color: #c0392b; }
    .compare-empty { margin: 18px 0 0; padding: 18px; border: 1px dashed var(--border-strong, #e5e7eb); border-radius: 14px; color: var(--text-muted, #6b7280); }
    .compare-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
    .compare-col { min-width: 0; display: grid; gap: 8px; }
    .compare-col h3 { margin: 0; font-size: 16px; }
    .compare-col h3 small { color: #2f8f6c; font-weight: 700; margin-left: 6px; }
    .compare-metric { margin-top: 18px; }
    .metric-head { font-weight: 800; margin-bottom: 8px; }
    .acc-chart { width: 100%; min-width: 0; height: 260px; }
    @media (max-width: 1024px) { .compare-grid { grid-template-columns: 1fr; } }
  `]
})
export class AlgorithmComparisonPanelComponent implements AfterViewInit, OnDestroy {
  @Input() algorithms: AlgorithmMeta[] = [];
  @Input() datasets: DatasetMeta[] = [];

  readonly pairs: ComparePair[] = [
    { key: 'lr_svm', label: '逻辑回归 vs SVM', a: 'logistic_regression', b: 'svm' },
    { key: 'tree_forest', label: '决策树 vs 随机森林', a: 'decision_tree', b: 'random_forest' }
  ];
  readonly datasetId = 'iris';
  readonly emptyVis = EMPTY_VIS;

  selectedPairKey = this.pairs[0].key;
  maxSteps = 30;
  sideA: CompareSide | null = null;
  sideB: CompareSide | null = null;
  loading = false;
  autoRunning = false;
  message = '';

  @ViewChild('accChart') private accChartRef?: ElementRef<HTMLDivElement>;
  private accChart: echarts.ECharts | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly subs = new Subscription();

  constructor(private readonly trainingApi: TrainingApiService) {}

  ngAfterViewInit(): void {
    if (this.accChartRef) {
      this.accChart = echarts.init(this.accChartRef.nativeElement);
      window.addEventListener('resize', this.handleResize);
      this.renderAccChart();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.subs.unsubscribe();
    window.removeEventListener('resize', this.handleResize);
    this.accChart?.dispose();
  }

  get pair(): ComparePair {
    return this.pairs.find((p) => p.key === this.selectedPairKey) ?? this.pairs[0];
  }

  get ready(): boolean {
    return !!(this.sideA?.sessionId && this.sideB?.sessionId);
  }

  algoName(code: string): string {
    return this.algorithms.find((a) => a.code === code)?.name ?? code;
  }

  lastAcc(side: CompareSide): string {
    if (!side.accHistory.length) {
      return '-';
    }
    return (side.accHistory[side.accHistory.length - 1] * 100).toFixed(1) + '%';
  }

  initBoth(): void {
    this.clearTimer();
    this.autoRunning = false;
    this.loading = true;
    this.message = '';
    const p = this.pair;
    this.sideA = { algorithm: p.a, name: this.algoName(p.a), sessionId: '', status: null, accHistory: [] };
    this.sideB = { algorithm: p.b, name: this.algoName(p.b), sessionId: '', status: null, accHistory: [] };
    this.renderAccChart();
    this.initSide(this.sideA);
    this.initSide(this.sideB);
  }

  stepBoth(): void {
    if (this.sideA) {
      this.stepSide(this.sideA);
    }
    if (this.sideB) {
      this.stepSide(this.sideB);
    }
  }

  toggleAuto(): void {
    if (this.autoRunning) {
      this.pauseAuto();
      return;
    }
    if (!this.ready) {
      return;
    }
    this.autoRunning = true;
    this.timer = setInterval(() => {
      if (this.bothFinished()) {
        this.pauseAuto();
        return;
      }
      this.stepBoth();
    }, 800);
  }

  pauseAuto(): void {
    this.autoRunning = false;
    this.clearTimer();
  }

  private bothFinished(): boolean {
    const done = (side: CompareSide | null) =>
      !side || !!(side.status && side.status.currentStep >= side.status.maxSteps);
    return done(this.sideA) && done(this.sideB);
  }

  private initSide(side: CompareSide): void {
    const sub = this.trainingApi.initTraining(this.buildPayload(side.algorithm)).subscribe({
      next: (res) => {
        side.sessionId = res.sessionId;
        this.loading = false;
        this.refreshSide(side);
      },
      error: (err: unknown) => {
        this.loading = false;
        this.message = err instanceof Error ? err.message : '初始化失败，请稍后重试。';
      }
    });
    this.subs.add(sub);
  }

  private refreshSide(side: CompareSide): void {
    if (!side.sessionId) {
      return;
    }
    const sub = this.trainingApi.getTrainingStatus(side.sessionId).subscribe({
      next: (status) => this.applyStatus(side, status)
    });
    this.subs.add(sub);
  }

  private stepSide(side: CompareSide): void {
    if (!side.sessionId) {
      return;
    }
    const sub = this.trainingApi.stepTraining(side.sessionId, 1).subscribe({
      next: (status) => this.applyStatus(side, status)
    });
    this.subs.add(sub);
  }

  private applyStatus(side: CompareSide, status: TrainingStatusResponse): void {
    side.status = status;
    const raw = status.metrics?.['accuracy'] ?? status.metrics?.['Accuracy'];
    const acc = Number(raw);
    if (raw !== null && raw !== undefined && !Number.isNaN(acc)) {
      side.accHistory = [...side.accHistory, acc];
    }
    this.renderAccChart();
  }

  private buildPayload(algorithm: string): Record<string, unknown> {
    const hyperParams: Record<string, unknown> = {};
    if (algorithm === 'svm') {
      hyperParams['kernel'] = 'linear';
      hyperParams['learningRate'] = 0.01;
      hyperParams['cValue'] = 1.0;
    }
    if (algorithm === 'logistic_regression') {
      hyperParams['learningRate'] = 0.05;
      hyperParams['maxIter'] = 100;
      hyperParams['fitIntercept'] = true;
    }
    if (algorithm === 'decision_tree') {
      hyperParams['maxDepth'] = 4;
      hyperParams['criterion'] = 'gini';
      hyperParams['minSamplesSplit'] = 2;
    }
    if (algorithm === 'random_forest') {
      hyperParams['nEstimators'] = 30;
      hyperParams['treesPerStep'] = 5;
      hyperParams['maxDepth'] = 4;
      hyperParams['minSamplesSplit'] = 2;
    }
    return {
      algorithm,
      datasetId: this.datasetId,
      featureColumns: ['x1', 'x2'],
      labelColumn: 'label',
      hyperParams,
      trainConfig: { maxSteps: this.maxSteps }
    };
  }

  private renderAccChart(): void {
    if (!this.accChart) {
      return;
    }
    const lenA = this.sideA?.accHistory.length ?? 0;
    const lenB = this.sideB?.accHistory.length ?? 0;
    const steps = Array.from({ length: Math.max(lenA, lenB) }, (_, i) => i + 1);
    this.accChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: [this.sideA?.name ?? 'A', this.sideB?.name ?? 'B'], top: 0 },
      grid: { left: 48, right: 24, top: 36, bottom: 36 },
      xAxis: { type: 'category', name: 'Step', data: steps },
      yAxis: { type: 'value', name: 'Accuracy', min: 0, max: 1 },
      series: [
        {
          name: this.sideA?.name ?? 'A',
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#2563eb' },
          itemStyle: { color: '#2563eb' },
          data: this.sideA?.accHistory ?? []
        },
        {
          name: this.sideB?.name ?? 'B',
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#e0734f' },
          itemStyle: { color: '#e0734f' },
          data: this.sideB?.accHistory ?? []
        }
      ]
    }, true);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private readonly handleResize = (): void => {
    this.accChart?.resize();
  };
}
