# 聊天室 + 算法对比 + 面板瘦身 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务实现。步骤用 `- [ ]` 复选框跟踪。

**Goal:** 删除线性回归无意义的预测分布；在侧边栏加 WebSocket 实时聊天室（在线人数+落库）；把算法对比重做后搬进实验室做成模式切换，并删除重复的实验记录卡片与旧对比面板。

**Architecture:** 三块相互独立。聊天用原生 WebSocket（后端 TextWebSocketHandler + H2 落库，前端原生 WebSocket，单全站房间）。算法对比纯前端复用现有训练接口跑两个 session。面板瘦身为删除/门控。

**Tech Stack:** Angular 19（独立组件、内联模板）、Spring Boot 3.3.5、MyBatis、H2、ECharts、spring-boot-starter-websocket。

## Global Constraints

- 后端包根：`com.example.mlplatform`；统一返回 `ApiResponse<T>`（WebSocket 除外，用裸 JSON）。
- 鉴权：token 经 `AuthService.resolveUserId(token)` 解析；WebSocket 用 URL `?token=` 传。
- H2 文件库 + `spring.sql.init.mode: always`，新表用 `CREATE TABLE IF NOT EXISTS`（在已有库上幂等建表）。
- 聊天默认：历史 50 条、消息 ≤500 字、单一全站房间；登录可发言、未登录只看。
- 对比固定数据集 `iris`，两对配对：logistic_regression vs svm、decision_tree vs random_forest。
- 不自动 git 提交（用户工作流）；每任务以"编译/构建/烟雾测试通过"为完成判据。
- 前端校验：`npm run build` 零新增告警；后端：`mvn -q compile`。

---

## Part 1 — 删除线性回归预测分布

### Task 1：门控预测分布块

**Files:**
- Modify: `src/app/features/training/model-explanation-panel.component.ts`（预测分布 `<article>` 的 `*ngIf`）

**Interfaces:**
- Consumes: 组件已有 `@Input() algorithm: string` 与 getter `distributionItems`。
- Produces: 无对外接口变化。

- [ ] **Step 1：改门控条件**

把预测分布块：
```html
<article class="explain-block" *ngIf="distributionItems.length > 0">
```
改为（回归任务不渲染）：
```html
<article class="explain-block" *ngIf="distributionItems.length > 0 && algorithm !== 'linear_regression'">
```

- [ ] **Step 2：构建验证**

Run: `npm run build`
Expected: 退出码 0，无新增告警。

- [ ] **Step 3：运行时手测**

实验室选线性回归→初始化→单步：模型解释面板不再出现"预测分布"块；切到 SVM/逻辑回归仍有"预测分布"，KMeans 仍有"簇分布"。

---

## Part 3 — 实验记录瘦身 + 算法对比搬入实验室

### Task 2：删除分析页重复卡片与旧对比面板

**Files:**
- Modify: `src/app/features/workbench/workbench-page.component.ts`（`*ngSwitchCase="'analysis'"` 段、import、构造器注入若有）
- Delete: `src/app/features/comparison/model-comparison-panel.component.ts`

**Interfaces:**
- Produces: 分析页只剩 `app-experiment-history-panel`。

- [ ] **Step 1：删模板里的 split-layout（我的实验记录卡片 + app-model-comparison-panel）**

定位 `<section *ngSwitchCase="'analysis'"` 内的 `<div class="split-layout"> ... </div>`（含 `我的实验记录` content-card 与 `<app-model-comparison-panel ...>`），整段删除，仅保留其后的 `<app-experiment-history-panel ...>`。

- [ ] **Step 2：删 import 与 imports 数组项**

删除文件顶部 `import { ModelComparisonPanelComponent } ...;` 及 `@Component({ imports: [...] })` 中的 `ModelComparisonPanelComponent`。

- [ ] **Step 3：删除组件文件**

删除 `src/app/features/comparison/model-comparison-panel.component.ts`。

- [ ] **Step 4：构建验证**

Run: `npm run build`
Expected: 退出码 0；无 "ModelComparisonPanelComponent" 相关报错。

### Task 3：实验室加 单算法/对比 模式切换 Tab

**Files:**
- Modify: `src/app/features/workbench/workbench-page.component.ts`（lab 段模板 + 新字段 `labMode`）

**Interfaces:**
- Produces: 字段 `labMode: 'single' | 'compare' = 'single'`；模板用其切换 lab body。

- [ ] **Step 1：加字段**

在组件类字段区（`selectedPathNode` 附近）加：
```ts
labMode: 'single' | 'compare' = 'single';
```

- [ ] **Step 2：lab 标题卡下方加 Tab**

在 `*ngSwitchCase="'lab'"` 的标题卡（`lab-top` 之前或之内）下方插入：
```html
<div class="lab-mode-tabs">
  <button type="button" [class.active]="labMode === 'single'" (click)="labMode = 'single'">单算法演示</button>
  <button type="button" [class.active]="labMode === 'compare'" (click)="labMode = 'compare'">算法对比</button>
</div>
```

- [ ] **Step 3：把现有 lab 主体包到 single 分支，compare 放新组件**

把现有 `lab-top` + `lab-grid` + `lab-results` 用 `<ng-container *ngIf="labMode === 'single'"> ... </ng-container>` 包住；其后加：
```html
<app-algorithm-comparison-panel *ngIf="labMode === 'compare'" [datasets]="datasets" [algorithms]="algorithms"></app-algorithm-comparison-panel>
```

- [ ] **Step 4：加 Tab 样式**

在 styles 加：
```css
.lab-mode-tabs { display: flex; gap: 8px; margin: 4px 0 16px; }
.lab-mode-tabs button { padding: 8px 16px; border: 1px solid var(--border-strong, #e5e7eb); background: #fff; border-radius: 999px; cursor: pointer; font-weight: 700; color: var(--text-muted, #6b7280); }
.lab-mode-tabs button.active { background: #1c2024; color: #fff; border-color: #1c2024; }
```

- [ ] **Step 5：构建验证（此时 import 未加会报错，下一任务补全后再构建）**

记：先做 Task 4 创建组件并 import，再统一 `npm run build`。

### Task 4：新建算法对比组件

**Files:**
- Create: `src/app/features/comparison/algorithm-comparison-panel.component.ts`
- Modify: `workbench-page.component.ts`（import + imports 数组加 `AlgorithmComparisonPanelComponent`）

**Interfaces:**
- Consumes: `TrainingApiService`（initTraining/stepTraining/getTrainingStatus）、`TwoDimensionalVisualizerComponent`、`AlgorithmMeta`/`DatasetMeta`/`TrainingStatusResponse`。
- Produces: selector `app-algorithm-comparison-panel`，`@Input() algorithms` `@Input() datasets`。

- [ ] **Step 1：创建组件骨架（配对+控件+左右两栏+下方共享 Accuracy 图）**

要点（mirror `training-control-panel` 的 `buildInitPayload`，数据集固定 iris，mode 固定 classification）：
```ts
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AlgorithmMeta, DatasetMeta, TrainingStatusResponse } from '../../core/models/platform.models';
import { TrainingApiService } from '../../core/services/training-api.service';
import { TwoDimensionalVisualizerComponent } from '../../shared/components/two-dimensional-visualizer.component';

interface ComparePair { key: string; label: string; a: string; b: string; }
interface CompareSide { algorithm: string; name: string; sessionId: string; status: TrainingStatusResponse | null; accHistory: number[]; }

@Component({
  selector: 'app-algorithm-comparison-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TwoDimensionalVisualizerComponent],
  template: `... 见下 ...`,
  styles: [`... 见下 ...`]
})
export class AlgorithmComparisonPanelComponent implements OnDestroy {
  @Input() algorithms: AlgorithmMeta[] = [];
  @Input() datasets: DatasetMeta[] = [];

  readonly pairs: ComparePair[] = [
    { key: 'lr_svm', label: '逻辑回归 vs SVM', a: 'logistic_regression', b: 'svm' },
    { key: 'tree_forest', label: '决策树 vs 随机森林', a: 'decision_tree', b: 'random_forest' }
  ];
  readonly datasetId = 'iris';
  selectedPairKey = this.pairs[0].key;
  maxSteps = 30;
  sideA: CompareSide | null = null;
  sideB: CompareSide | null = null;
  loading = false;
  autoRunning = false;
  message = '';
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly subs = new Subscription();

  constructor(private readonly trainingApi: TrainingApiService) {}

  get pair(): ComparePair { return this.pairs.find(p => p.key === this.selectedPairKey)!; }
  algoName(code: string): string { return this.algorithms.find(a => a.code === code)?.name ?? code; }
  ngOnDestroy(): void { this.clearTimer(); this.subs.unsubscribe(); }
  // initBoth() / stepBoth() / toggleAuto() / pause() / refresh() 见 Step 2
  private clearTimer(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
}
```

- [ ] **Step 2：实现 initBoth / stepBoth / 自动 / payload**

```ts
private buildPayload(algorithm: string): Record<string, unknown> {
  const hyperParams: Record<string, unknown> = {};
  if (algorithm === 'svm') { hyperParams['kernel'] = 'linear'; hyperParams['learningRate'] = 0.01; hyperParams['cValue'] = 1.0; }
  if (algorithm === 'logistic_regression') { hyperParams['learningRate'] = 0.05; hyperParams['maxIter'] = 100; hyperParams['fitIntercept'] = true; }
  if (algorithm === 'decision_tree') { hyperParams['maxDepth'] = 4; hyperParams['criterion'] = 'gini'; hyperParams['minSamplesSplit'] = 2; }
  if (algorithm === 'random_forest') { hyperParams['nEstimators'] = 30; hyperParams['treesPerStep'] = 5; hyperParams['maxDepth'] = 4; hyperParams['minSamplesSplit'] = 2; }
  return { algorithm, datasetId: this.datasetId, featureColumns: ['x1', 'x2'], labelColumn: 'label', hyperParams, trainConfig: { maxSteps: this.maxSteps } };
}

initBoth(): void {
  this.clearTimer(); this.autoRunning = false; this.loading = true; this.message = '';
  const p = this.pair;
  this.sideA = { algorithm: p.a, name: this.algoName(p.a), sessionId: '', status: null, accHistory: [] };
  this.sideB = { algorithm: p.b, name: this.algoName(p.b), sessionId: '', status: null, accHistory: [] };
  this.initSide(this.sideA); this.initSide(this.sideB);
}
private initSide(side: CompareSide): void {
  const sub = this.trainingApi.initTraining(this.buildPayload(side.algorithm)).subscribe({
    next: (res) => { side.sessionId = res.sessionId; this.refreshSide(side); this.loading = false; },
    error: (e: unknown) => { this.loading = false; this.message = e instanceof Error ? e.message : '初始化失败'; }
  });
  this.subs.add(sub);
}
private refreshSide(side: CompareSide): void {
  if (!side.sessionId) return;
  const sub = this.trainingApi.getTrainingStatus(side.sessionId).subscribe({ next: (s) => this.applyStatus(side, s) });
  this.subs.add(sub);
}
stepBoth(): void { if (this.sideA) this.stepSide(this.sideA); if (this.sideB) this.stepSide(this.sideB); }
private stepSide(side: CompareSide): void {
  if (!side.sessionId) return;
  const sub = this.trainingApi.stepTraining(side.sessionId, 1).subscribe({ next: (s) => this.applyStatus(side, s) });
  this.subs.add(sub);
}
private applyStatus(side: CompareSide, s: TrainingStatusResponse): void {
  side.status = s;
  const acc = Number(s.metrics?.['accuracy'] ?? s.metrics?.['Accuracy'] ?? NaN);
  if (!Number.isNaN(acc)) side.accHistory = [...side.accHistory, acc];
}
toggleAuto(): void {
  if (this.autoRunning) { this.pauseAuto(); return; }
  this.autoRunning = true;
  this.timer = setInterval(() => {
    const done = (side: CompareSide | null) => !side || (side.status ? side.status.currentStep >= side.status.maxSteps : false);
    if (done(this.sideA) && done(this.sideB)) { this.pauseAuto(); return; }
    this.stepBoth();
  }, 800);
}
pauseAuto(): void { this.autoRunning = false; this.clearTimer(); }
```

- [ ] **Step 3：模板（两栏 + 下方 Accuracy 叠加）**

```html
<section class="content-card compare-card">
  <div class="section-heading"><span>Compare</span><h2>算法对比</h2><p>在同一数据集（Iris）上同步训练两个算法，对比决策边界与 Accuracy。</p></div>
  <div class="compare-controls">
    <label><span>对比配对</span>
      <select [(ngModel)]="selectedPairKey">
        <option *ngFor="let p of pairs" [ngValue]="p.key">{{ p.label }}</option>
      </select>
    </label>
    <label><span>最大步数</span><input type="number" min="5" max="100" [(ngModel)]="maxSteps" /></label>
    <div class="compare-actions">
      <button class="primary-action" type="button" (click)="initBoth()" [disabled]="loading">初始化两者</button>
      <button type="button" (click)="stepBoth()" [disabled]="!sideA?.sessionId">单步</button>
      <button type="button" (click)="toggleAuto()" [disabled]="!sideA?.sessionId">{{ autoRunning ? '暂停' : '自动' }}</button>
    </div>
  </div>
  <p class="compare-msg" *ngIf="message">{{ message }}</p>
  <div class="compare-grid" *ngIf="sideA && sideB">
    <div class="compare-col">
      <h3>{{ sideA.name }} · Acc {{ (sideA.accHistory.length ? (sideA.accHistory[sideA.accHistory.length-1] | number:'1.0-3') : '-') }}</h3>
      <app-two-dimensional-visualizer [title]="sideA.name" subtitle="决策边界" mode="classification" [chartData]="sideA.status?.visualization || { points: [], boundary: [], centers: [] }"></app-two-dimensional-visualizer>
    </div>
    <div class="compare-col">
      <h3>{{ sideB.name }} · Acc {{ (sideB.accHistory.length ? (sideB.accHistory[sideB.accHistory.length-1] | number:'1.0-3') : '-') }}</h3>
      <app-two-dimensional-visualizer [title]="sideB.name" subtitle="决策边界" mode="classification" [chartData]="sideB.status?.visualization || { points: [], boundary: [], centers: [] }"></app-two-dimensional-visualizer>
    </div>
  </div>
  <div class="compare-metric" *ngIf="sideA && sideB">
    <canvas #accChart></canvas>  <!-- 或用已有 metric-trend-chart 的多序列；见 Step 4 -->
  </div>
</section>
```

- [ ] **Step 4：共享 Accuracy 叠加图**

先查 `src/app/shared/components/metric-trend-chart.component.ts` 是否支持多序列输入；
- 若支持：用它，传两条序列（sideA.accHistory / sideB.accHistory）。
- 若不支持：在本组件内用 ECharts 画一个双折线 mini chart（x=步、两条线=两算法 Accuracy），随 accHistory 变化 setOption。

- [ ] **Step 5：workbench import 组件**

`workbench-page.component.ts` 顶部加 `import { AlgorithmComparisonPanelComponent } from '../../comparison/algorithm-comparison-panel.component';`（按实际相对路径），并加入 `@Component.imports`。

- [ ] **Step 6：构建验证**

Run: `npm run build`
Expected: 退出码 0。

- [ ] **Step 7：运行时手测**

实验室→算法对比 Tab→选两对配对→初始化两者→单步/自动：两栏决策边界同步演化，下方两条 Accuracy 曲线对比；切回单算法演示原功能正常。

---

## Part 2 — 侧边栏实时聊天室（WebSocket + 落库）

### Task 5：后端依赖 + chat_message 表 + 实体 + Mapper

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/resources/schema.sql`
- Create: `backend/src/main/java/com/example/mlplatform/persistence/entity/ChatMessageEntity.java`
- Create: `backend/src/main/java/com/example/mlplatform/persistence/mapper/ChatMessageMapper.java`

- [ ] **Step 1：加依赖**

`pom.xml` 在 dependencies 加：
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

- [ ] **Step 2：建表（在某张已有表 CREATE 之前插入）**

`schema.sql` 加：
```sql
CREATE TABLE IF NOT EXISTS chat_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_user_id BIGINT,
    sender_name VARCHAR(64) NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

- [ ] **Step 3：实体**

```java
package com.example.mlplatform.persistence.entity;
import java.time.LocalDateTime;
public class ChatMessageEntity {
    private Long id; private Long senderUserId; private String senderName; private String content; private LocalDateTime createdAt;
    // getters/setters 全字段
}
```

- [ ] **Step 4：Mapper**

```java
package com.example.mlplatform.persistence.mapper;
import com.example.mlplatform.persistence.entity.ChatMessageEntity;
import org.apache.ibatis.annotations.*;
import java.util.List;
@Mapper
public interface ChatMessageMapper {
    @Insert("INSERT INTO chat_message (sender_user_id, sender_name, content, created_at) VALUES (#{senderUserId}, #{senderName}, #{content}, #{createdAt})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(ChatMessageEntity msg);

    @Select("SELECT id, sender_user_id AS senderUserId, sender_name AS senderName, content, created_at AS createdAt FROM chat_message ORDER BY id DESC LIMIT #{limit}")
    List<ChatMessageEntity> findRecent(int limit);
}
```

- [ ] **Step 5：编译**

Run: `cd backend && mvn -q compile`
Expected: 退出码 0。

### Task 6：ChatService（落库 + 取最近 + 解析显示名）

**Files:**
- Create: `backend/src/main/java/com/example/mlplatform/service/ChatService.java`
- Create: `backend/src/main/java/com/example/mlplatform/service/impl/ChatServiceImpl.java`
- Modify (若无 findById): `backend/src/main/java/com/example/mlplatform/persistence/mapper/UserMapper.java`
- Test: `backend/src/test/java/com/example/mlplatform/ChatServiceTest.java`

**Interfaces:**
- Produces: `List<ChatMessageEntity> recent(int limit)`；`ChatMessageEntity save(Long userId, String senderName, String content)`；`String displayNameOf(Long userId)`。

- [ ] **Step 1：确认/补 UserMapper.findById**

若 `UserMapper` 无按 id 查询，加：
```java
@Select("SELECT id, username, display_name AS displayName, role FROM app_user WHERE id = #{id}")
UserEntity findById(Long id);
```

- [ ] **Step 2：Service 接口**

```java
package com.example.mlplatform.service;
import com.example.mlplatform.persistence.entity.ChatMessageEntity;
import java.util.List;
public interface ChatService {
    List<ChatMessageEntity> recent(int limit);
    ChatMessageEntity save(Long userId, String senderName, String content);
    String displayNameOf(Long userId);
}
```

- [ ] **Step 3：失败测试（recent 倒序取回 + save 落库）**

```java
package com.example.mlplatform;
import com.example.mlplatform.service.ChatService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
class ChatServiceTest {
    @Autowired ChatService chatService;
    @Test void saveThenRecentReturnsIt() {
        chatService.save(null, "访客A", "hello-" + System.nanoTime());
        assertFalse(chatService.recent(50).isEmpty());
    }
}
```

- [ ] **Step 4：跑测试确认失败（未实现）**

Run: `cd backend && mvn -q -Dtest=ChatServiceTest test`
Expected: FAIL（无 ChatService bean）。

- [ ] **Step 5：实现**

```java
package com.example.mlplatform.service.impl;
import com.example.mlplatform.persistence.entity.ChatMessageEntity;
import com.example.mlplatform.persistence.entity.UserEntity;
import com.example.mlplatform.persistence.mapper.ChatMessageMapper;
import com.example.mlplatform.persistence.mapper.UserMapper;
import com.example.mlplatform.service.ChatService;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
@Service
public class ChatServiceImpl implements ChatService {
    private final ChatMessageMapper chatMapper; private final UserMapper userMapper;
    public ChatServiceImpl(ChatMessageMapper chatMapper, UserMapper userMapper) { this.chatMapper = chatMapper; this.userMapper = userMapper; }
    public List<ChatMessageEntity> recent(int limit) { return chatMapper.findRecent(limit); }
    public ChatMessageEntity save(Long userId, String senderName, String content) {
        ChatMessageEntity m = new ChatMessageEntity();
        m.setSenderUserId(userId); m.setSenderName(senderName); m.setContent(content); m.setCreatedAt(LocalDateTime.now());
        chatMapper.insert(m); return m;
    }
    public String displayNameOf(Long userId) {
        if (userId == null) return null;
        UserEntity u = userMapper.findById(userId); return u == null ? null : u.getDisplayName();
    }
}
```

- [ ] **Step 6：跑测试确认通过**

Run: `cd backend && mvn -q -Dtest=ChatServiceTest test`
Expected: PASS。

### Task 7：WebSocket handler + 配置

**Files:**
- Create: `backend/src/main/java/com/example/mlplatform/websocket/ChatWebSocketHandler.java`
- Create: `backend/src/main/java/com/example/mlplatform/config/WebSocketConfig.java`

**Interfaces:**
- Consumes: `ChatService`、`AuthService.resolveUserId`、`ObjectMapper`。
- Produces: WebSocket 端点 `/ws/chat`。

- [ ] **Step 1：Handler**

要点：CopyOnWriteArraySet 存 session；连接时解析 `?token=`→userId→displayName 存 attributes，推 history + 广播 presence；收消息时未登录拒发，登录则 save+广播 message；关闭移除+广播 presence。
```java
package com.example.mlplatform.websocket;
import com.example.mlplatform.persistence.entity.ChatMessageEntity;
import com.example.mlplatform.service.AuthService;
import com.example.mlplatform.service.ChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;
public class ChatWebSocketHandler extends TextWebSocketHandler {
    private final ChatService chatService; private final AuthService authService; private final ObjectMapper om;
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    public ChatWebSocketHandler(ChatService c, AuthService a, ObjectMapper o){ this.chatService=c; this.authService=a; this.om=o; }

    @Override public void afterConnectionEstablished(WebSocketSession s) throws Exception {
        String token = queryParam(s, "token");
        Long userId = (token==null||token.isBlank())? null : authService.resolveUserId(token.startsWith("Bearer ")?token.substring(7):token);
        s.getAttributes().put("userId", userId);
        s.getAttributes().put("name", userId==null? null : chatService.displayNameOf(userId));
        sessions.add(s);
        // history（倒序取，正序发）
        List<ChatMessageEntity> recent = chatService.recent(50);
        Collections.reverse(recent);
        List<Map<String,Object>> arr = new ArrayList<>();
        for (ChatMessageEntity m: recent) arr.add(msgMap(m));
        send(s, Map.of("type","history","messages",arr));
        broadcast(Map.of("type","presence","online",sessions.size()));
    }
    @Override protected void handleTextMessage(WebSocketSession s, TextMessage message) throws Exception {
        Long userId = (Long) s.getAttributes().get("userId");
        String name = (String) s.getAttributes().get("name");
        if (userId==null || name==null) { send(s, Map.of("type","error","message","登录后才能发言")); return; }
        Map<?,?> in = om.readValue(message.getPayload(), Map.class);
        String content = String.valueOf(in.get("content")).trim();
        if (content.isEmpty()) return;
        if (content.length()>500) content = content.substring(0,500);
        ChatMessageEntity saved = chatService.save(userId, name, content);
        broadcast(Map.of("type","message","message", msgMap(saved)));
    }
    @Override public void afterConnectionClosed(WebSocketSession s, CloseStatus status) { sessions.remove(s); broadcast(Map.of("type","presence","online",sessions.size())); }

    private Map<String,Object> msgMap(ChatMessageEntity m){ Map<String,Object> x=new HashMap<>(); x.put("id",m.getId()); x.put("senderName",m.getSenderName()); x.put("content",m.getContent()); x.put("createdAt", String.valueOf(m.getCreatedAt())); return x; }
    private void broadcast(Object payload){ sessions.forEach(s -> send(s, payload)); }
    private void send(WebSocketSession s, Object payload){ try { if (s.isOpen()) s.sendMessage(new TextMessage(om.writeValueAsString(payload))); } catch (Exception e){ sessions.remove(s); } }
    private String queryParam(WebSocketSession s, String key){ var q = s.getUri()==null?null:s.getUri().getQuery(); if(q==null) return null; for(String kv: q.split("&")){ var p=kv.split("=",2); if(p.length==2 && p[0].equals(key)) return java.net.URLDecoder.decode(p[1], java.nio.charset.StandardCharsets.UTF_8);} return null; }
}
```

- [ ] **Step 2：配置注册端点**

```java
package com.example.mlplatform.config;
import com.example.mlplatform.service.AuthService;
import com.example.mlplatform.service.ChatService;
import com.example.mlplatform.websocket.ChatWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final ChatService chatService; private final AuthService authService; private final ObjectMapper om;
    public WebSocketConfig(ChatService c, AuthService a, ObjectMapper o){ this.chatService=c; this.authService=a; this.om=o; }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry r){
        r.addHandler(new ChatWebSocketHandler(chatService, authService, om), "/ws/chat").setAllowedOriginPatterns("*");
    }
}
```

- [ ] **Step 3：编译**

Run: `cd backend && mvn -q compile`
Expected: 退出码 0。

### Task 8：前端聊天模型 + WebSocket 服务

**Files:**
- Modify: `src/app/core/models/platform.models.ts`（聊天模型）
- Create: `src/app/core/services/chat-socket.service.ts`

**Interfaces:**
- Produces: `ChatMessage`、`ChatSocketService`（`messages` signal/Subject、`online` signal、`connect(token)`、`send(content)`、`disconnect()`）。

- [ ] **Step 1：模型**

```ts
export interface ChatMessage { id?: number; senderName: string; content: string; createdAt: string; }
```

- [ ] **Step 2：服务（原生 WebSocket + 重连）**

```ts
import { Injectable, signal } from '@angular/core';
import { ChatMessage } from '../models/platform.models';
@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  readonly messages = signal<ChatMessage[]>([]);
  readonly online = signal(0);
  readonly connected = signal(false);
  readonly lastError = signal('');
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private retry = 0;
  private manualClose = false;

  connect(token: string | null): void {
    this.token = token; this.manualClose = false; this.open();
  }
  private open(): void {
    if (typeof window === 'undefined') return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws/chat` + (this.token ? `?token=${encodeURIComponent(this.token)}` : '');
    this.ws = new WebSocket(url);
    this.ws.onopen = () => { this.connected.set(true); this.retry = 0; };
    this.ws.onmessage = (ev) => this.handle(ev.data);
    this.ws.onclose = () => { this.connected.set(false); if (!this.manualClose) this.scheduleReconnect(); };
    this.ws.onerror = () => { this.lastError.set('聊天连接异常'); };
  }
  private handle(raw: string): void {
    let m: any; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'history') this.messages.set(m.messages ?? []);
    else if (m.type === 'message') this.messages.update(list => [...list, m.message].slice(-200));
    else if (m.type === 'presence') this.online.set(m.online ?? 0);
    else if (m.type === 'error') this.lastError.set(m.message ?? '发送失败');
  }
  private scheduleReconnect(): void { this.retry = Math.min(this.retry + 1, 6); setTimeout(() => this.open(), 1000 * this.retry); }
  send(content: string): void { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ content })); }
  reconnectWithToken(token: string | null): void { this.token = token; this.manualClose = true; this.ws?.close(); this.manualClose = false; this.open(); }
  disconnect(): void { this.manualClose = true; this.ws?.close(); this.ws = null; }
}
```

- [ ] **Step 3：构建验证**

Run: `npm run build`
Expected: 退出码 0。

### Task 9：侧边栏聊天面板 UI

**Files:**
- Modify: `src/app/features/workbench/workbench-page.component.ts`（侧边栏 aside 底部加面板 + 注入 ChatSocketService + 连接时机 + 样式）

**Interfaces:**
- Consumes: `ChatSocketService`、`AuthSessionService`（token / 登录态）。

- [ ] **Step 1：注入 + 生命周期连接**

构造器注入 `private readonly chat: ChatSocketService`；`ngOnInit` 末尾 `this.chat.connect(this.authSession.token);`；登录成功(`handleLogin`)后 `this.chat.reconnectWithToken(this.authSession.token);`；登出后同样重连为匿名。

- [ ] **Step 2：侧边栏底部面板模板**

在 `学习中心` 侧边栏 aside 底部加（折叠态可隐藏）：
```html
<section class="side-chat" *ngIf="!sidebarCollapsed">
  <div class="side-chat-head">
    <strong>实时聊天室</strong>
    <span class="online-badge">在线 {{ chat.online() }}</span>
  </div>
  <div class="side-chat-list">
    <div class="chat-row" *ngFor="let m of chat.messages()">
      <span class="chat-name">{{ m.senderName }}</span>
      <span class="chat-text">{{ m.content }}</span>
    </div>
  </div>
  <div class="side-chat-input" *ngIf="currentUser; else loginHint">
    <input [(ngModel)]="chatDraft" (keyup.enter)="sendChat()" maxlength="500" placeholder="说点什么…" />
    <button type="button" (click)="sendChat()">发送</button>
  </div>
  <ng-template #loginHint><p class="chat-login-hint">登录后参与聊天</p></ng-template>
</section>
```

- [ ] **Step 3：字段 + 发送方法**

```ts
chatDraft = '';
sendChat(): void { const t = this.chatDraft.trim(); if (!t) return; this.chat.send(t); this.chatDraft = ''; }
```
（`chat` 需是 public 以便模板访问，或加 getter。）

- [ ] **Step 4：样式**

加 `.side-chat`（flex 列、最大高度 + 滚动）、`.online-badge`（绿色小圆点风）、`.chat-row`、`.side-chat-input`（输入+按钮行）、`.chat-login-hint`（灰字）。

- [ ] **Step 5：构建验证**

Run: `npm run build`
Expected: 退出码 0。

### Task 10：dev 代理 + 生产 nginx

**Files:**
- Modify: `proxy.conf.json`
- Modify: `deploy/nginx.conf`

- [ ] **Step 1：dev 代理加 /ws**

`proxy.conf.json` 加键：
```json
"/ws": { "target": "http://localhost:8080", "ws": true, "secure": false }
```
（提示用户：`start-all.ps1` 生成的 `proxy.local.json`（端口 8081）也加同样条目。）

- [ ] **Step 2：nginx 加 /ws/ location**

`deploy/nginx.conf` 在 server 块加：
```nginx
location /ws/ {
    proxy_pass http://backend:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

### Task 11：聊天端到端烟雾测试

**Files:** 无（仅验证）

- [ ] **Step 1：打包并隔离启动（mem 库 + 8099）**

Run: `cd backend && mvn -q -DskipTests package && java -jar target/mlplatform-backend-0.0.1-SNAPSHOT.jar --server.port=8099 "--spring.datasource.url=jdbc:h2:mem:chattest;MODE=MYSQL;DB_CLOSE_DELAY=-1"`

- [ ] **Step 2：WS 连接测试（登录 token 发言 + 落库 + 广播 + 在线数）**

用 Node（若有 `ws`）或 Python `websockets`：登录拿 token→连 `ws://localhost:8099/ws/chat?token=...`→收 history+presence→发 `{"content":"hi"}`→应收到 type=message；再开第二条匿名连接→第一条应收到 presence online=2，且匿名发消息收到 type=error。
Expected: 行为符合；DB `chat_message` 有该行。

- [ ] **Step 3：关闭隔离实例**

---

## Self-Review（写完计划后自查）

- **Spec 覆盖**：Part1 门控✓(Task1)；Part2 聊天：依赖/表/实体/Mapper✓(T5) 服务+测试✓(T6) handler+config✓(T7) 前端服务✓(T8) 侧栏UI✓(T9) 代理/nginx✓(T10) 烟雾✓(T11)；Part3 删除✓(T2) Tab✓(T3) 对比组件✓(T4)。
- **占位符**：无 TBD/TODO；代码块均给出具体内容（前端大组件给详细骨架 + 明确补全点：metric 图多序列判断、样式细节）。
- **类型一致**：`CompareSide`/`ComparePair` 一致；`ChatMessage`/`ChatSocketService` 方法名 connect/send/reconnectWithToken/disconnect 一致；后端 `ChatService` 三方法签名一致；`ChatMessageMapper.insert/findRecent` 与 service 调用一致。
- **风险点**：dev 的 `proxy.local.json`（仓库外，start-all.ps1 生成）需用户手动加 `/ws`——已在 T10 标注。

