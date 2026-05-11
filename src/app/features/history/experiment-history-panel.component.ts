import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ExperimentRecord } from '../../core/models/platform.models';

@Component({
  selector: 'app-experiment-history-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h2>实验历史</h2>
          <p>查询并回填当前登录用户保存过的实验配置。</p>
        </div>
        <button type="button" (click)="refreshRequested.emit()" [disabled]="loading">刷新</button>
      </div>

      <p class="empty" *ngIf="!loading && experiments.length === 0">当前用户还没有保存过实验。</p>
      <p class="empty" *ngIf="loading">正在加载实验历史...</p>

      <div class="history-list" *ngIf="experiments.length > 0">
        <article class="history-item" *ngFor="let item of experiments">
          <div>
            <h3>{{ item.name }}</h3>
            <p>{{ item.algorithmCode }} / {{ item.datasetCode }}</p>
            <small>{{ item.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</small>
          </div>
          <button type="button" class="primary" (click)="loadRequested.emit(item)">载入配置</button>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .card { background: rgba(255,255,255,0.94); border-radius: 24px; padding: 24px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08); border: 1px solid rgba(255,255,255,0.8); }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    h2, h3 { margin: 0; }
    .card-header p, .history-item p, .history-item small, .empty { color: #64748b; }
    .history-list { display: grid; gap: 12px; }
    .history-item { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 16px 18px; border-radius: 18px; background: linear-gradient(180deg, #f8fbff, #f8fafc); border: 1px solid #e2e8f0; }
    button { border: 0; border-radius: 14px; padding: 12px 16px; background: #e2e8f0; color: #0f172a; font-weight: 700; cursor: pointer; }
    button.primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; box-shadow: 0 16px 26px rgba(37, 99, 235, 0.16); }
  `]
})
export class ExperimentHistoryPanelComponent {
  @Input() experiments: ExperimentRecord[] = [];
  @Input() loading = false;
  @Output() readonly refreshRequested = new EventEmitter<void>();
  @Output() readonly loadRequested = new EventEmitter<ExperimentRecord>();
}
