import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ExperimentCase } from '../../core/models/platform.models';

const learningTypeLabels: Record<string, string> = {
  supervised: '监督学习',
  unsupervised: '无监督学习',
  reinforcement: '强化学习'
};

@Component({
  selector: 'app-experiment-case-library-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="case-card">
      <div class="case-header">
        <div>
          <h2>实验案例库</h2>
          <p>选择一个预设案例，自动回填算法、数据集与参数，再进入训练控制区观察指标和模型解释。</p>
        </div>
        <span class="badge">{{ cases.length }} 个案例</span>
      </div>

      <p class="empty" *ngIf="loading">正在加载实验案例库...</p>
      <p class="empty" *ngIf="!loading && cases.length === 0">暂无可用预设案例。</p>

      <div class="case-grid" *ngIf="cases.length > 0">
        <article class="case-item" *ngFor="let item of cases">
          <div class="case-title">
            <span>{{ labelFor(item.learningType) }}</span>
            <strong>{{ item.title }}</strong>
          </div>

          <p class="description">{{ item.description }}</p>

          <div class="meta-row">
            <span>算法：{{ item.algorithmCode }}</span>
            <span>数据集：{{ item.datasetCode }}</span>
          </div>

          <div class="guide-block">
            <strong>操作步骤</strong>
            <p>{{ item.guideText }}</p>
          </div>

          <div class="guide-block expected">
            <strong>预期观察</strong>
            <p>{{ item.expectedResult }}</p>
          </div>

          <button type="button" (click)="loadRequested.emit(item)">载入案例</button>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .case-card {
      background: rgba(255,255,255,0.94);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(255,255,255,0.8);
    }
    .case-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    h2 {
      margin: 0 0 8px;
      color: #0f172a;
      font-size: 24px;
    }
    p {
      margin: 0;
      color: #64748b;
      line-height: 1.7;
    }
    .badge {
      flex: 0 0 auto;
      padding: 8px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      color: #2563eb;
      font-size: 12px;
      font-weight: 800;
    }
    .case-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .case-item {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 430px;
      padding: 18px;
      border-radius: 20px;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
      border: 1px solid #e2e8f0;
    }
    .case-title {
      display: grid;
      gap: 8px;
    }
    .case-title span {
      width: fit-content;
      padding: 6px 10px;
      border-radius: 999px;
      background: #ecfeff;
      color: #0f766e;
      font-size: 12px;
      font-weight: 800;
    }
    .case-title strong {
      color: #0f172a;
      font-size: 18px;
      line-height: 1.35;
    }
    .description {
      min-height: 56px;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .meta-row span {
      padding: 8px 10px;
      border-radius: 12px;
      background: #ffffff;
      color: #334155;
      border: 1px solid #e2e8f0;
      font-size: 12px;
      font-weight: 800;
    }
    .guide-block {
      display: grid;
      gap: 6px;
      padding: 13px;
      border-radius: 16px;
      background: rgba(255,255,255,0.82);
      border: 1px solid #e2e8f0;
    }
    .guide-block strong {
      color: #334155;
      font-size: 13px;
    }
    .guide-block p {
      font-size: 13px;
    }
    .guide-block.expected {
      background: linear-gradient(180deg, #f0fdf4, #ffffff);
      border-color: #bbf7d0;
    }
    button {
      margin-top: auto;
      border: 0;
      border-radius: 16px;
      padding: 13px 16px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 16px 28px rgba(37, 99, 235, 0.18);
    }
    .empty {
      padding: 18px;
      border-radius: 18px;
      background: linear-gradient(180deg, #f8fbff, #f8fafc);
      border: 1px dashed #cbd5e1;
    }
    @media (max-width: 640px) {
      .case-header {
        flex-direction: column;
      }
    }
  `]
})
export class ExperimentCaseLibraryPanelComponent {
  @Input() cases: ExperimentCase[] = [];
  @Input() loading = false;
  @Output() readonly loadRequested = new EventEmitter<ExperimentCase>();

  labelFor(learningType: string): string {
    return learningTypeLabels[learningType] ?? learningType;
  }
}
