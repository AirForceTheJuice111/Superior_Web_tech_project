import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { algorithmOptionsByType, datasetOptions, learningTypeOptions } from './experiment-schemas';
import { AlgorithmSchema, ExperimentConfig, LearningType, ParamSchema } from './models';

@Component({
  selector: 'app-experiment-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h2>实验配置面板</h2>
          <p>按课程要求使用 Angular 重构，保留实验配置、动态参数和训练联调能力。</p>
        </div>
        <span class="badge">Angular</span>
      </div>

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
            <option *ngFor="let item of currentAlgorithms" [ngValue]="item.value">{{ item.label }}</option>
          </select>
          <small>{{ currentAlgorithm?.description }}</small>
        </label>

        <label class="field">
          <span>数据集</span>
          <select [(ngModel)]="dataset">
            <option *ngFor="let item of datasetOptions" [ngValue]="item.value">{{ item.label }}</option>
          </select>
        </label>
      </div>

      <div class="param-grid" *ngIf="currentAlgorithm">
        <div class="param-card" *ngFor="let param of currentAlgorithm.params">
          <label>
            <span>{{ param.label }}</span>
            <ng-container [ngSwitch]="param.type">
              <input
                *ngSwitchCase="'number'"
                type="number"
                [min]="param.min ?? null"
                [max]="param.max ?? null"
                [step]="param.step || 1"
                [(ngModel)]="params[param.key]"
              />

              <select *ngSwitchCase="'select'" [(ngModel)]="params[param.key]">
                <option *ngFor="let option of param.options" [ngValue]="option.value">{{ option.label }}</option>
              </select>

              <label *ngSwitchCase="'switch'" class="switch-field">
                <input type="checkbox" [(ngModel)]="params[param.key]" />
                <span>{{ params[param.key] ? '开启' : '关闭' }}</span>
              </label>
            </ng-container>
          </label>
        </div>
      </div>

      <div class="footer">
        <button class="primary" type="button" (click)="emitConfig()">应用配置到训练模块</button>
      </div>
    </section>
  `,
  styles: [`
    .card { background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
    h2 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0; color: #64748b; }
    .badge { padding: 6px 12px; border-radius: 999px; background: #ecfeff; color: #0f766e; font-size: 12px; font-weight: 700; }
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
export class ExperimentConfigPanelComponent {
  @Output() readonly configChange = new EventEmitter<ExperimentConfig>();

  readonly learningTypeOptions = learningTypeOptions;
  readonly datasetOptions = datasetOptions;

  learningType: LearningType = 'supervised';
  selectedAlgorithmCode = algorithmOptionsByType['supervised'][0].value;
  dataset = datasetOptions[0].value;
  params: Record<string, string | number | boolean> = {};

  get currentAlgorithms(): AlgorithmSchema[] {
    return algorithmOptionsByType[this.learningType];
  }

  get currentAlgorithm(): AlgorithmSchema | undefined {
    return this.currentAlgorithms.find((item) => item.value === this.selectedAlgorithmCode);
  }

  constructor() {
    this.resetParams();
    this.emitConfig();
  }

  handleLearningTypeChange(value: LearningType): void {
    this.learningType = value;
    this.selectedAlgorithmCode = algorithmOptionsByType[value][0].value;
    this.resetParams();
    this.emitConfig();
  }

  handleAlgorithmChange(value: string): void {
    this.selectedAlgorithmCode = value as AlgorithmSchema['value'];
    this.resetParams();
    this.emitConfig();
  }

  emitConfig(): void {
    this.configChange.emit({
      learningType: this.learningType,
      algorithm: this.selectedAlgorithmCode,
      dataset: this.dataset,
      params: { ...this.params }
    });
  }

  private resetParams(): void {
    this.params = {};
    for (const param of this.currentAlgorithm?.params ?? []) {
      this.params[param.key] = param.default;
    }
  }
}
