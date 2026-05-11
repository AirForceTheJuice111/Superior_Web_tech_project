import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';

import { AlgorithmMeta, ExperimentConfig, ExperimentRecord, LearningType, ParamValue, TrainingSessionSummary, UserProfile } from '../../core/models/platform.models';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { ExperimentApiService } from '../../core/services/experiment-api.service';
import { LoginPanelComponent } from '../auth/login-panel.component';
import { ExperimentConfigPanelComponent } from '../config/experiment-config-panel.component';
import { ExperimentHistoryPanelComponent } from '../history/experiment-history-panel.component';
import { TrainingControlPanelComponent } from '../training/training-control-panel.component';

@Component({
  selector: 'app-workbench-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoginPanelComponent,
    ExperimentConfigPanelComponent,
    ExperimentHistoryPanelComponent,
    TrainingControlPanelComponent
  ],
  template: `
    <main class="page">
      <section class="hero">
        <div>
          <h1>机器学习可视化学习平台</h1>
          <p>第二轮重构已切换到课程项目常见分层：MyBatis 元数据 + Angular feature 结构 + 实验保存与历史查询。</p>
        </div>
        <div class="hero-badges">
          <span>Angular Features</span>
          <span>Spring Boot + MyBatis</span>
          <span>FastAPI 训练服务</span>
        </div>
      </section>

      <app-login-panel
        [user]="currentUser"
        (loginSuccess)="handleLogin($event)"
        (logout)="handleLogout()"
      ></app-login-panel>

      <section class="workspace-grid">
        <app-experiment-config-panel
          [algorithms]="algorithms"
          [datasets]="datasets"
          [loading]="catalogLoading"
          [selectedConfig]="activeConfig"
          (configChange)="handleConfigChange($event)"
        ></app-experiment-config-panel>

        <section class="card side-card">
          <div class="card-header">
            <div>
              <h2>实验保存</h2>
              <p>当前配置与最近一次训练 Session 一起写入数据库。</p>
            </div>
          </div>

          <label class="field">
            <span>实验名称</span>
            <input type="text" [(ngModel)]="experimentName" placeholder="例如：Iris SVM 分类演示" />
          </label>

          <div class="summary-grid">
            <div>
              <strong>已登录用户</strong>
              <span>{{ currentUser?.displayName || '未登录' }}</span>
            </div>
            <div>
              <strong>最近 Session</strong>
              <span>{{ latestSessionId || '暂无' }}</span>
            </div>
          </div>

          <button class="primary" type="button" (click)="saveExperiment()" [disabled]="saveLoading || !canSaveExperiment">
            {{ saveLoading ? '保存中...' : '保存实验' }}
          </button>
          <p class="hint">{{ saveMessage }}</p>
        </section>
      </section>

      <app-experiment-history-panel
        [experiments]="experimentHistory"
        [loading]="historyLoading"
        (refreshRequested)="loadHistory()"
        (loadRequested)="applyHistory($event)"
      ></app-experiment-history-panel>

      <app-training-control-panel
        [config]="activeConfig"
        (sessionChange)="handleSessionChange($event)"
      ></app-training-control-panel>
    </main>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 24px; padding: 32px 40px 60px; max-width: 1280px; margin: 0 auto; }
    .hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding: 28px 32px; border-radius: 24px; background: linear-gradient(135deg, #eff6ff, #ecfeff); }
    .hero h1 { margin: 0 0 10px; font-size: 32px; }
    .hero p { margin: 0; color: #475569; max-width: 760px; }
    .hero-badges { display: flex; flex-wrap: wrap; gap: 10px; }
    .hero-badges span { padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.9); color: #0f172a; font-size: 12px; font-weight: 700; }
    .workspace-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 20px; align-items: start; }
    .card { background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .card-header { margin-bottom: 16px; }
    .card-header h2 { margin: 0 0 8px; }
    .card-header p { margin: 0; color: #64748b; }
    .field { display: flex; flex-direction: column; gap: 8px; font-weight: 600; color: #334155; }
    .field input { border: 1px solid #dbe2ea; border-radius: 12px; padding: 10px 12px; }
    .summary-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin: 16px 0; padding: 12px; border-radius: 14px; background: #f8fafc; }
    .summary-grid strong { display: block; font-size: 12px; color: #64748b; }
    .summary-grid span { display: block; margin-top: 4px; font-weight: 600; word-break: break-all; }
    button.primary { border: 0; border-radius: 12px; padding: 12px 16px; background: #2563eb; color: #fff; font-weight: 600; cursor: pointer; width: 100%; }
    button.primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .hint { margin: 12px 0 0; color: #64748b; min-height: 20px; }
    @media (max-width: 980px) {
      .workspace-grid { grid-template-columns: 1fr; }
      .hero { flex-direction: column; }
    }
  `]
})
export class WorkbenchPageComponent implements OnInit, OnDestroy {
  algorithms: AlgorithmMeta[] = [];
  datasets: Array<{ id: number; code: string; name: string; description: string; taskType: string; sourceType: string; featureCount: number; sampleCount: number; labelColumn: string | null; }> = [];
  activeConfig: ExperimentConfig | null = null;
  currentUser: UserProfile | null = null;
  experimentHistory: ExperimentRecord[] = [];
  experimentName = '';
  latestSessionId = '';
  saveMessage = '登录后可将当前配置保存到 experiment 表。';
  catalogLoading = true;
  historyLoading = false;
  saveLoading = false;

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly catalogApi: CatalogApiService,
    private readonly experimentApi: ExperimentApiService
  ) {}

  get canSaveExperiment(): boolean {
    return !!this.currentUser && !!this.activeConfig && this.experimentName.trim().length > 0;
  }

  ngOnInit(): void {
    this.loadCatalogs();
  }

  handleLogin(user: UserProfile): void {
    this.currentUser = user;
    this.saveMessage = `欢迎回来，${user.displayName}。`;
    this.loadHistory();
  }

  handleLogout(): void {
    this.currentUser = null;
    this.experimentHistory = [];
    this.saveMessage = '已退出登录。';
  }

  handleConfigChange(config: ExperimentConfig): void {
    this.activeConfig = config;
    if (!this.experimentName.trim()) {
      this.experimentName = this.buildExperimentName(config);
    }
  }

  handleSessionChange(session: TrainingSessionSummary): void {
    this.latestSessionId = session.sessionId;
    if (session.status === 'completed') {
      this.saveMessage = `训练已完成，可将 Session ${session.sessionId} 保存为实验记录。`;
    }
  }

  loadHistory(): void {
    if (!this.currentUser) {
      return;
    }

    this.historyLoading = true;
    const sub = this.experimentApi.listHistory(this.currentUser.userId).subscribe({
      next: (history) => {
        this.experimentHistory = history;
      },
      error: (error: unknown) => {
        this.saveMessage = error instanceof Error ? error.message : '实验历史加载失败';
        this.historyLoading = false;
      },
      complete: () => {
        this.historyLoading = false;
      }
    });
    this.subscriptions.add(sub);
  }

  saveExperiment(): void {
    if (!this.currentUser || !this.activeConfig) {
      return;
    }

    this.saveLoading = true;
    const payload = {
      userId: this.currentUser.userId,
      name: this.experimentName.trim(),
      learningType: this.activeConfig.learningType,
      algorithmCode: this.activeConfig.algorithm,
      datasetCode: this.activeConfig.dataset,
      latestSessionId: this.latestSessionId || undefined,
      config: {
        learningType: this.activeConfig.learningType,
        algorithm: this.activeConfig.algorithm,
        dataset: this.activeConfig.dataset,
        params: this.activeConfig.params
      }
    };

    const sub = this.experimentApi.saveExperiment(payload).subscribe({
      next: (record) => {
        this.saveMessage = `实验 ${record.name} 已保存。`;
        this.experimentHistory = [record, ...this.experimentHistory];
      },
      error: (error: unknown) => {
        this.saveMessage = error instanceof Error ? error.message : '实验保存失败';
        this.saveLoading = false;
      },
      complete: () => {
        this.saveLoading = false;
      }
    });
    this.subscriptions.add(sub);
  }

  applyHistory(record: ExperimentRecord): void {
    const config = record.config;
    const params = this.readParams(config['params']);
    const learningType = (typeof config['learningType'] === 'string' ? config['learningType'] : record.learningType) as LearningType;
    const algorithm = typeof config['algorithm'] === 'string' ? config['algorithm'] : record.algorithmCode;
    const dataset = typeof config['dataset'] === 'string' ? config['dataset'] : record.datasetCode;

    this.activeConfig = {
      learningType,
      algorithm,
      dataset,
      params
    };
    this.experimentName = record.name;
    this.latestSessionId = record.latestSessionId ?? '';
    this.saveMessage = `已载入实验 ${record.name} 的配置。`;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadCatalogs(): void {
    this.catalogLoading = true;
    const sub = forkJoin({
      algorithms: this.catalogApi.listAlgorithms(),
      datasets: this.catalogApi.listDatasets()
    }).subscribe({
      next: ({ algorithms, datasets }) => {
        this.algorithms = algorithms;
        this.datasets = datasets;
      },
      error: (error: unknown) => {
        this.saveMessage = error instanceof Error ? error.message : '元数据加载失败';
        this.catalogLoading = false;
      },
      complete: () => {
        this.catalogLoading = false;
      }
    });
    this.subscriptions.add(sub);
  }

  private buildExperimentName(config: ExperimentConfig): string {
    return `${config.dataset} - ${config.algorithm} 实验`;
  }

  private readParams(raw: unknown): Record<string, ParamValue> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }

    const result: Record<string, ParamValue> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      }
    }
    return result;
  }
}
