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
        <div class="hero-copy">
          <span class="eyebrow">课程实验工作台</span>
          <h1>机器学习可视化学习平台</h1>
          <p>支持实验配置、训练控制、图形化展示与实验历史管理，适用于课程演示、算法实验和小组协作开发。</p>
          <div class="hero-points">
            <span>动态参数配置</span>
            <span>单步训练演示</span>
            <span>训练曲线可视化</span>
          </div>
        </div>
        <div class="hero-badges">
          <span>Angular 前端</span>
          <span>Spring Boot + MyBatis</span>
          <span>Python / FastAPI</span>
        </div>
      </section>

      <section class="overview-grid">
        <article class="overview-card">
          <strong>{{ algorithms.length || 0 }}</strong>
          <span>已接入算法</span>
        </article>
        <article class="overview-card">
          <strong>{{ datasets.length || 0 }}</strong>
          <span>可用数据集</span>
        </article>
        <article class="overview-card">
          <strong>{{ experimentHistory.length || 0 }}</strong>
          <span>实验记录</span>
        </article>
        <article class="overview-card">
          <strong>{{ latestSessionId ? '在线' : '待启动' }}</strong>
          <span>训练会话</span>
        </article>
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
    .page { display: flex; flex-direction: column; gap: 24px; padding: 32px 40px 72px; max-width: 1320px; margin: 0 auto; }
    .hero {
      display: flex;
      justify-content: space-between;
      gap: 28px;
      align-items: flex-start;
      padding: 34px 36px;
      border-radius: 28px;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78)),
        linear-gradient(135deg, #dbeafe, #ecfeff);
      border: 1px solid rgba(255,255,255,0.7);
      box-shadow: 0 28px 60px rgba(30, 41, 59, 0.08);
      backdrop-filter: blur(10px);
    }
    .hero-copy { max-width: 760px; }
    .eyebrow {
      display: inline-flex;
      margin-bottom: 14px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.06);
      color: #0f172a;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }
    .hero h1 { margin: 0 0 12px; font-size: 38px; line-height: 1.15; color: #0f172a; }
    .hero p { margin: 0; color: #475569; max-width: 760px; font-size: 17px; line-height: 1.75; }
    .hero-points { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .hero-points span {
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(255,255,255,0.7);
      color: #1e293b;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid rgba(148, 163, 184, 0.16);
    }
    .hero-badges { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-end; }
    .hero-badges span {
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.92);
      color: #0f172a;
      font-size: 12px;
      font-weight: 800;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    }
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }
    .overview-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 20px 22px;
      border-radius: 22px;
      background: rgba(255,255,255,0.88);
      border: 1px solid rgba(255,255,255,0.8);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
    }
    .overview-card strong {
      font-size: 28px;
      line-height: 1;
      color: #0f172a;
    }
    .overview-card span {
      color: #64748b;
      font-weight: 600;
    }
    .workspace-grid { display: grid; grid-template-columns: minmax(0, 1.9fr) minmax(340px, 1fr); gap: 22px; align-items: start; }
    .card {
      background: rgba(255,255,255,0.92);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(255,255,255,0.7);
      backdrop-filter: blur(10px);
    }
    .side-card {
      position: sticky;
      top: 24px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96)),
        #fff;
    }
    .card-header { margin-bottom: 16px; }
    .card-header h2 { margin: 0 0 8px; }
    .card-header p { margin: 0; color: #64748b; }
    .field { display: flex; flex-direction: column; gap: 8px; font-weight: 700; color: #334155; }
    .field input {
      border: 1px solid #d7e1f0;
      border-radius: 16px;
      padding: 13px 14px;
      background: rgba(255,255,255,0.96);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      margin: 18px 0;
      padding: 16px;
      border-radius: 18px;
      background: linear-gradient(180deg, #f8fbff, #f8fafc);
      border: 1px solid #e2e8f0;
    }
    .summary-grid strong { display: block; font-size: 12px; color: #64748b; }
    .summary-grid span { display: block; margin-top: 4px; font-weight: 600; word-break: break-all; }
    button.primary {
      border: 0;
      border-radius: 16px;
      padding: 14px 18px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      box-shadow: 0 18px 30px rgba(37, 99, 235, 0.22);
    }
    button.primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .hint { margin: 12px 0 0; color: #64748b; min-height: 20px; line-height: 1.6; }
    @media (max-width: 980px) {
      .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .workspace-grid { grid-template-columns: 1fr; }
      .hero { flex-direction: column; }
      .side-card { position: static; }
      .page { padding: 24px 18px 56px; }
      .hero { padding: 28px 22px; }
      .hero h1 { font-size: 30px; }
    }
    @media (max-width: 640px) {
      .overview-grid { grid-template-columns: 1fr; }
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
