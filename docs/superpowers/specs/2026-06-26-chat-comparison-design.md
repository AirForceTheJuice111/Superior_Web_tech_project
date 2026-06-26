# 设计：删除回归预测分布 + 侧边栏实时聊天室 + 算法对比搬入实验室

> 日期：2026-06-26
> 状态：已与用户确认，待转实现计划
> 范围：3 个相互独立的改动，建议实现顺序 Part1 → Part3 → Part2

## 背景

用户对 ML 可视化平台提出三处改动：
1. 线性回归的「模型解释面板 / 预测分布」对回归任务无意义（一堆各计数 1 的连续值），删除。
2. 在左侧「学习中心」侧边栏加实时聊天室：显示在线人数 + 实时聊天内容。
3. 实验记录瘦身（删与实验历史重复的卡片 + 删旧算法对比面板），把「算法对比」重做后搬进算法实验室，做成模式切换。

---

## Part 1 — 删除线性回归的「预测分布」

- 文件：`src/app/features/training/model-explanation-panel.component.ts`
- 做法：预测分布块（`*ngIf="distributionItems.length > 0"`）增加条件，算法为 `linear_regression` 时不渲染。
- 不影响分类（预测分布）与 KMeans（簇分布）。
- 仅前端一处。

---

## Part 2 — 侧边栏实时聊天室（WebSocket + 落库）

### 技术选型
- 后端：`spring-boot-starter-websocket`，原生 `TextWebSocketHandler`（不引 STOMP/SockJS）。
- 前端：浏览器原生 `WebSocket`。
- 在线人数 = 当前打开的 WebSocket 连接数。
- 单一全站聊天室。

### 后端
- 新表 `chat_message`：
  - `id BIGINT AUTO_INCREMENT PK`
  - `sender_user_id BIGINT`（可空，匿名为 null；登录用户为其 id）
  - `sender_name VARCHAR(64)`（发言显示名）
  - `content VARCHAR(500)`
  - `created_at TIMESTAMP`
- `persistence/entity/ChatMessageEntity.java` + `persistence/mapper/ChatMessageMapper.java`
  - `insert(ChatMessageEntity)`（`useGeneratedKeys`）
  - `findRecent(int limit)`（按 created_at 倒序取 N，前端正序展示）
- `service/ChatService.java` + `impl/ChatServiceImpl.java`
  - `List<ChatMessageEntity> recent(int limit)`
  - `ChatMessageEntity save(Long userId, String senderName, String content)`
  - 解析发言者显示名：由 token→userId→`UserMapper.findById` 取 displayName（若 UserMapper 无 findById 则补一个）。
- `websocket/ChatWebSocketHandler.java`（extends `TextWebSocketHandler`）
  - 维护 `Set<WebSocketSession>`（线程安全，CopyOnWriteArraySet）。
  - `afterConnectionEstablished`：从 `session.getUri()` 查询参数取 `token`，用 `AuthService.resolveUserId` 解析；把 userId/displayName 存入 `session.getAttributes()`；加入集合；向本连接推 `history`（最近 50 条）；向全体广播 `presence`（在线数）。
  - `handleTextMessage`：解析 `{content}`；若 session 无登录身份→回 `error`（未登录不能发言）；否则 `ChatService.save` 落库 + 向全体广播 `message`。
  - `afterConnectionClosed`：移除 session；广播 `presence`。
  - 广播失败的死连接要剔除。
- `config/WebSocketConfig.java`（`@EnableWebSocket implements WebSocketConfigurer`）：注册 handler 到 `/ws/chat`，允许跨域来源同 CORS 配置。

### WebSocket 消息协议（JSON，带 type）
- 服务端→客户端：
  - `{"type":"history","messages":[{id,senderName,content,createdAt,self?}...]}`
  - `{"type":"message","message":{id,senderName,content,createdAt}}`
  - `{"type":"presence","online":N}`
  - `{"type":"error","message":"未登录不能发言"}`
- 客户端→服务端：`{"content":"..."}`

### 鉴权
- 前端连接 URL 带 `?token=`（原生 WS 无法设置请求头，用查询参数；本项目为演示 token，可接受）。
- 未登录：可连接、可收 history/presence，但发言被后端拒绝；前端隐藏输入框，提示「登录后参与聊天」。

### 前端
- `core/services/chat-socket.service.ts`：封装 WebSocket 连接、断线重连（指数退避）、消息流（Subject/signal）、在线数、发送方法。
- 侧边栏底部「实时聊天室」可折叠面板（在 workbench 侧边栏 aside 内）：
  - 头部：标题 + 在线人数徽标 + 折叠按钮。
  - 消息列表（自己发的右对齐/高亮，他人左对齐，显示昵称+时间）。
  - 底部输入框 + 发送（登录可见；未登录显示提示）。
- 进入应用即连接（登录后带 token 重连以获得发言权）。

### 代理 / 部署
- dev：`proxy.conf.json` 增 `"/ws": { "target": "http://localhost:8080", "ws": true, "secure": false }`。
- 生产：`deploy/nginx.conf` 增 `location /ws/`：`proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_read_timeout 3600s;`。
- ⚠️ 用户的 `start-all.ps1`（仓库外）生成的 `proxy.local.json` 也需同样的 `/ws` 条目（端口 8081）——提供片段提示用户加。

### 默认值（可调）
- 历史 50 条；消息上限 500 字；单一全站房间。

---

## Part 3 — 实验记录瘦身 + 算法对比搬入实验室

### 删除
- 分析页（`*ngSwitchCase="'analysis'"`）顶部「我的实验记录」卡片（与下方实验历史重复）。
- 「算法对比」面板：移除 `app-model-comparison-panel` 用法，并删除 `src/app/features/comparison/model-comparison-panel.component.ts` 文件及其在 workbench 的 import。
- 分析页最终只保留 `app-experiment-history-panel`（实验历史）。

### 实验室模式切换
- 在算法实验室页（`*ngSwitchCase="'lab'"`）标题卡下方加两个切换标签：
  - `单算法演示`：现有配置区 + 训练区 + 解释区，原样保留。
  - `算法对比`：新对比组件。
- 用 `labMode: 'single' | 'compare'` 字段控制；切换不破坏单算法模式的既有状态。

### 算法对比组件（新）
- 文件：`src/app/features/comparison/algorithm-comparison-panel.component.ts`（复用此目录）。
- 配对下拉（两两成对，固定有意义的对）：
  - `逻辑回归 vs SVM`（logistic_regression / svm）——都是线性决策边界，对比边界 + Accuracy。
  - `决策树 vs 随机森林`（decision_tree / random_forest）——单树 vs 集成，对比过拟合/稳定性。
- 数据集固定 `iris`（唯一内置分类集，两对都基于它才有意义），界面显示但不可改（YAGNI）。
- 控件：步数输入 + `初始化两者 / 单步 / 自动 / 暂停`，每个动作**同步驱动两个训练会话**。
- 布局（左右两栏 + 下方共享指标）：
  - 左右各一个 `app-two-dimensional-visualizer`（classification 模式，决策边界），标题为算法名 + 当前 Accuracy。
  - 下方一张折线图，两条序列分别为两算法的 Accuracy 随步数变化；若 `metric-trend-chart` 不支持多序列，则新建一个小型双序列叠加图组件。
- 数据来源：**复用现有训练接口**（`TrainingApiService` init/step/status）跑两个 session，纯前端，无后端改动。
- 自动训练：setInterval 同步对两 session 调用单步，到步数停止。

---

## 跨部门

### 新增依赖
- `spring-boot-starter-websocket`（仅 Part 2）。

### 主要改动文件
- 前端：`model-explanation-panel.component.ts`(P1)、`workbench-page.component.ts`(P2 侧边栏 + P3 tab/删除)、新增 `chat-socket.service.ts`、新增 `algorithm-comparison-panel.component.ts`、删除 `model-comparison-panel.component.ts`、`platform.models.ts`(聊天模型)、`proxy.conf.json`。
- 后端：`pom.xml`、`schema.sql`(chat_message)、`WebSocketConfig.java`、`ChatWebSocketHandler.java`、`ChatService(+Impl)`、`ChatMessageMapper`、`ChatMessageEntity`、（必要时 `UserMapper.findById`）。
- 部署：`deploy/nginx.conf`。

### 验证
- 后端 `mvn compile`/`package`。
- 前端 `ng build`（零新增告警）。
- 聊天 WebSocket 本地烟雾：连接、收 history、发消息广播、在线人数随连接增减、未登录拒发、消息落库。
- 对比模式手测：两对配对初始化/单步/自动，两边边界与叠加 Accuracy 正常。

### 实现顺序
Part 1（最小）→ Part 3（纯前端）→ Part 2（最复杂，含依赖/代理/部署）。

### 范围之外（YAGNI）
- 多聊天房间、私聊、消息撤回、历史分页。
- 对比模式支持非 Iris 数据集、回归/无监督/强化的对比。
- 对比结果落库。

### 备注
- 按用户工作流，本设计文档与后续代码**不自动提交**，需用户明确要求再提交/推送。
