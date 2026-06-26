import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';

import { AlgorithmMeta, ChatMessage, CustomDatasetPayload, DatasetMeta, ExperimentCase, ExperimentConfig, ExperimentRecord, LearningType, ParamValue, QuizOverviewItem, QuizQuestion, QuizSubmitDetail, QuizSubmitResult, TrainingSessionSummary, UserProfile } from '../../core/models/platform.models';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { QuizApiService } from '../../core/services/quiz-api.service';
import { ChatSocketService } from '../../core/services/chat-socket.service';
import { ExperimentContextService } from '../../core/services/experiment-context.service';
import { ExperimentCaseApiService } from '../../core/services/experiment-case-api.service';
import { ExperimentApiService } from '../../core/services/experiment-api.service';
import { AuthApiService } from '../../core/services/auth-api.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { LoginPanelComponent } from '../auth/login-panel.component';
import { ExperimentCaseLibraryPanelComponent } from '../cases/experiment-case-library-panel.component';
import { AlgorithmComparisonPanelComponent } from '../comparison/algorithm-comparison-panel.component';
import { ExperimentConfigPanelComponent } from '../config/experiment-config-panel.component';
import { ExperimentHistoryPanelComponent } from '../history/experiment-history-panel.component';
import { TrainingControlPanelComponent } from '../training/training-control-panel.component';

type PageKey = 'home' | 'auth' | 'dashboard' | 'paths' | 'theory' | 'lab' | 'analysis' | 'datasets' | 'quiz' | 'chat' | 'profile';
type AuthMode = 'login' | 'register';

interface NavItem {
  key: PageKey;
  label: string;
  eyebrow: string;
  icon: string;
}

interface PageMeta {
  eyebrow: string;
  title: string;
  description: string;
}

interface PathNode {
  id: string;
  title: string;
  description: string;
  prerequisites: string[];
  experiment: string;
  practice: string;
}

interface PathGroup {
  title: string;
  nodes: PathNode[];
}

interface PracticeItem {
  title: string;
  level: string;
  description: string;
  tags: string[];
}

const learningTypeLabels: Record<string, string> = {
  supervised: '监督学习',
  unsupervised: '无监督学习',
  reinforcement: '强化学习'
};

@Component({
  selector: 'app-workbench-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoginPanelComponent,
    AlgorithmComparisonPanelComponent,
    ExperimentCaseLibraryPanelComponent,
    ExperimentConfigPanelComponent,
    ExperimentHistoryPanelComponent,
    TrainingControlPanelComponent
  ],
  template: `
    <ng-container *ngIf="activePage === 'home'; else nonPublicPage">
      <main class="public-page">
        <section class="landing-hero">
          <nav class="landing-nav" aria-label="公开首页导航">
            <button class="landing-brand" type="button" (click)="setPage('home')">
              <span>ML</span>
              <strong>机器学习可视化学习平台</strong>
            </button>
            <button class="ghost-action" type="button" (click)="setPage('auth')">登录 / 注册</button>
          </nav>

          <div class="landing-copy">
            <span class="eyebrow">Interactive ML Learning</span>
            <h1>交互式机器学习可视化学习平台</h1>
            <p>通过可视化实验理解监督学习、无监督学习、强化学习，让抽象算法变成可观察、可调整、可复盘的学习过程。</p>
            <button class="primary-action large" type="button" (click)="beginLearning()">开始学习</button>
          </div>
        </section>

        <section class="public-section">
          <div class="section-heading">
            <span>Why this platform</span>
            <h2>平台介绍</h2>
            <p>这个平台面向课程实验和教学演示：学生可以沿着知识路径学习算法，再进入实验室修改参数、观察曲线与可视化结果，最后保存实验记录用于复盘。</p>
          </div>

          <div class="public-feature-grid">
            <article>
              <span>01</span>
              <h3>可视化理解算法</h3>
              <p>用散点图、决策边界、聚类中心、训练曲线帮助理解模型如何学习。</p>
            </article>
            <article>
              <span>02</span>
              <h3>实验驱动学习</h3>
              <p>围绕算法、数据集和参数配置组织训练流程，适合课堂演示和课后练习。</p>
            </article>
            <article>
              <span>03</span>
              <h3>记录与复盘</h3>
              <p>登录后可以保存实验，回看历史配置，并比较不同模型的训练表现。</p>
            </article>
          </div>
        </section>

        <footer class="public-footer">
          <button type="button" (click)="setPage('home')">关于平台</button>
          <span>联系方式：course&#64;example.com</span>
          <span>课程说明：高级 Web 技术课程项目</span>
        </footer>
      </main>
    </ng-container>

    <ng-template #nonPublicPage>
      <ng-container *ngIf="activePage === 'auth'; else appShell">
        <main class="auth-page">
          <button class="auth-brand" type="button" (click)="setPage('home')">
            <span>ML</span>
            <strong>机器学习可视化学习平台</strong>
          </button>

          <section class="auth-shell">
            <div class="auth-intro">
              <span class="eyebrow">Account</span>
              <h1>开始你的机器学习实验旅程</h1>
              <p>登录后进入学习仪表盘，继续课程路径、算法实验室和实验记录复盘。</p>
            </div>

            <div class="auth-card">
              <div class="auth-tabs" role="tablist" aria-label="登录注册切换">
                <button type="button" [class.active]="authMode === 'login'" (click)="authMode = 'login'">登录</button>
                <button type="button" [class.active]="authMode === 'register'" (click)="authMode = 'register'">注册</button>
              </div>

              <ng-container *ngIf="authMode === 'login'; else registerPanel">
                <app-login-panel
                  [user]="currentUser"
                  (loginSuccess)="handleLogin($event)"
                  (logout)="handleLogout()"
                ></app-login-panel>
                <div class="auth-links">
                  <button type="button" (click)="forgotMessage = '当前项目暂未接入找回密码接口，请使用演示账号 student / 123456。'">忘记密码</button>
                  <button type="button" (click)="authMode = 'register'">跳转注册</button>
                </div>
                <p class="hint" *ngIf="forgotMessage">{{ forgotMessage }}</p>
              </ng-container>

              <ng-template #registerPanel>
                <form class="register-form" (ngSubmit)="handleRegister()">
                  <label>
                    <span>用户名</span>
                    <input type="text" name="registerUsername" [(ngModel)]="registerUsername" placeholder="请输入用户名" />
                  </label>
                  <label>
                    <span>邮箱</span>
                    <input type="email" name="registerEmail" [(ngModel)]="registerEmail" placeholder="name&#64;example.com" />
                  </label>
                  <label>
                    <span>密码</span>
                    <input type="password" name="registerPassword" [(ngModel)]="registerPassword" placeholder="请输入密码" />
                  </label>
                  <label>
                    <span>确认密码</span>
                    <input type="password" name="registerPasswordConfirm" [(ngModel)]="registerPasswordConfirm" placeholder="再次输入密码" />
                  </label>
                  <button class="primary-action full" type="submit">注册</button>
                </form>
                <div class="auth-links">
                  <button type="button" (click)="authMode = 'login'">已有账号？返回登录</button>
                </div>
                <p class="hint">{{ registerMessage || '注册界面已展示；后端注册接口暂未接入，当前可使用演示账号登录。' }}</p>
              </ng-template>
            </div>
          </section>
        </main>
      </ng-container>
    </ng-template>

    <ng-template #appShell>
      <div class="learning-shell" [class.sidebar-collapsed]="sidebarCollapsed" [class.lab-shell]="activePage === 'lab'">
        <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
          <div class="sidebar-top">
            <button
              class="sidebar-brand"
              type="button"
              (click)="setPage('dashboard')"
              [attr.title]="sidebarCollapsed ? '学习中心' : null"
              [attr.aria-label]="sidebarCollapsed ? '打开学习中心' : '学习中心'"
            >
              <span class="brand-mark">ML</span>
              <strong>学习中心</strong>
            </button>
            <button
              class="sidebar-toggle"
              type="button"
              (click)="toggleSidebar()"
              [attr.aria-label]="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
              [attr.title]="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
            >
              <span aria-hidden="true">{{ sidebarCollapsed ? '›' : '‹' }}</span>
            </button>
          </div>

          <nav class="sidebar-nav" aria-label="学习平台侧边栏">
            <button
              *ngFor="let item of appNavItems"
              type="button"
              [class.active]="activePage === item.key"
              [attr.title]="sidebarCollapsed ? item.label : null"
              [attr.aria-label]="item.label"
              (click)="setPage(item.key)"
            >
              <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
              <span class="nav-copy">
                <span>{{ item.label }}</span>
                <small>{{ item.eyebrow }}</small>
              </span>
            </button>
          </nav>

          <div class="sidebar-user" [attr.title]="currentUser?.displayName || '访客用户'">
            <span class="user-avatar" aria-hidden="true">{{ userInitial }}</span>
            <div class="sidebar-user-copy">
              <strong>{{ currentUser?.displayName || '访客用户' }}</strong>
              <span>{{ currentUser ? '已登录，可保存实验' : '登录后解锁实验保存' }}</span>
            </div>
            <button type="button" (click)="currentUser ? handleLogout() : setPage('auth')">
              <span class="expanded-label">{{ currentUser ? '退出登录' : '去登录' }}</span>
              <span class="collapsed-label" aria-hidden="true">{{ currentUser ? '退' : '入' }}</span>
            </button>
          </div>
        </aside>

        <main class="app-main">
          <header class="app-header">
            <div>
              <span class="eyebrow">{{ currentPageMeta.eyebrow }}</span>
              <h1>{{ currentPageMeta.title }}</h1>
              <p>{{ currentPageMeta.description }}</p>
            </div>
            <button class="ghost-action" type="button" (click)="setPage('home')">返回公开首页</button>
          </header>

          <ng-container [ngSwitch]="activePage">
            <section *ngSwitchCase="'dashboard'" class="dashboard-page">
              <section class="dashboard-welcome">
                <div>
                  <span>欢迎回来，{{ currentUser?.displayName || '学习者' }}</span>
                  <h2>今日推荐学习任务</h2>
                  <p>{{ todayTask }}</p>
                </div>
                <button class="primary-action" type="button" (click)="setPage('lab')">继续实验</button>
              </section>

              <div class="dashboard-layout">
                <div class="dashboard-main">
                  <section class="progress-grid">
                    <article>
                      <strong>{{ completedCourseCount }}</strong>
                      <span>已完成课程数</span>
                    </article>
                    <article>
                      <strong>{{ completedExperimentCount }}</strong>
                      <span>已完成实验数</span>
                    </article>
                    <article>
                      <strong>{{ practiceAccuracy }}</strong>
                      <span>练习正确率</span>
                    </article>
                    <article>
                      <strong>{{ currentLevel }}</strong>
                      <span>当前学习等级</span>
                    </article>
                  </section>

                  <section class="content-card">
                    <div class="section-heading compact">
                      <span>Continue</span>
                      <h2>继续学习</h2>
                    </div>
                    <div class="continue-grid">
                      <article>
                        <small>上次学习的算法</small>
                        <strong>{{ selectedAlgorithmName }}</strong>
                        <p>{{ selectedAlgorithmName === '未选择' ? '进入算法实验室选择一个算法开始训练。' : '可以继续调整参数，观察训练曲线变化。' }}</p>
                      </article>
                      <article>
                        <small>上次运行的实验</small>
                        <strong>{{ latestSessionId || '暂无训练 Session' }}</strong>
                        <p>{{ latestSessionId ? '可前往结果分析页复盘模型表现。' : '初始化训练后会在这里显示最近 Session。' }}</p>
                      </article>
                      <article>
                        <small>推荐下一节内容</small>
                        <strong>{{ recommendedNextLesson }}</strong>
                        <p>结合当前进度，建议先完成一个可视化实验再做练习。</p>
                      </article>
                    </div>
                  </section>

                  <section class="content-card">
                    <div class="section-heading compact">
                      <span>Records</span>
                      <h2>最近实验记录</h2>
                    </div>
                    <div class="record-table" *ngIf="experimentHistory.length > 0; else emptyRecords">
                      <div class="record-row header">
                        <span>算法</span>
                        <span>数据集</span>
                        <span>参数</span>
                        <span>准确率</span>
                        <span>时间</span>
                        <span>操作</span>
                      </div>
                      <div class="record-row" *ngFor="let item of recentExperiments">
                        <strong>{{ item.algorithmCode }}</strong>
                        <span>{{ item.datasetCode }}</span>
                        <span>{{ formatRecordParams(item) }}</span>
                        <span>--</span>
                        <span>{{ item.createdAt | date:'MM-dd HH:mm' }}</span>
                        <button type="button" (click)="applyHistory(item)">查看详情</button>
                      </div>
                    </div>
                    <ng-template #emptyRecords>
                      <p class="empty-state">暂无保存的实验。完成训练后，可在算法实验室保存到实验记录。</p>
                    </ng-template>
                  </section>
                </div>

                <aside class="dashboard-side">
                  <section class="content-card">
                    <h3>学习日历</h3>
                    <div class="calendar-grid">
                      <span *ngFor="let day of calendarDays" [class.active]="day.active">{{ day.label }}</span>
                    </div>
                  </section>
                  <section class="content-card">
                    <h3>成就徽章</h3>
                    <div class="badge-list">
                      <span *ngFor="let badge of achievementBadges">{{ badge }}</span>
                    </div>
                  </section>
                  <section class="content-card">
                    <h3>薄弱知识点提醒</h3>
                    <ul class="weak-list">
                      <li *ngFor="let point of weakPoints">{{ point }}</li>
                    </ul>
                  </section>
                </aside>
              </div>
            </section>

            <section *ngSwitchCase="'paths'" class="paths-page">
              <section class="path-header">
                <span class="eyebrow">Knowledge Map</span>
                <h2>机器学习入门路线</h2>
                <p>按知识依赖组织路线：先理解数据、特征、损失函数与评估，再进入监督学习、无监督学习和强化学习。</p>
              </section>

              <div class="path-layout">
                <section class="path-tree-card">
                  <div class="path-group" *ngFor="let group of pathGroups">
                    <h3>{{ group.title }}</h3>
                    <div class="tree-list">
                      <button
                        *ngFor="let node of group.nodes"
                        type="button"
                        [class.active]="selectedPathNode.id === node.id"
                        (click)="selectPathNode(node)"
                      >
                        {{ node.title }}
                      </button>
                    </div>
                  </div>
                </section>

                <aside class="path-detail-card">
                  <span class="eyebrow">当前节点</span>
                  <h2>{{ selectedPathNode.title }}</h2>
                  <p>{{ selectedPathNode.description }}</p>

                  <div class="detail-block">
                    <strong>学习前置知识</strong>
                    <ul>
                      <li *ngFor="let item of selectedPathNode.prerequisites">{{ item }}</li>
                    </ul>
                  </div>
                  <div class="detail-block">
                    <strong>推荐实验</strong>
                    <p>{{ selectedPathNode.experiment }}</p>
                  </div>
                  <div class="detail-block">
                    <strong>相关练习</strong>
                    <p>{{ selectedPathNode.practice }}</p>
                  </div>
                  <div class="path-actions">
                    <button class="primary-action" type="button" (click)="setPage('lab')">进入推荐实验</button>
                    <button class="ghost-action" type="button" (click)="openRelatedQuiz(selectedPathNode)">查看相关练习</button>
                  </div>
                </aside>
              </div>

              <app-experiment-case-library-panel
                [cases]="experimentCases"
                [loading]="caseLoading"
                (loadRequested)="applyCaseAndOpenLab($event)"
              ></app-experiment-case-library-panel>
            </section>

            <section *ngSwitchCase="'theory'" class="theory-page">
              <section class="content-card">
                <div class="section-heading">
                  <span>Theory</span>
                  <h2>算法教学与理论速览</h2>
                  <p>把算法按学习类型组织成卡片，先看任务目标、适用场景和参数，再进入实验室调参。</p>
                </div>

                <p class="empty-state" *ngIf="catalogLoading">正在加载算法元数据...</p>
                <div class="algorithm-group" *ngFor="let group of algorithmGroups">
                  <div class="group-title">
                    <span>{{ group.label }}</span>
                    <small>{{ group.items.length }} 个算法</small>
                  </div>
                  <div class="algorithm-grid">
                    <article class="algorithm-card" *ngFor="let algorithm of group.items">
                      <span>{{ algorithm.code }}</span>
                      <h3>{{ algorithm.name }}</h3>
                      <p>{{ algorithm.description }}</p>
                      <div class="param-row">
                        <small>{{ algorithm.paramsSchema.length }} 个可调参数</small>
                        <button type="button" (click)="setPage('lab')">去实验</button>
                      </div>
                    </article>
                  </div>
                </div>
              </section>
            </section>

            <section *ngSwitchCase="'lab'" class="lab-page">
              <div class="lab-mode-tabs">
                <button type="button" [class.active]="labMode === 'single'" (click)="labMode = 'single'">单算法演示</button>
                <button type="button" [class.active]="labMode === 'compare'" (click)="labMode = 'compare'">算法对比</button>
              </div>

              <ng-container *ngIf="labMode === 'single'">
              <section class="lab-top">
                <label>
                  <span>实验名称</span>
                  <input type="text" [(ngModel)]="experimentName" placeholder="例如：Iris SVM 分类演示" />
                </label>
                <div>
                  <span>算法类型</span>
                  <strong>{{ selectedLearningTypeLabel }}</strong>
                </div>
                <button class="primary-action" type="button" (click)="saveExperiment()" [disabled]="saveLoading || !canSaveExperiment">
                  {{ saveLoading ? '保存中...' : '保存实验' }}
                </button>
              </section>

              <section class="lab-grid">
                <aside class="lab-config">
                  <div class="lab-panel-title">
                    <span>左侧配置区</span>
                    <h2>算法、数据集与参数设置</h2>
                  </div>
                  <app-experiment-config-panel
                    [algorithms]="algorithms"
                    [datasets]="datasets"
                    [loading]="catalogLoading"
                    [selectedConfig]="activeConfig"
                    (configChange)="handleConfigChange($event)"
                    (datasetSaved)="reloadDatasets()"
                  ></app-experiment-config-panel>
                </aside>

                <section class="lab-visual">
                  <div class="lab-panel-title">
                    <span>中间可视化区</span>
                    <h2>训练过程、分布图与曲线</h2>
                  </div>
                  <app-training-control-panel
                    [config]="activeConfig"
                    (sessionChange)="handleSessionChange($event)"
                  ></app-training-control-panel>
                </section>

                <aside class="lab-explain">
                  <div class="lab-panel-title">
                    <span>右侧解释区</span>
                    <h2>参数含义与系统提示</h2>
                  </div>
                  <section class="content-card">
                    <h3>当前参数含义</h3>
                    <p>{{ currentParameterExplanation }}</p>
                  </section>
                  <section class="content-card">
                    <h3>训练过程解释</h3>
                    <p>初始化后，系统会按步调用训练接口，更新模型参数、可视化数据、Loss 曲线和指标面板。</p>
                  </section>
                  <section class="content-card">
                    <h3>模型输出解释</h3>
                    <p>{{ currentOutputExplanation }}</p>
                  </section>
                  <section class="content-card tip-card">
                    <h3>系统提示</h3>
                    <ul>
                      <li>学习率过大可能导致损失震荡。</li>
                      <li>K 值过小可能导致聚类过粗。</li>
                      <li>训练步数过少时，指标可能尚未稳定。</li>
                    </ul>
                  </section>
                </aside>
              </section>

              <section class="lab-results">
                <article>
                  <strong>{{ latestSessionId || '暂无' }}</strong>
                  <span>Session</span>
                </article>
                <article>
                  <strong>{{ selectedAlgorithmName }}</strong>
                  <span>当前算法</span>
                </article>
                <article>
                  <strong>{{ selectedDatasetName }}</strong>
                  <span>当前数据集</span>
                </article>
                <article>
                  <strong>{{ saveMessage }}</strong>
                  <span>实验保存状态</span>
                </article>
              </section>
              </ng-container>

              <app-algorithm-comparison-panel
                *ngIf="labMode === 'compare'"
                [datasets]="datasets"
                [algorithms]="algorithms"
              ></app-algorithm-comparison-panel>
            </section>

            <section *ngSwitchCase="'analysis'" class="analysis-page">
              <app-experiment-history-panel
                [experiments]="experimentHistory"
                [loading]="historyLoading"
                (refreshRequested)="loadHistory()"
                (loadRequested)="applyHistory($event)"
              ></app-experiment-history-panel>
            </section>

            <section *ngSwitchCase="'datasets'" class="dataset-page">
              <section class="content-card">
                <div class="section-heading">
                  <span>Datasets</span>
                  <h2>数据集广场</h2>
                  <p>集中展示平台内置和用户保存的数据集。上传 CSV 的入口保留在算法实验室，保证数据处理和训练配置连在一起。</p>
                </div>

                <p class="empty-state" *ngIf="catalogLoading">正在加载数据集...</p>
                <div class="dataset-grid" *ngIf="datasets.length > 0">
                  <article class="dataset-card" *ngFor="let dataset of datasets">
                    <div>
                      <span>{{ labelFor(dataset.taskType) }}</span>
                      <h3>{{ dataset.name }}</h3>
                      <p>{{ dataset.description }}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>样本</dt>
                        <dd>{{ dataset.sampleCount }}</dd>
                      </div>
                      <div>
                        <dt>特征</dt>
                        <dd>{{ dataset.featureCount }}</dd>
                      </div>
                      <div>
                        <dt>来源</dt>
                        <dd>{{ dataset.sourceType }}</dd>
                      </div>
                    </dl>
                  </article>
                </div>
              </section>
            </section>

            <section *ngSwitchCase="'quiz'" class="quiz-page">
              <nav class="quiz-breadcrumb">
                <button type="button" [class.current]="quizView === 'categories'" (click)="openQuizCategories()">练习题</button>
                <ng-container *ngIf="quizSelectedGroup">
                  <span class="sep">/</span>
                  <button type="button" [class.current]="quizView === 'topics'" (click)="backToQuizTopics()">{{ quizSelectedGroup.title }}</button>
                </ng-container>
                <ng-container *ngIf="quizView === 'questions' && quizSelectedNode">
                  <span class="sep">/</span>
                  <button type="button" class="current" disabled>{{ quizSelectedNode.title }}</button>
                </ng-container>
              </nav>

              <!-- 第一级:课程大类 -->
              <section class="content-card" *ngIf="quizView === 'categories'">
                <div class="section-heading">
                  <span>Quiz</span>
                  <h2>选择练习方向</h2>
                  <p>按课程路径的大类逐级进入专题练习，完成测验后会记录每个专题的最佳成绩。</p>
                </div>
                <div class="quiz-category-grid">
                  <button class="quiz-category-card" type="button" *ngFor="let group of pathGroups" (click)="openQuizGroup(group)">
                    <strong>{{ group.title }}</strong>
                    <small>{{ group.nodes.length }} 个专题 · 已测验 {{ groupSolvedCount(group) }}/{{ group.nodes.length }}</small>
                    <span class="enter">进入 →</span>
                  </button>
                </div>
              </section>

              <!-- 第二级:专题入口(带成绩) -->
              <section class="content-card" *ngIf="quizView === 'topics' && quizSelectedGroup">
                <div class="section-heading">
                  <span>{{ quizSelectedGroup.title }}</span>
                  <h2>选择专题开始练习</h2>
                  <p>每个专题为一组单选题，提交后即时判分；右侧显示你的最佳成绩。</p>
                </div>
                <p class="empty-state" *ngIf="quizOverviewLoading">正在加载练习成绩...</p>
                <div class="quiz-topic-list">
                  <button class="quiz-topic-row" type="button" *ngFor="let node of quizSelectedGroup.nodes"
                          [disabled]="topicQuestionCount(node.id) === 0" (click)="openQuizTopic(node)">
                    <div class="quiz-topic-main">
                      <strong>{{ node.title }}</strong>
                      <small>{{ node.practice }}</small>
                    </div>
                    <div class="quiz-topic-meta">
                      <span class="quiz-count">{{ topicQuestionCount(node.id) }} 题</span>
                      <span class="quiz-badge" [class.done]="topicBestScore(node.id) !== null">
                        {{ topicBestScore(node.id) !== null ? topicBestScore(node.id) + ' 分' : '未测验' }}
                      </span>
                    </div>
                  </button>
                </div>
              </section>

              <!-- 第三级:试题作答 -->
              <section class="content-card" *ngIf="quizView === 'questions' && quizSelectedNode">
                <div class="quiz-question-head">
                  <button class="ghost-action" type="button" (click)="backToQuizTopics()">← 返回专题</button>
                  <div>
                    <h2>{{ quizSelectedNode.title }}</h2>
                    <small>{{ quizQuestions.length }} 道单选题</small>
                  </div>
                </div>

                <p class="empty-state" *ngIf="quizQuestionsLoading">正在加载题目...</p>
                <p class="empty-state" *ngIf="!quizQuestionsLoading && quizQuestions.length === 0">该专题暂无练习题。</p>

                <div class="quiz-score-banner" *ngIf="quizResult">
                  <strong>{{ quizResult.score }} 分</strong>
                  <span>答对 {{ quizResult.correctCount }} / {{ quizResult.total }}</span>
                  <span *ngIf="quizResult.persisted && quizResult.bestScore !== null">历史最佳 {{ quizResult.bestScore }} 分</span>
                  <span class="hint" *ngIf="!quizResult.persisted">登录后可记录成绩</span>
                </div>

                <div class="quiz-question-list" *ngIf="!quizQuestionsLoading && quizQuestions.length > 0">
                  <article class="quiz-question-card" *ngFor="let q of quizQuestions; let qi = index"
                           [class.correct]="quizResult && quizResultByQuestion[q.id].correct === true"
                           [class.wrong]="quizResult && quizResultByQuestion[q.id].correct === false">
                    <h3>{{ qi + 1 }}. {{ q.question }}</h3>
                    <label class="quiz-option" *ngFor="let opt of q.options; let oi = index"
                           [class.chosen]="quizAnswers[q.id] === oi"
                           [class.answer]="quizResult && quizResultByQuestion[q.id].correctIndex === oi"
                           [class.miss]="quizResult && quizAnswers[q.id] === oi && quizResultByQuestion[q.id].correct === false">
                      <input type="radio" [name]="'quiz-q-' + q.id" [checked]="quizAnswers[q.id] === oi"
                             [disabled]="!!quizResult" (change)="selectQuizOption(q.id, oi)" />
                      <span>{{ optionLetter(oi) }}. {{ opt }}</span>
                    </label>
                    <p class="quiz-explanation" *ngIf="quizResult && quizResultByQuestion[q.id].explanation">
                      解析：{{ quizResultByQuestion[q.id].explanation }}
                    </p>
                  </article>
                </div>

                <div class="quiz-actions" *ngIf="!quizQuestionsLoading && quizQuestions.length > 0">
                  <button class="primary-action" type="button" *ngIf="!quizResult"
                          [disabled]="quizSubmitting || !allQuizAnswered()" (click)="submitQuiz()">
                    {{ quizSubmitting ? '提交中...' : (allQuizAnswered() ? '提交并查看得分' : '请先完成所有题目') }}
                  </button>
                  <button class="primary-action" type="button" *ngIf="quizResult" (click)="retryQuiz()">再做一次</button>
                  <button class="ghost-action" type="button" *ngIf="quizResult" (click)="backToQuizTopics()">返回专题</button>
                </div>
                <p class="quiz-message" *ngIf="quizMessage">{{ quizMessage }}</p>
              </section>
            </section>

            <section *ngSwitchCase="'chat'" class="chat-page">
              <section class="chat-window">
                <header class="chat-window-head">
                  <div>
                    <h2>实时聊天室</h2>
                    <span class="chat-sub">与当前在线的同学实时交流</span>
                  </div>
                  <span class="chat-online">● 在线 {{ chat.online() }}</span>
                </header>

                <div class="chat-window-body" id="chat-scroll">
                  <p class="chat-window-empty" *ngIf="chat.messages().length === 0">还没有消息，来说第一句吧。</p>
                  <div class="chat-bubble-row" *ngFor="let m of chat.messages()" [class.self]="isSelfMessage(m)">
                    <div class="chat-bubble-wrap">
                      <span class="chat-bubble-name" *ngIf="!isSelfMessage(m)">{{ m.senderName }}</span>
                      <div class="chat-bubble">{{ m.content }}</div>
                    </div>
                  </div>
                </div>

                <footer class="chat-window-foot" *ngIf="currentUser; else chatFootLogin">
                  <input [(ngModel)]="chatDraft" (keyup.enter)="sendChat()" maxlength="500" placeholder="输入消息，回车发送…" />
                  <button class="primary-action" type="button" (click)="sendChat()">发送</button>
                </footer>
                <ng-template #chatFootLogin>
                  <footer class="chat-window-foot chat-foot-hint">
                    <span>登录后即可参与聊天</span>
                    <button class="primary-action" type="button" (click)="setPage('auth')">去登录</button>
                  </footer>
                </ng-template>
                <p class="chat-window-err" *ngIf="chat.lastError()">{{ chat.lastError() }}</p>
              </section>
            </section>

            <section *ngSwitchCase="'profile'" class="profile-page">
              <section class="content-card">
                <span class="eyebrow">Profile</span>
                <h2>个人中心</h2>
                <p>当前项目已实现登录态展示、实验保存和历史记录；更完整的头像、邮箱修改、密码修改可作为后续扩展。</p>
                <div class="profile-grid">
                  <div>
                    <strong>{{ currentUser?.displayName || '未登录' }}</strong>
                    <span>显示名称</span>
                  </div>
                  <div>
                    <strong>{{ currentUser?.username || '访客' }}</strong>
                    <span>用户名</span>
                  </div>
                  <div>
                    <strong>{{ currentUser?.role || 'guest' }}</strong>
                    <span>角色</span>
                  </div>
                </div>
              </section>

              <ng-container *ngTemplateOutlet="saveExperimentCard"></ng-container>
            </section>
          </ng-container>
        </main>
      </div>
    </ng-template>

    <ng-template #saveExperimentCard>
      <section class="content-card save-card">
        <span class="eyebrow">Experiment</span>
        <h2>保存实验</h2>
        <p>当前配置与最近一次训练 Session 一起写入数据库，便于复盘和课堂演示。</p>

        <label class="field">
          <span>实验名称</span>
          <input type="text" [(ngModel)]="experimentName" placeholder="例如：Iris SVM 分类演示" />
        </label>

        <div class="save-summary">
          <div>
            <strong>已登录用户</strong>
            <span>{{ currentUser?.displayName || '未登录' }}</span>
          </div>
          <div>
            <strong>最近 Session</strong>
            <span>{{ latestSessionId || '暂无' }}</span>
          </div>
        </div>

        <button class="primary-action full" type="button" (click)="saveExperiment()" [disabled]="saveLoading || !canSaveExperiment">
          {{ saveLoading ? '保存中...' : '保存实验' }}
        </button>
        <p class="hint">{{ saveMessage }}</p>
      </section>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      color: var(--text);
    }

    h1,
    h2,
    h3,
    p {
      margin-top: 0;
    }

    button {
      cursor: pointer;
    }

    .eyebrow {
      display: inline-flex;
      width: fit-content;
      margin-bottom: 12px;
      padding: 5px 9px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-dark);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .primary-action,
    .ghost-action {
      min-height: 42px;
      border-radius: 10px;
      padding: 0 16px;
      font-weight: 760;
      white-space: nowrap;
    }

    .primary-action {
      border: 1px solid #111111;
      background: #111111;
      color: #ffffff;
    }

    .primary-action:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .primary-action.large {
      min-height: 50px;
      padding: 0 24px;
      font-size: 16px;
    }

    .primary-action.full {
      width: 100%;
    }

    .ghost-action {
      border: 1px solid var(--border-strong);
      background: #ffffff;
      color: var(--text);
    }

    .content-card,
    .path-tree-card,
    .path-detail-card,
    .lab-top,
    .lab-config,
    .lab-visual,
    .lab-explain,
    .landing-hero,
    .public-section,
    .auth-card,
    .dashboard-welcome {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: #ffffff;
      box-shadow: var(--shadow-sm);
    }

    .public-page {
      width: min(1180px, calc(100% - 40px));
      margin: 0 auto;
      padding: 24px 0 34px;
    }

    .landing-hero {
      min-height: calc(100vh - 96px);
      display: grid;
      grid-template-rows: auto 1fr;
      padding: 26px;
      background:
        radial-gradient(circle at 80% 20%, rgba(16, 163, 127, 0.08), transparent 26rem),
        #ffffff;
    }

    .landing-nav,
    .public-footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }

    .landing-brand,
    .auth-brand,
    .sidebar-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border: 0;
      background: transparent;
      color: var(--text);
      text-align: left;
    }

    .landing-brand span,
    .auth-brand span,
    .sidebar-brand span {
      display: grid;
      width: 38px;
      height: 38px;
      place-items: center;
      border-radius: 10px;
      background: #111111;
      color: #ffffff;
      font-weight: 850;
      letter-spacing: -0.04em;
    }

    .landing-copy {
      display: grid;
      align-content: center;
      max-width: 860px;
      padding: 56px 4vw;
    }

    .landing-copy h1 {
      margin-bottom: 18px;
      font-size: clamp(42px, 7vw, 82px);
      line-height: 0.98;
      letter-spacing: -0.07em;
    }

    .landing-copy p {
      max-width: 760px;
      margin-bottom: 28px;
      color: var(--text-muted);
      font-size: 20px;
      line-height: 1.72;
    }

    .public-section {
      margin-top: 22px;
      padding: 28px;
    }

    .section-heading {
      max-width: 760px;
      margin-bottom: 22px;
    }

    .section-heading.compact {
      margin-bottom: 16px;
    }

    .section-heading h2,
    .content-card h2,
    .path-header h2 {
      margin-bottom: 10px;
      color: var(--text);
      font-size: 30px;
      line-height: 1.15;
      letter-spacing: -0.04em;
    }

    .section-heading p,
    .content-card p,
    .path-header p {
      color: var(--text-muted);
      line-height: 1.72;
    }

    .public-feature-grid,
    .progress-grid,
    .continue-grid,
    .algorithm-grid,
    .dataset-grid,
    .quiz-grid,
    .profile-grid,
    .lab-results {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .public-feature-grid article,
    .continue-grid article,
    .algorithm-card,
    .dataset-card,
    .quiz-card,
    .profile-grid div,
    .lab-results article,
    .progress-grid article {
      padding: 18px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--surface-subtle);
    }

    .public-feature-grid article span,
    .algorithm-card > span,
    .dataset-card span,
    .quiz-card > span,
    .group-title span {
      width: fit-content;
      padding: 5px 9px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-dark);
      font-size: 12px;
      font-weight: 850;
    }

    .public-feature-grid h3,
    .continue-grid h3,
    .algorithm-card h3,
    .dataset-card h3,
    .quiz-card h3 {
      margin: 12px 0 8px;
      color: var(--text);
      font-size: 18px;
    }

    .public-feature-grid p,
    .algorithm-card p,
    .dataset-card p,
    .quiz-card p,
    .continue-grid p {
      margin-bottom: 0;
      color: var(--text-muted);
      line-height: 1.65;
    }

    .public-footer {
      margin-top: 18px;
      padding: 18px 6px;
      color: var(--text-muted);
      font-size: 14px;
    }

    .public-footer button {
      border: 0;
      background: transparent;
      color: var(--text);
      font-weight: 750;
    }

    .auth-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 28px;
    }

    .auth-brand {
      position: fixed;
      top: 24px;
      left: 28px;
    }

    .auth-shell {
      width: min(960px, 100%);
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(340px, 1fr);
      gap: 28px;
      align-items: center;
    }

    .auth-intro h1 {
      margin-bottom: 14px;
      font-size: clamp(34px, 5vw, 56px);
      line-height: 1.05;
      letter-spacing: -0.06em;
    }

    .auth-intro p {
      color: var(--text-muted);
      font-size: 17px;
      line-height: 1.7;
    }

    .auth-card {
      padding: 12px;
    }

    .auth-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 12px;
      padding: 4px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface-muted);
    }

    .auth-tabs button,
    .auth-links button {
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--text-muted);
      font-weight: 780;
    }

    .auth-tabs button {
      min-height: 38px;
    }

    .auth-tabs button.active {
      background: #ffffff;
      color: var(--text);
      box-shadow: var(--shadow-sm);
    }

    .auth-links {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 8px 2px;
    }

    .register-form {
      display: grid;
      gap: 14px;
      padding: 16px;
    }

    .register-form label,
    .field,
    .lab-top label {
      display: grid;
      gap: 8px;
      color: var(--text);
      font-weight: 700;
    }

    .register-form input,
    .field input,
    .lab-top input {
      min-height: 44px;
      padding: 10px 12px;
    }

    .hint {
      min-height: 22px;
      margin: 12px 8px 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.55;
    }

    .learning-shell {
      --sidebar-width: 260px;
      min-height: 100vh;
      display: grid;
      grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
      transition: grid-template-columns 0.18s ease;
    }

    .learning-shell.sidebar-collapsed {
      --sidebar-width: 76px;
    }

    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 20px;
      padding: 22px 16px;
      border-right: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(14px);
      min-width: 0;
      overflow: hidden;
    }

    /* ---- 实时聊天室页(微信/QQ 风格对话窗口) ---- */
    .chat-page {
      width: 100%;
      min-width: 0;
      height: calc(100vh - 170px);
      min-height: 460px;
    }

    .chat-window {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #ffffff;
      border: 1px solid var(--border-strong, #e5e7eb);
      border-radius: 18px;
      overflow: hidden;
    }

    .chat-window-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-strong, #eef0f3);
    }

    .chat-window-head h2 { margin: 0; font-size: 18px; }
    .chat-sub { font-size: 12px; color: var(--text-muted, #6b7280); }
    .chat-online { font-size: 13px; color: #2f8f6c; font-weight: 700; white-space: nowrap; }

    .chat-window-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #f5f6f8;
    }

    .chat-window-empty { margin: auto; color: var(--text-muted, #9ca3af); font-size: 13px; }

    .chat-bubble-row { display: flex; justify-content: flex-start; }
    .chat-bubble-row.self { justify-content: flex-end; }

    .chat-bubble-wrap { display: flex; flex-direction: column; max-width: 70%; gap: 3px; }
    .chat-bubble-name { font-size: 11px; color: var(--text-muted, #8a94a6); padding-left: 4px; }

    .chat-bubble {
      padding: 9px 13px;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid var(--border-strong, #e8eaed);
      color: var(--text, #1c2024);
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .chat-bubble-row.self .chat-bubble {
      background: #95ec69;
      border-color: #95ec69;
      color: #1a2b16;
    }

    .chat-window-foot {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 14px 20px;
      border-top: 1px solid var(--border-strong, #eef0f3);
    }

    .chat-window-foot input {
      flex: 1;
      min-width: 0;
      padding: 10px 14px;
      border: 1px solid var(--border-strong, #e5e7eb);
      border-radius: 10px;
      font-size: 14px;
    }

    .chat-window-foot .primary-action { white-space: nowrap; }
    .chat-foot-hint { justify-content: space-between; color: var(--text-muted, #6b7280); font-size: 13px; }
    .chat-window-err { margin: 0; padding: 0 20px 12px; color: #c0392b; font-size: 12px; }

    .sidebar-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }

    .sidebar-brand {
      min-width: 0;
      padding: 0;
      cursor: pointer;
    }

    .sidebar-brand strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-toggle {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #ffffff;
      color: var(--text);
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
    }

    .sidebar-nav {
      display: grid;
      align-content: start;
      gap: 6px;
    }

    .sidebar-nav button {
      display: flex;
      align-items: center;
      gap: 2px;
      width: 100%;
      border: 0;
      border-radius: 12px;
      padding: 11px 12px;
      background: transparent;
      color: var(--text-muted);
      text-align: left;
      min-width: 0;
      cursor: pointer;
    }

    .nav-icon {
      flex: 0 0 28px;
      display: grid;
      width: 28px;
      height: 28px;
      place-items: center;
      border-radius: 9px;
      background: var(--surface-muted);
      color: var(--text);
      font-size: 15px;
      font-weight: 850;
    }

    .nav-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
      margin-left: 6px;
    }

    .nav-copy span {
      font-size: 14px;
      font-weight: 780;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-copy small {
      color: var(--text-subtle);
      font-size: 11px;
    }

    .sidebar-nav button.active {
      background: #111111;
      color: #ffffff;
    }

    .sidebar-nav button.active .nav-icon {
      background: rgba(255,255,255,0.16);
      color: #ffffff;
    }

    .sidebar-nav button.active small {
      color: rgba(255,255,255,0.68);
    }

    .sidebar-user {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--surface-subtle);
      min-width: 0;
    }

    .user-avatar {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border-radius: 999px;
      background: #111111;
      color: #ffffff;
      font-size: 14px;
      font-weight: 850;
    }

    .sidebar-user-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .sidebar-user-copy strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-user-copy span {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.5;
    }

    .sidebar-user button {
      grid-column: 1 / -1;
      min-height: 36px;
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      background: #ffffff;
      color: var(--text);
      font-weight: 750;
    }

    .collapsed-label {
      display: none;
    }

    .sidebar.collapsed {
      gap: 16px;
      padding: 18px 10px;
    }

    .sidebar.collapsed .sidebar-top {
      grid-template-columns: 1fr;
      justify-items: center;
    }

    .sidebar.collapsed .sidebar-brand {
      justify-content: center;
    }

    .sidebar.collapsed .sidebar-brand strong,
    .sidebar.collapsed .nav-copy,
    .sidebar.collapsed .sidebar-user-copy,
    .sidebar.collapsed .expanded-label {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }

    .sidebar.collapsed .sidebar-toggle {
      width: 44px;
      height: 34px;
    }

    .sidebar.collapsed .sidebar-nav button {
      justify-content: center;
      padding: 10px 0;
    }

    .sidebar.collapsed .nav-icon {
      flex-basis: 34px;
      width: 34px;
      height: 34px;
    }

    .sidebar.collapsed .sidebar-user {
      grid-template-columns: 1fr;
      justify-items: center;
      padding: 10px 6px;
    }

    .sidebar.collapsed .sidebar-user button {
      width: 34px;
      min-height: 32px;
      padding: 0;
    }

    .sidebar.collapsed .collapsed-label {
      display: inline;
    }

    .app-main {
      width: min(1260px, calc(100% - 40px));
      min-width: 0;
      margin: 0 auto;
      padding: 30px 0 70px;
    }

    .learning-shell.lab-shell .app-main {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: 24px clamp(16px, 1.8vw, 30px) 64px;
    }

    .app-header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 22px;
      padding: 24px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: #ffffff;
      box-shadow: var(--shadow-sm);
    }

    .app-header h1 {
      max-width: 820px;
      margin-bottom: 10px;
      font-size: clamp(30px, 4vw, 46px);
      line-height: 1.05;
      letter-spacing: -0.05em;
    }

    .app-header p {
      max-width: 760px;
      margin-bottom: 0;
      color: var(--text-muted);
      line-height: 1.7;
    }

    .dashboard-page,
    .paths-page,
    .theory-page,
    .lab-page,
    .analysis-page,
    .dataset-page,
    .quiz-page,
    .profile-page {
      display: grid;
      gap: 22px;
    }

    .dashboard-welcome {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: center;
      padding: 24px;
    }

    .dashboard-welcome span {
      color: var(--accent-dark);
      font-size: 13px;
      font-weight: 850;
    }

    .dashboard-welcome h2 {
      margin: 8px 0;
      font-size: 28px;
      letter-spacing: -0.04em;
    }

    .dashboard-welcome p {
      margin-bottom: 0;
      color: var(--text-muted);
      line-height: 1.6;
    }

    .dashboard-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 22px;
      align-items: start;
    }

    .dashboard-main,
    .dashboard-side {
      display: grid;
      gap: 18px;
    }

    .content-card {
      padding: 22px;
    }

    .progress-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .progress-grid strong,
    .lab-results strong,
    .profile-grid strong {
      display: block;
      overflow-wrap: anywhere;
      color: var(--text);
      font-size: 24px;
      line-height: 1.18;
    }

    .progress-grid span,
    .lab-results span,
    .profile-grid span {
      display: block;
      margin-top: 8px;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 750;
    }

    .continue-grid article small {
      color: var(--accent-dark);
      font-weight: 850;
    }

    .continue-grid article strong {
      display: block;
      margin: 8px 0;
      color: var(--text);
      font-size: 18px;
      overflow-wrap: anywhere;
    }

    .record-table {
      display: grid;
      gap: 8px;
    }

    .record-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1.3fr 0.7fr 0.8fr auto;
      gap: 10px;
      align-items: center;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-subtle);
      color: var(--text-muted);
      font-size: 13px;
    }

    .record-row.header {
      background: #ffffff;
      color: var(--text);
      font-weight: 850;
    }

    .record-row button {
      border: 1px solid var(--border-strong);
      border-radius: 9px;
      background: #ffffff;
      color: var(--text);
      font-weight: 750;
      min-height: 34px;
      padding: 0 10px;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-top: 14px;
    }

    .calendar-grid span,
    .badge-list span,
    .tag-row small {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      border-radius: 999px;
      background: var(--surface-muted);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 800;
    }

    .calendar-grid span.active {
      background: var(--accent-soft);
      color: var(--accent-dark);
    }

    .badge-list,
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .weak-list,
    .detail-block ul,
    .tip-card ul {
      margin: 10px 0 0;
      padding-left: 18px;
      color: var(--text-muted);
      line-height: 1.8;
    }

    .path-header {
      padding: 4px;
    }

    .path-layout,
    .split-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
      gap: 22px;
      align-items: start;
    }

    .path-tree-card,
    .path-detail-card {
      padding: 24px;
    }

    .path-group + .path-group {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
    }

    .path-group h3 {
      margin-bottom: 12px;
      color: var(--text);
    }

    .tree-list {
      position: relative;
      display: grid;
      gap: 8px;
      padding-left: 18px;
    }

    .tree-list::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 10px;
      bottom: 10px;
      width: 1px;
      background: var(--border-strong);
    }

    .tree-list button {
      position: relative;
      min-height: 40px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #ffffff;
      color: var(--text-muted);
      text-align: left;
      padding: 0 12px;
      font-weight: 760;
    }

    .tree-list button::before {
      content: '';
      position: absolute;
      left: -18px;
      top: 50%;
      width: 14px;
      height: 1px;
      background: var(--border-strong);
    }

    .tree-list button.active {
      border-color: rgba(16, 163, 127, 0.34);
      background: var(--accent-soft);
      color: var(--accent-dark);
    }

    .path-detail-card {
      position: sticky;
      top: 24px;
    }

    .detail-block {
      margin-top: 18px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface-subtle);
    }

    .detail-block strong {
      color: var(--text);
    }

    .detail-block p {
      margin: 10px 0 0;
      color: var(--text-muted);
      line-height: 1.65;
    }

    .path-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    .algorithm-group {
      display: grid;
      gap: 14px;
      margin-top: 22px;
    }

    .group-title,
    .param-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }

    .group-title small,
    .param-row small {
      color: var(--text-muted);
      font-weight: 750;
    }

    .algorithm-card {
      display: flex;
      flex-direction: column;
      min-height: 230px;
      gap: 10px;
    }

    .param-row {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .param-row button {
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      padding: 8px 12px;
      background: #ffffff;
      color: var(--text);
      font-weight: 750;
    }

    .lab-page {
      width: 100%;
      min-width: 0;
    }

    .lab-mode-tabs {
      display: flex;
      gap: 8px;
      margin: 4px 0 16px;
    }

    .lab-mode-tabs button {
      padding: 8px 16px;
      border: 1px solid var(--border-strong, #e5e7eb);
      background: #fff;
      border-radius: 999px;
      cursor: pointer;
      font-weight: 700;
      color: var(--text-muted, #6b7280);
    }

    .lab-mode-tabs button.active {
      background: #1c2024;
      color: #fff;
      border-color: #1c2024;
    }

    .lab-top {
      display: grid;
      grid-template-columns: minmax(280px, 1fr) minmax(170px, auto) auto;
      gap: 14px;
      align-items: end;
      padding: 16px;
      min-width: 0;
    }

    .lab-top > div {
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-subtle);
    }

    .lab-top > div span {
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 850;
    }

    .lab-grid {
      display: grid;
      grid-template-columns: clamp(260px, 18vw, 320px) minmax(0, 1fr) clamp(240px, 16vw, 300px);
      gap: clamp(14px, 1.25vw, 20px);
      align-items: start;
      width: 100%;
      min-width: 0;
    }

    .lab-config,
    .lab-visual,
    .lab-explain {
      min-width: 0;
      padding: 16px;
      align-self: start;
    }

    .lab-config,
    .lab-explain {
      position: sticky;
      top: 20px;
    }

    .lab-visual {
      display: grid;
      gap: 14px;
      width: 100%;
      min-width: 0;
    }

    .lab-panel-title {
      margin-bottom: 14px;
    }

    .lab-panel-title span {
      color: var(--accent-dark);
      font-size: 12px;
      font-weight: 850;
    }

    .lab-panel-title h2 {
      margin: 6px 0 0;
      font-size: 18px;
      line-height: 1.25;
      letter-spacing: -0.03em;
    }

    .lab-explain {
      display: grid;
      gap: 14px;
    }

    .lab-explain .content-card {
      padding: 14px;
    }

    .lab-explain h3 {
      margin-bottom: 8px;
      font-size: 16px;
    }

    .lab-explain p {
      margin-bottom: 0;
      color: var(--text-muted);
      line-height: 1.65;
      font-size: 14px;
    }

    .lab-results {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.3fr);
      min-width: 0;
    }

    .lab-results article {
      background: #ffffff;
    }

    .result-summary,
    .save-summary {
      display: grid;
      gap: 12px;
      margin-top: 18px;
    }

    .result-summary div,
    .save-summary div {
      display: grid;
      gap: 4px;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface-subtle);
    }

    .result-summary strong,
    .save-summary strong {
      color: var(--text);
      overflow-wrap: anywhere;
    }

    .result-summary span,
    .save-summary span {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    .dataset-card {
      display: grid;
      gap: 18px;
    }

    .dataset-card dl {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 0;
    }

    .dataset-card dl div {
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #ffffff;
    }

    .dataset-card dt {
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 750;
    }

    .dataset-card dd {
      margin: 4px 0 0;
      color: var(--text);
      font-weight: 800;
    }

    .quiz-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .quiz-card {
      display: grid;
      gap: 12px;
    }

    /* ---- 练习题三级下钻 ---- */
    .quiz-page {
      display: grid;
      gap: 16px;
    }

    .quiz-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .quiz-breadcrumb button {
      border: none;
      background: transparent;
      padding: 4px 6px;
      border-radius: 8px;
      font-size: 13px;
      color: var(--text-muted, #6b7280);
      cursor: pointer;
    }

    .quiz-breadcrumb button:not(:disabled):hover {
      color: var(--text, #1c2024);
      background: var(--surface-subtle, #f3f4f6);
    }

    .quiz-breadcrumb button.current {
      color: var(--text, #1c2024);
      font-weight: 800;
      cursor: default;
    }

    .quiz-breadcrumb .sep {
      color: var(--border-strong, #cbd5e1);
    }

    .quiz-category-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .quiz-category-card {
      display: grid;
      gap: 6px;
      text-align: left;
      padding: 18px;
      border: 1px solid var(--border-strong, #e5e7eb);
      border-radius: 16px;
      background: #ffffff;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .quiz-category-card:hover {
      transform: translateY(-2px);
      border-color: #34a07a;
      box-shadow: 0 10px 24px rgba(16, 24, 40, 0.08);
    }

    .quiz-category-card strong {
      font-size: 17px;
      color: var(--text, #1c2024);
    }

    .quiz-category-card small {
      color: var(--text-muted, #6b7280);
    }

    .quiz-category-card .enter {
      margin-top: 6px;
      font-size: 13px;
      font-weight: 800;
      color: #2f8f6c;
    }

    .quiz-topic-list {
      display: grid;
      gap: 10px;
    }

    .quiz-topic-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 16px;
      border: 1px solid var(--border-strong, #e5e7eb);
      border-radius: 14px;
      background: #ffffff;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .quiz-topic-row:not(:disabled):hover {
      border-color: #34a07a;
      box-shadow: 0 8px 18px rgba(16, 24, 40, 0.06);
    }

    .quiz-topic-row:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .quiz-topic-main {
      display: grid;
      gap: 4px;
    }

    .quiz-topic-main strong {
      font-size: 15px;
      color: var(--text, #1c2024);
    }

    .quiz-topic-main small {
      color: var(--text-muted, #6b7280);
    }

    .quiz-topic-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .quiz-count {
      font-size: 12px;
      color: var(--text-muted, #6b7280);
    }

    .quiz-badge {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      background: var(--surface-subtle, #f3f4f6);
      color: var(--text-muted, #6b7280);
      white-space: nowrap;
    }

    .quiz-badge.done {
      background: #e7f5ef;
      color: #1f7a57;
    }

    .quiz-question-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 12px;
    }

    .quiz-question-head h2 {
      margin: 0;
      font-size: 19px;
    }

    .quiz-question-head small {
      color: var(--text-muted, #6b7280);
    }

    .quiz-score-banner {
      display: flex;
      align-items: baseline;
      gap: 16px;
      flex-wrap: wrap;
      padding: 14px 18px;
      border-radius: 14px;
      background: #e7f5ef;
      border: 1px solid #bfe3d2;
      margin-bottom: 16px;
    }

    .quiz-score-banner strong {
      font-size: 24px;
      color: #1f7a57;
    }

    .quiz-score-banner span {
      color: #2f6b55;
      font-size: 14px;
    }

    .quiz-score-banner .hint {
      color: var(--text-muted, #6b7280);
    }

    .quiz-question-list {
      display: grid;
      gap: 14px;
    }

    .quiz-question-card {
      display: grid;
      gap: 8px;
      padding: 16px;
      border: 1px solid var(--border-strong, #e5e7eb);
      border-left: 4px solid var(--border-strong, #e5e7eb);
      border-radius: 14px;
      background: #ffffff;
    }

    .quiz-question-card.correct {
      border-left-color: #34a07a;
    }

    .quiz-question-card.wrong {
      border-left-color: #e05656;
    }

    .quiz-question-card h3 {
      margin: 0;
      font-size: 15px;
      line-height: 1.5;
      color: var(--text, #1c2024);
    }

    .quiz-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--border-strong, #e5e7eb);
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      color: var(--text, #1c2024);
      transition: border-color 0.12s ease, background 0.12s ease;
    }

    .quiz-option:hover {
      border-color: #94a3b8;
    }

    .quiz-option.chosen {
      border-color: #34a07a;
      background: #f1faf6;
    }

    .quiz-option.answer {
      border-color: #34a07a;
      background: #e7f5ef;
    }

    .quiz-option.miss {
      border-color: #e05656;
      background: #fdecec;
    }

    .quiz-option input {
      accent-color: #2f8f6c;
    }

    .quiz-explanation {
      margin: 4px 0 0;
      padding-top: 8px;
      border-top: 1px dashed var(--border-strong, #e5e7eb);
      color: var(--text-muted, #6b7280);
      font-size: 13px;
      line-height: 1.6;
    }

    .quiz-actions {
      display: flex;
      gap: 12px;
      margin-top: 18px;
      flex-wrap: wrap;
    }

    .quiz-message {
      margin-top: 12px;
      color: #c0392b;
      font-size: 14px;
    }

    .empty-state {
      padding: 18px;
      border: 1px dashed var(--border-strong);
      border-radius: 14px;
      background: var(--surface-subtle);
      color: var(--text-muted);
      line-height: 1.65;
    }

    @media (max-width: 1380px) {
      .lab-grid {
        grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
      }

      .lab-explain {
        grid-column: 1 / -1;
        position: static;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .lab-explain .lab-panel-title {
        grid-column: 1 / -1;
        margin-bottom: 0;
      }
    }

    @media (max-width: 1180px) {
      .learning-shell {
        --sidebar-width: 220px;
      }

      .learning-shell.sidebar-collapsed {
        --sidebar-width: 76px;
      }

      .app-main {
        width: min(100% - 32px, 1260px);
      }

      .dashboard-layout,
      .path-layout,
      .split-layout {
        grid-template-columns: 1fr;
      }

      .lab-grid {
        grid-template-columns: 1fr;
      }

      .lab-config,
      .lab-explain,
      .path-detail-card {
        position: static;
      }

      .lab-explain {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 820px) {
      .auth-shell,
      .lab-top {
        grid-template-columns: 1fr;
      }

      .auth-intro {
        text-align: center;
      }

      .app-header,
      .dashboard-welcome,
      .landing-nav,
      .public-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .progress-grid,
      .public-feature-grid,
      .continue-grid,
      .algorithm-grid,
      .dataset-grid,
      .quiz-grid,
      .profile-grid,
      .lab-results {
        grid-template-columns: 1fr;
      }

      .record-row,
      .record-row.header {
        grid-template-columns: 1fr;
      }

      .learning-shell {
        --sidebar-width: 72px;
      }

      .learning-shell.sidebar-collapsed {
        --sidebar-width: 72px;
      }

      .sidebar {
        padding: 14px 8px;
      }

      .sidebar:not(.collapsed) .sidebar-brand strong,
      .sidebar:not(.collapsed) .nav-copy,
      .sidebar:not(.collapsed) .sidebar-user-copy,
      .sidebar:not(.collapsed) .expanded-label {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
      }

      .sidebar:not(.collapsed) .sidebar-top {
        grid-template-columns: 1fr;
        justify-items: center;
      }

      .sidebar:not(.collapsed) .sidebar-nav button {
        justify-content: center;
        padding: 10px 0;
      }

      .sidebar:not(.collapsed) .sidebar-user {
        grid-template-columns: 1fr;
        justify-items: center;
        padding: 10px 6px;
      }

      .sidebar:not(.collapsed) .sidebar-user button {
        width: 34px;
        min-height: 32px;
        padding: 0;
      }

      .sidebar:not(.collapsed) .collapsed-label {
        display: inline;
      }

      .learning-shell.lab-shell .app-main,
      .app-main {
        width: 100%;
        padding: 18px 12px 48px;
      }
    }
  `]
})
export class WorkbenchPageComponent implements OnInit, OnDestroy {
  readonly appNavItems: NavItem[] = [
    { key: 'dashboard', label: '首页', eyebrow: 'Dashboard', icon: '⌂' },
    { key: 'paths', label: '课程路径', eyebrow: 'Roadmap', icon: '⌁' },
    { key: 'lab', label: '算法实验室', eyebrow: 'Lab', icon: '◇' },
    { key: 'analysis', label: '我的实验记录', eyebrow: 'Records', icon: '▤' },
    { key: 'quiz', label: '练习题', eyebrow: 'Quiz', icon: '✓' },
    { key: 'chat', label: '实时聊天室', eyebrow: 'Chat', icon: '💬' },
    { key: 'profile', label: '个人中心', eyebrow: 'Profile', icon: '○' },
    { key: 'theory', label: '算法教学', eyebrow: 'Theory', icon: 'ƒ' },
    { key: 'datasets', label: '数据集广场', eyebrow: 'Data', icon: '▦' }
  ];

  readonly pageMeta: Record<PageKey, PageMeta> = {
    home: {
      eyebrow: 'Public Home',
      title: '交互式机器学习可视化学习平台',
      description: '通过可视化实验理解监督学习、无监督学习、强化学习。'
    },
    auth: {
      eyebrow: 'Account',
      title: '用户注册 / 登录',
      description: '登录后进入学习仪表盘，保存实验并查看学习进度。'
    },
    dashboard: {
      eyebrow: '学习仪表盘 / 用户主页',
      title: '学习仪表盘',
      description: '展示学习进度、最近实验、推荐任务、学习日历和薄弱知识点提醒。'
    },
    paths: {
      eyebrow: '课程路径 / 知识地图',
      title: '课程路径',
      description: '用树状结构展示机器学习知识体系，并在右侧解释当前节点。'
    },
    theory: {
      eyebrow: '算法教学 / 理论讲解',
      title: '算法教学',
      description: '先理解算法任务、适用场景和参数含义，再进入实验室调参。'
    },
    lab: {
      eyebrow: '算法实验室 / 训练页面',
      title: '算法实验室',
      description: '集中完成实验配置、训练控制、过程可视化、结果指标和解释提示。'
    },
    analysis: {
      eyebrow: '我的实验记录',
      title: '实验记录与结果分析',
      description: '查询历史实验、回填配置，并进行模型对比。'
    },
    datasets: {
      eyebrow: '数据集页面 / 数据集广场',
      title: '数据集广场',
      description: '集中查看课程数据集与上传后保存的数据。'
    },
    quiz: {
      eyebrow: '练习题 / 测验页面',
      title: '练习题',
      description: '用轻量练习检查概念理解和实验判断。'
    },
    chat: {
      eyebrow: '实时聊天室',
      title: '实时聊天室',
      description: '与当前在线的同学实时交流，登录后即可发言。'
    },
    profile: {
      eyebrow: '个人中心',
      title: '个人中心',
      description: '查看当前账号、角色和实验保存状态。'
    }
  };

  readonly pathGroups: PathGroup[] = [
    {
      title: '机器学习基础',
      nodes: [
        {
          id: 'data-feature',
          title: '数据与特征',
          description: '理解样本、特征、标签和特征工程，是所有机器学习实验的起点。',
          prerequisites: ['基础数学符号', '表格数据概念'],
          experiment: '上传 CSV 并选择两个数值特征进行二维可视化。',
          practice: '判断哪些列适合作为特征，哪些列适合作为标签。'
        },
        {
          id: 'train-test',
          title: '训练集 / 测试集',
          description: '训练集用于学习模型参数，测试集用于评估模型泛化表现。',
          prerequisites: ['数据与特征'],
          experiment: '在线性回归或分类任务中观察不同数据集带来的指标变化。',
          practice: '解释为什么不能只看训练集效果。'
        },
        {
          id: 'loss',
          title: '损失函数',
          description: '损失函数衡量模型预测与真实结果之间的差距，是训练优化的目标。',
          prerequisites: ['训练集 / 测试集', '误差概念'],
          experiment: '在训练控制模块观察 Loss 曲线下降或震荡。',
          practice: '判断学习率过大时 Loss 为什么可能震荡。'
        },
        {
          id: 'overfit',
          title: '过拟合与欠拟合',
          description: '过拟合表示模型记住了训练数据细节，欠拟合表示模型能力不足。',
          prerequisites: ['训练集 / 测试集', '损失函数'],
          experiment: '调大树深度或迭代次数，观察指标和边界变化。',
          practice: '区分过拟合和欠拟合的现象。'
        },
        {
          id: 'metrics',
          title: '模型评估',
          description: '使用准确率、损失值、轮廓系数、解释方差等指标判断模型效果。',
          prerequisites: ['损失函数', '任务类型'],
          experiment: '进入结果分析页比较两个算法的核心指标。',
          practice: '为分类、聚类、降维任务选择合适指标。'
        }
      ]
    },
    {
      title: '监督学习',
      nodes: [
        {
          id: 'linear-regression',
          title: '线性回归',
          description: '用线性函数拟合连续数值目标，适合解释回归线和误差下降。',
          prerequisites: ['损失函数', '数据与特征'],
          experiment: '选择线性回归，观察回归线随训练步数更新。',
          practice: '说明学习率对回归训练的影响。'
        },
        {
          id: 'logistic-regression',
          title: '逻辑回归',
          description: '使用概率输出完成分类任务，适合展示分类边界。',
          prerequisites: ['线性模型', '分类任务'],
          experiment: '选择逻辑回归，观察 Accuracy 与决策边界。',
          practice: '解释概率阈值如何影响分类结果。'
        },
        {
          id: 'decision-tree',
          title: '决策树',
          description: '通过特征划分构造树结构，适合解释模型决策过程。',
          prerequisites: ['分类任务', '模型评估'],
          experiment: '调整最大深度，观察树模型复杂度变化。',
          practice: '判断深度过大为什么可能过拟合。'
        },
        {
          id: 'svm',
          title: 'SVM',
          description: '寻找最大间隔分类边界，适合观察边界和间隔思想。',
          prerequisites: ['分类任务', '特征空间'],
          experiment: '选择 SVM，观察决策边界与 Hinge Loss。',
          practice: '解释正则化参数对边界的影响。'
        }
      ]
    },
    {
      title: '无监督学习',
      nodes: [
        {
          id: 'kmeans',
          title: 'K-Means',
          description: '根据样本距离迭代更新聚类中心，发现无标签数据结构。',
          prerequisites: ['数据与特征', '距离度量'],
          experiment: '调整 K 值，观察聚类中心和簇分布变化。',
          practice: '判断 K 值过小或过大的影响。'
        },
        {
          id: 'pca',
          title: 'PCA',
          description: '通过主成分投影压缩特征维度，保留主要方差信息。',
          prerequisites: ['特征空间', '方差概念'],
          experiment: '观察 explained variance 和二维投影结果。',
          practice: '解释为什么降维可能丢失信息。'
        }
      ]
    },
    {
      title: '强化学习',
      nodes: [
        {
          id: 'state-action-reward',
          title: '状态 / 动作 / 奖励',
          description: '强化学习通过智能体与环境交互，从奖励信号中学习策略。',
          prerequisites: ['基本概率', '序列决策'],
          experiment: '在网格世界中观察状态、动作和奖励变化。',
          practice: '设计一个简单奖励函数。'
        },
        {
          id: 'q-learning',
          title: 'Q-Learning',
          description: '用 Q 值表估计状态-动作价值，并逐步学习更优策略。',
          prerequisites: ['状态 / 动作 / 奖励', '探索与利用'],
          experiment: '选择 Q-Learning，观察策略路径和成功率。',
          practice: '解释 epsilon 为什么要逐步衰减。'
        }
      ]
    }
  ];

  readonly practiceItems: PracticeItem[] = [
    {
      title: '判断算法适用场景',
      level: '基础',
      description: '给定数据集特征和任务目标，选择更合适的算法并说明理由。',
      tags: ['算法选择', '任务类型']
    },
    {
      title: '解释训练曲线变化',
      level: '进阶',
      description: '观察 loss / accuracy 曲线，判断是否存在震荡、欠拟合或过拟合迹象。',
      tags: ['Loss', 'Accuracy', '调参']
    },
    {
      title: '比较两个模型结果',
      level: '综合',
      description: '使用同一数据集对比两个算法，并从指标和可视化结果解释差异。',
      tags: ['模型对比', '实验复盘']
    }
  ];

  readonly calendarDays = [
    { label: '一', active: true },
    { label: '二', active: true },
    { label: '三', active: false },
    { label: '四', active: true },
    { label: '五', active: false },
    { label: '六', active: false },
    { label: '日', active: false }
  ];

  readonly achievementBadges = ['首次登录', '完成配置', '训练观察者', '实验复盘'];
  readonly weakPoints = ['损失函数与学习率关系', 'K-Means 的 K 值选择', '训练集 / 测试集区别'];

  activePage: PageKey = 'home';
  authMode: AuthMode = 'login';
  forgotMessage = '';
  registerUsername = '';
  registerEmail = '';
  registerPassword = '';
  registerPasswordConfirm = '';
  registerMessage = '';
  sidebarCollapsed = false;
  selectedPathNode: PathNode = this.pathGroups[0].nodes[0];

  // 算法实验室模式:单算法演示 / 算法对比
  labMode: 'single' | 'compare' = 'single';

  // 侧边栏实时聊天室输入
  chatDraft = '';

  // 练习题三级下钻状态:大类 -> 专题 -> 试题
  quizView: 'categories' | 'topics' | 'questions' = 'categories';
  quizSelectedGroup: PathGroup | null = null;
  quizSelectedNode: PathNode | null = null;
  quizOverview: QuizOverviewItem[] = [];
  quizOverviewLoading = false;
  quizQuestions: QuizQuestion[] = [];
  quizQuestionsLoading = false;
  quizAnswers: Record<number, number> = {};
  quizResult: QuizSubmitResult | null = null;
  quizResultByQuestion: Record<number, QuizSubmitDetail> = {};
  quizSubmitting = false;
  quizMessage = '';

  algorithms: AlgorithmMeta[] = [];
  datasets: DatasetMeta[] = [];
  experimentCases: ExperimentCase[] = [];
  activeConfig: ExperimentConfig | null = null;
  currentUser: UserProfile | null = null;
  experimentHistory: ExperimentRecord[] = [];
  experimentName = '';
  latestSessionId = '';
  saveMessage = '登录后可将当前配置保存到 experiment 表。';
  catalogLoading = true;
  caseLoading = true;
  historyLoading = false;
  saveLoading = false;

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly catalogApi: CatalogApiService,
    private readonly experimentCaseApi: ExperimentCaseApiService,
    private readonly experimentApi: ExperimentApiService,
    private readonly experimentContext: ExperimentContextService,
    private readonly authApi: AuthApiService,
    private readonly authSession: AuthSessionService,
    private readonly quizApi: QuizApiService,
    readonly chat: ChatSocketService
  ) {
    // 在聊天页时,消息变化后自动滚到底部(像微信那样)
    effect(() => {
      this.chat.messages();
      if (this.activePage === 'chat' && typeof window !== 'undefined') {
        setTimeout(() => this.scrollChatToBottom(), 0);
      }
    });
  }

  get currentPageMeta(): PageMeta {
    return this.pageMeta[this.activePage];
  }

  get userInitial(): string {
    return (this.currentUser?.displayName || '访').trim().slice(0, 1).toUpperCase();
  }

  get canSaveExperiment(): boolean {
    return !!this.currentUser && !!this.activeConfig && this.experimentName.trim().length > 0;
  }

  get selectedLearningTypeLabel(): string {
    return this.activeConfig ? this.labelFor(this.activeConfig.learningType) : '未选择';
  }

  get selectedAlgorithmName(): string {
    if (!this.activeConfig) {
      return '未选择';
    }
    return this.algorithms.find((item) => item.code === this.activeConfig?.algorithm)?.name
      ?? this.activeConfig.algorithm;
  }

  get selectedDatasetName(): string {
    if (!this.activeConfig) {
      return '未选择';
    }
    return this.datasets.find((item) => item.code === this.activeConfig?.dataset)?.name
      ?? this.activeConfig.dataset;
  }

  get algorithmGroups(): Array<{ label: string; items: AlgorithmMeta[] }> {
    return (['supervised', 'unsupervised', 'reinforcement'] as LearningType[])
      .map((type) => ({
        label: this.labelFor(type),
        items: this.algorithms.filter((item) => item.learningType === type)
      }))
      .filter((group) => group.items.length > 0);
  }

  get completedCourseCount(): number {
    return this.currentUser ? Math.min(3, 1 + this.experimentHistory.length) : 0;
  }

  get completedExperimentCount(): number {
    return this.experimentHistory.length;
  }

  get practiceAccuracy(): string {
    return this.experimentHistory.length > 0 ? '86%' : '待开始';
  }

  get currentLevel(): string {
    if (!this.currentUser) {
      return '访客';
    }
    return this.experimentHistory.length >= 3 ? '进阶学习者' : '入门学习者';
  }

  get todayTask(): string {
    if (this.activeConfig) {
      return `继续完成 ${this.selectedAlgorithmName} 的训练实验，并在结果分析页比较模型表现。`;
    }
    return '从课程路径选择一个知识节点，然后进入算法实验室完成一次可视化训练。';
  }

  get recommendedNextLesson(): string {
    if (!this.activeConfig) {
      return '数据与特征';
    }
    if (this.activeConfig.learningType === 'unsupervised') {
      return '聚类结果评价';
    }
    if (this.activeConfig.learningType === 'reinforcement') {
      return '探索与利用';
    }
    return '模型评估与过拟合';
  }

  get recentExperiments(): ExperimentRecord[] {
    return this.experimentHistory.slice(0, 5);
  }

  get currentParameterExplanation(): string {
    const algorithm = this.activeConfig?.algorithm;
    if (algorithm === 'kmeans') {
      return 'K 值控制聚类中心数量；迭代次数影响中心更新是否充分。';
    }
    if (algorithm === 'q_learning') {
      return 'epsilon 控制探索概率，gamma 控制未来奖励的重要性，学习率控制 Q 值更新幅度。';
    }
    if (algorithm === 'decision_tree' || algorithm === 'random_forest') {
      return '最大深度和最小分裂样本数会影响树模型复杂度，过大可能导致过拟合。';
    }
    if (algorithm === 'svm' || algorithm === 'logistic_regression' || algorithm === 'linear_regression') {
      return '学习率影响参数更新步长；正则化参数用于控制模型复杂度。';
    }
    return '选择算法后，这里会根据当前算法解释主要参数的含义。';
  }

  get currentOutputExplanation(): string {
    const algorithm = this.activeConfig?.algorithm;
    if (algorithm === 'kmeans') {
      return '输出重点是聚类中心、簇分布、Inertia 与 Silhouette 等聚类质量指标。';
    }
    if (algorithm === 'pca') {
      return '输出重点是二维投影、解释方差比例和重构误差。';
    }
    if (algorithm === 'q_learning') {
      return '输出重点是策略路径、成功率、平均奖励和 Q 值变化。';
    }
    return '输出重点是 Loss、Accuracy、预测分布、决策边界和模型评价指标。';
  }

  ngOnInit(): void {
    this.restoreSession();
    this.syncPageFromHash();
    this.applyResponsiveSidebarDefault();
    this.loadCatalogs();
    this.chat.connect(this.authSession.token);
  }

  /** 刷新后从持久化会话恢复登录态,使 Authorization 头与 currentUser 保持一致。 */
  private restoreSession(): void {
    const user = this.authSession.user;
    if (user) {
      this.currentUser = user;
      this.loadHistory();
    }
  }

  @HostListener('window:hashchange')
  handleHashChange(): void {
    this.syncPageFromHash();
  }

  @HostListener('window:resize')
  handleWindowResize(): void {
    this.applyResponsiveSidebarDefault();
  }

  beginLearning(): void {
    this.setPage(this.currentUser ? 'dashboard' : 'auth');
  }

  setPage(page: PageKey): void {
    this.activePage = page;
    if (page === 'quiz') {
      this.prepareQuizEntry();
    }
    if (page === 'chat' && typeof window !== 'undefined') {
      setTimeout(() => this.scrollChatToBottom(), 0);
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${page}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  private applyResponsiveSidebarDefault(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 820) {
      this.sidebarCollapsed = true;
    }
  }

  selectPathNode(node: PathNode): void {
    this.selectedPathNode = node;
  }

  // ----- 练习题(Quiz)-----

  /** 从课程路径“查看相关练习”深链直接进入该专题的试题。 */
  openRelatedQuiz(node: PathNode): void {
    const group = this.pathGroups.find((g) => g.nodes.some((n) => n.id === node.id)) ?? null;
    this.quizSelectedGroup = group;
    this.activePage = 'quiz';
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '#quiz');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.loadQuizOverview();
    this.openQuizTopic(node);
  }

  /** 进入练习页时重置到大类视图并刷新成绩概览。 */
  private prepareQuizEntry(): void {
    this.quizView = 'categories';
    this.quizSelectedGroup = null;
    this.quizSelectedNode = null;
    this.clearQuizAttempt();
    this.loadQuizOverview();
  }

  openQuizCategories(): void {
    this.quizView = 'categories';
    this.quizSelectedGroup = null;
    this.quizSelectedNode = null;
    this.clearQuizAttempt();
  }

  openQuizGroup(group: PathGroup): void {
    this.quizSelectedGroup = group;
    this.quizSelectedNode = null;
    this.quizView = 'topics';
    this.clearQuizAttempt();
  }

  backToQuizTopics(): void {
    if (this.quizSelectedGroup) {
      this.quizView = 'topics';
    } else {
      this.quizView = 'categories';
    }
    this.clearQuizAttempt();
  }

  openQuizTopic(node: PathNode): void {
    this.quizSelectedNode = node;
    this.quizView = 'questions';
    this.clearQuizAttempt();
    this.quizQuestionsLoading = true;
    const sub = this.quizApi.listQuestions(node.id).subscribe({
      next: (questions) => {
        this.quizQuestions = questions;
        this.quizQuestionsLoading = false;
      },
      error: (error: unknown) => {
        this.quizQuestions = [];
        this.quizQuestionsLoading = false;
        this.quizMessage = error instanceof Error ? error.message : '题目加载失败,请稍后重试。';
      }
    });
    this.subscriptions.add(sub);
  }

  selectQuizOption(questionId: number, optionIndex: number): void {
    if (this.quizResult) {
      return;
    }
    this.quizAnswers = { ...this.quizAnswers, [questionId]: optionIndex };
  }

  allQuizAnswered(): boolean {
    return this.quizQuestions.length > 0
      && this.quizQuestions.every((q) => this.quizAnswers[q.id] !== undefined && this.quizAnswers[q.id] !== null);
  }

  submitQuiz(): void {
    if (!this.quizSelectedNode || this.quizSubmitting || !this.allQuizAnswered()) {
      return;
    }
    this.quizSubmitting = true;
    this.quizMessage = '';
    const answers = this.quizQuestions.map((q) => ({
      questionId: q.id,
      selectedIndex: this.quizAnswers[q.id] ?? null
    }));
    const sub = this.quizApi.submit({ topicId: this.quizSelectedNode.id, answers }).subscribe({
      next: (result) => {
        this.quizResult = result;
        this.quizResultByQuestion = {};
        for (const detail of result.details) {
          this.quizResultByQuestion[detail.questionId] = detail;
        }
        this.applyQuizScoreToOverview(result);
        this.quizSubmitting = false;
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      error: (error: unknown) => {
        this.quizSubmitting = false;
        this.quizMessage = error instanceof Error ? error.message : '提交失败,请稍后重试。';
      }
    });
    this.subscriptions.add(sub);
  }

  retryQuiz(): void {
    this.clearQuizAttempt();
  }

  optionLetter(index: number): string {
    return ['A', 'B', 'C', 'D', 'E', 'F'][index] ?? String(index + 1);
  }

  topicQuestionCount(topicId: string): number {
    return this.findQuizOverview(topicId)?.questionCount ?? 0;
  }

  topicBestScore(topicId: string): number | null {
    const item = this.findQuizOverview(topicId);
    return item && item.bestScore !== null && item.bestScore !== undefined ? item.bestScore : null;
  }

  groupSolvedCount(group: PathGroup): number {
    return group.nodes.filter((node) => this.topicBestScore(node.id) !== null).length;
  }

  /** 仅清空一次作答的状态(答案/判分结果),不触发网络请求。 */
  private clearQuizAttempt(): void {
    this.quizAnswers = {};
    this.quizResult = null;
    this.quizResultByQuestion = {};
    this.quizSubmitting = false;
    this.quizMessage = '';
  }

  private findQuizOverview(topicId: string): QuizOverviewItem | undefined {
    return this.quizOverview.find((item) => item.topicId === topicId);
  }

  /** 提交后把本次成绩写回概览,使专题列表徽标即时更新(登录取最佳分,匿名取本次分)。 */
  private applyQuizScoreToOverview(result: QuizSubmitResult): void {
    const item = this.findQuizOverview(result.topicId);
    const shownScore = result.persisted && result.bestScore !== null ? result.bestScore : result.score;
    if (item) {
      item.bestScore = shownScore;
      item.correctCount = result.correctCount;
      item.totalCount = result.total;
      item.completed = true;
    }
  }

  private loadQuizOverview(): void {
    this.quizOverviewLoading = true;
    // 独立订阅 + 失败兜底:概览拉取失败不影响整页,也不清空已有徽标
    const sub = this.quizApi.getOverview().subscribe({
      next: (overview) => {
        this.quizOverview = overview;
        this.quizOverviewLoading = false;
      },
      error: () => {
        this.quizOverviewLoading = false;
      }
    });
    this.subscriptions.add(sub);
  }

  labelFor(learningType: string): string {
    return learningTypeLabels[learningType] ?? learningType;
  }

  handleRegister(): void {
    if (!this.registerUsername.trim() || !this.registerEmail.trim() || !this.registerPassword) {
      this.registerMessage = '请填写用户名、邮箱和密码。';
      return;
    }
    if (this.registerPassword !== this.registerPasswordConfirm) {
      this.registerMessage = '两次输入的密码不一致。';
      return;
    }
    this.registerMessage = '注册中…';
    const sub = this.authApi.register({
      username: this.registerUsername.trim(),
      email: this.registerEmail.trim(),
      password: this.registerPassword
    }).subscribe({
      next: (user) => {
        this.registerMessage = '';
        this.registerUsername = '';
        this.registerEmail = '';
        this.registerPassword = '';
        this.registerPasswordConfirm = '';
        this.handleLogin(user);
      },
      error: (error: unknown) => {
        this.registerMessage = error instanceof Error ? error.message : '注册失败，请稍后重试。';
      }
    });
    this.subscriptions.add(sub);
  }

  handleLogin(user: UserProfile): void {
    this.currentUser = user;
    this.authSession.setSession(user);
    this.saveMessage = `欢迎回来，${user.displayName}。`;
    this.loadHistory();
    this.chat.reconnectWithToken(this.authSession.token);
    this.setPage('dashboard');
  }

  handleLogout(): void {
    this.currentUser = null;
    this.authSession.clear();
    this.experimentHistory = [];
    this.saveMessage = '已退出登录。';
    this.chat.reconnectWithToken(null);
    this.setPage('home');
  }

  sendChat(): void {
    const text = this.chatDraft.trim();
    if (!text) {
      return;
    }
    this.chat.send(text);
    this.chatDraft = '';
  }

  isSelfMessage(message: ChatMessage): boolean {
    return !!this.currentUser && message.senderName === this.currentUser.displayName;
  }

  private scrollChatToBottom(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const el = document.getElementById('chat-scroll');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  handleConfigChange(config: ExperimentConfig): void {
    this.activeConfig = config;
    if (!this.experimentName.trim()) {
      this.experimentName = this.buildExperimentName(config);
    }
    this.experimentContext.patch({
      learningType: config.learningType,
      algorithm: config.algorithm,
      dataset: config.dataset,
      params: config.params,
      hasCustomDataset: !!config.customDataset
    });
  }

  handleSessionChange(session: TrainingSessionSummary): void {
    this.latestSessionId = session.sessionId;
    this.experimentContext.patch({
      latestSessionId: session.sessionId,
      trainingStatus: session.status
    });
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
        params: this.activeConfig.params,
        customDataset: this.activeConfig.customDataset ?? null
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
    const customDataset = this.readCustomDataset(config['customDataset']);

    this.activeConfig = {
      learningType,
      algorithm,
      dataset,
      params,
      customDataset
    };
    this.experimentName = record.name;
    this.latestSessionId = record.latestSessionId ?? '';
    this.saveMessage = `已载入实验 ${record.name} 的配置。`;
    this.setPage('lab');
  }

  applyCaseAndOpenLab(item: ExperimentCase): void {
    this.applyCase(item);
    this.setPage('lab');
  }

  applyCase(item: ExperimentCase): void {
    const config = item.config;
    const params = this.readParams(config['params']);
    const learningType = (typeof config['learningType'] === 'string' ? config['learningType'] : item.learningType) as LearningType;
    const algorithm = typeof config['algorithm'] === 'string' ? config['algorithm'] : item.algorithmCode;
    const dataset = typeof config['dataset'] === 'string' ? config['dataset'] : item.datasetCode;

    this.activeConfig = {
      learningType,
      algorithm,
      dataset,
      params,
      customDataset: null
    };
    this.experimentName = item.title;
    this.latestSessionId = '';
    this.saveMessage = `已载入预设案例「${item.title}」，可初始化训练并观察结果。`;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  reloadDatasets(): void {
    const sub = this.catalogApi.listDatasets().subscribe({
      next: (datasets) => {
        this.datasets = datasets;
      }
    });
    this.subscriptions.add(sub);
  }

  formatRecordParams(record: ExperimentRecord): string {
    const params = this.readParams(record.config['params']);
    const entries = Object.entries(params).slice(0, 2);
    if (entries.length === 0) {
      return '默认参数';
    }
    return entries.map(([key, value]) => `${key}: ${value}`).join(' / ');
  }

  private syncPageFromHash(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const hash = window.location.hash.replace('#', '') as PageKey;
    const allPages: PageKey[] = ['home', 'auth', ...this.appNavItems.map((item) => item.key)];
    if (allPages.includes(hash)) {
      this.activePage = hash;
      if (hash === 'quiz') {
        this.prepareQuizEntry();
      }
    }
  }

  private loadCatalogs(): void {
    this.catalogLoading = true;
    this.caseLoading = true;
    const sub = forkJoin({
      algorithms: this.catalogApi.listAlgorithms(),
      datasets: this.catalogApi.listDatasets(),
      cases: this.experimentCaseApi.listCases()
    }).subscribe({
      next: ({ algorithms, datasets, cases }) => {
        this.algorithms = algorithms;
        this.datasets = datasets;
        this.experimentCases = cases;
      },
      error: (error: unknown) => {
        this.saveMessage = error instanceof Error ? error.message : '元数据加载失败';
        this.catalogLoading = false;
        this.caseLoading = false;
      },
      complete: () => {
        this.catalogLoading = false;
        this.caseLoading = false;
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

  private readCustomDataset(raw: unknown): CustomDatasetPayload | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }

    const value = raw as Partial<CustomDatasetPayload>;
    if (
      value.sourceType !== 'csv'
      || typeof value.name !== 'string'
      || !Array.isArray(value.columns)
      || !Array.isArray(value.rows)
      || !Array.isArray(value.featureColumns)
    ) {
      return null;
    }

    return {
      name: value.name,
      sourceType: 'csv',
      columns: value.columns.filter((item): item is string => typeof item === 'string'),
      rows: value.rows as CustomDatasetPayload['rows'],
      featureColumns: value.featureColumns.filter((item): item is string => typeof item === 'string'),
      labelColumn: typeof value.labelColumn === 'string' ? value.labelColumn : null,
      sampleCount: typeof value.sampleCount === 'number' ? value.sampleCount : value.rows.length
    };
  }
}
