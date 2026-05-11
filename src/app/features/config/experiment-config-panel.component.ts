import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AlgorithmMeta, DatasetMeta, ExperimentConfig, LearningType, ParamSchema, ParamValue } from '../../core/models/platform.models';

const learningTypeLabels: Record<string, string> = {
  supervised: '监督学习',
  unsupervised: '无监督学习',
  reinforcement: '强化学习'
};

@Component({
  selector: 'app-experiment-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h2>实验配置</h2>
          <p>算法和数据集均从 Spring Boot + MyBatis 接口动态加载。</p>
        </div>
        <span class="badge">数据库驱动</span>
      </div>

      <p class="placeholder" *ngIf="loading">正在加载算法与数据集元数据...</p>
      <p class="placeholder" *ngIf="!loading && algorithms.length === 0">暂无可用算法元数据。</p>

      <ng-container *ngIf="algorithms.length > 0">
        <div class="grid">
          <label class="field">
            <span>学习类型</span>
            <select [(ngModel)]="learningType" (ngModelChange)="handleLearningTypeChange($event)">
              <option *ngFor="let item of learningTypeOptions" [ngValue]="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>算法</span>
            <select [(ngModel)]="selectedAlgorithmCode" (ngModelChange)="handleAlgorithmChange($event)">
              <option *ngFor="let item of currentAlgorithms" [ngValue]="item.code">{{ item.name }}</option>
            </select>
            <small>{{ currentAlgorithm?.description || '请选择算法' }}</small>
          </label>

          <label class="field">
            <span>数据集</span>
            <select [(ngModel)]="dataset" (ngModelChange)="emitConfig()">
              <option *ngFor="let item of currentDatasets" [ngValue]="item.code">{{ item.name }}</option>
            </select>
            <small>{{ currentDataset?.description || '请选择数据集' }}</small>
          </label>
        </div>

        <div class="param-grid" *ngIf="currentAlgorithm">
          <div class="param-card" *ngFor="let param of currentAlgorithm.paramsSchema">
            <label>
              <span>{{ getParamLabel(param) }}</span>

              <input
                *ngIf="param.type === 'number'"
                type="number"
                [min]="param.min ?? null"
                [max]="param.max ?? null"
                [step]="param.step ?? 1"
                [(ngModel)]="params[param.key]"
                (ngModelChange)="emitConfig()"
              />

              <select
                *ngIf="param.type === 'select'"
                [(ngModel)]="params[param.key]"
                (ngModelChange)="emitConfig()"
              >
                <option *ngFor="let option of param.options || []" [ngValue]="option.value">{{ option.label }}</option>
              </select>

              <label *ngIf="param.type === 'boolean' || param.type === 'switch'" class="switch-field">
                <input type="checkbox" [(ngModel)]="params[param.key]" (ngModelChange)="emitConfig()" />
                <span>{{ params[param.key] ? '开启' : '关闭' }}</span>
              </label>
            </label>
          </div>
        </div>

        <div class="footer">
          <button class="primary" type="button" (click)="emitConfig()">应用配置</button>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .card { background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
    h2 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0; color: #64748b; }
    .badge { padding: 6px 12px; border-radius: 999px; background: #ecfeff; color: #0f766e; font-size: 12px; font-weight: 700; }
    .placeholder { color: #64748b; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .field, .param-card label { display: flex; flex-direction: column; gap: 8px; font-weight: 600; color: #334155; }
    .field small { font-weight: 400; color: #64748b; }
    select, input[type='number'] { width: 100%; border: 1px solid #dbe2ea; border-radius: 12px; padding: 10px 12px; background: #fff; }
    .param-grid { margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .param-card { padding: 16px; border-radius: 14px; background: #f8fafc; }
    .switch-field { display: flex; gap: 10px; align-items: center; font-weight: 500; }
    .footer { margin-top: 20px; display: flex; justify-content: flex-end; }
    button.primary { border: 0; border-radius: 12px; padding: 12px 18px; background: #2563eb; color: #fff; font-weight: 600; cursor: pointer; }
  `]
})
export class ExperimentConfigPanelComponent implements OnChanges {
  @Input() algorithms: AlgorithmMeta[] = [];
  @Input() datasets: DatasetMeta[] = [];
  @Input() loading = false;
  @Input() selectedConfig: ExperimentConfig | null = null;
  @Output() readonly configChange = new EventEmitter<ExperimentConfig>();

  learningType: LearningType = 'supervised';
  selectedAlgorithmCode = '';
  dataset = '';
  params: Record<string, ParamValue> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedConfig'] && this.selectedConfig) {
      this.applyConfig(this.selectedConfig);
      return;
    }

    if (changes['algorithms'] || changes['datasets']) {
      this.ensureDefaults();
      this.emitConfig();
    }
  }

  get learningTypeOptions(): Array<{ label: string; value: LearningType }> {
    const values = Array.from(new Set(this.algorithms.map((item) => item.learningType)));
    return values.map((value) => ({
      value: value as LearningType,
      label: learningTypeLabels[value] ?? value
    }));
  }

  get currentAlgorithms(): AlgorithmMeta[] {
    return this.algorithms.filter((item) => item.learningType === this.learningType);
  }

  get currentAlgorithm(): AlgorithmMeta | undefined {
    return this.currentAlgorithms.find((item) => item.code === this.selectedAlgorithmCode);
  }

  get currentDatasets(): DatasetMeta[] {
    const filtered = this.datasets.filter((item) => item.taskType === this.learningType);
    return filtered.length > 0 ? filtered : this.datasets;
  }

  get currentDataset(): DatasetMeta | undefined {
    return this.currentDatasets.find((item) => item.code === this.dataset);
  }

  handleLearningTypeChange(value: LearningType): void {
    this.learningType = value;
    this.selectedAlgorithmCode = this.currentAlgorithms[0]?.code ?? '';
    this.dataset = this.currentDatasets[0]?.code ?? '';
    this.resetParams();
    this.emitConfig();
  }

  handleAlgorithmChange(value: string): void {
    this.selectedAlgorithmCode = value;
    this.resetParams();
    this.emitConfig();
  }

  getParamLabel(param: ParamSchema): string {
    return param.label || param.key;
  }

  emitConfig(): void {
    if (!this.selectedAlgorithmCode || !this.dataset) {
      return;
    }

    this.configChange.emit({
      learningType: this.learningType,
      algorithm: this.selectedAlgorithmCode,
      dataset: this.dataset,
      params: { ...this.params }
    });
  }

  private ensureDefaults(): void {
    if (this.algorithms.length === 0) {
      return;
    }

    const learningTypeExists = this.learningTypeOptions.some((item) => item.value === this.learningType);
    if (!learningTypeExists) {
      this.learningType = this.learningTypeOptions[0]?.value ?? 'supervised';
    }

    if (!this.currentAlgorithms.some((item) => item.code === this.selectedAlgorithmCode)) {
      this.selectedAlgorithmCode = this.currentAlgorithms[0]?.code ?? '';
      this.resetParams();
    }

    if (!this.currentDatasets.some((item) => item.code === this.dataset)) {
      this.dataset = this.currentDatasets[0]?.code ?? '';
    }
  }

  private applyConfig(config: ExperimentConfig): void {
    this.learningType = config.learningType;
    this.selectedAlgorithmCode = config.algorithm;
    this.dataset = config.dataset;
    this.params = { ...config.params };
    this.ensureDefaults();
    this.emitConfig();
  }

  private resetParams(): void {
    this.params = {};
    for (const param of this.currentAlgorithm?.paramsSchema ?? []) {
      this.params[param.key] = param.defaultValue;
    }
  }
}
