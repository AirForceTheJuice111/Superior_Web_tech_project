# 团队开发规范 — 高级模块第二轮

本轮目标：在不依赖、不冲突于 `feature/ml-platform-advanced-features`（其他同学的分支）的前提下，做**正交的新模块**，工作量对齐该分支体量（参考：+4409 行 / 35 文件 / 9 大功能）。

## 一、本轮认领的模块

| 模块 | 子分支 | 负责范围 | 体量目标 |
|------|--------|----------|----------|
| M1 强化学习 | `feat/m1-reinforcement-learning` | Q-Learning + DQN 两个 RL 算法，三层贯通 | 算法服务为主，~1500 行 |
| M2 鉴权与拦截器 | `feat/m2-auth-interceptor` | JWT 鉴权、后端拦截器、前端 HttpInterceptor、路由守卫 | 后端为主，~1200 行 |
| M3 CSV 数据集持久化 | `feat/m3-dataset-persistence` | CSV 上传落库为可复用 dataset、上传管理接口与 UI | 全栈，~1300 行 |

三个模块汇总目标 ~4000 行，与参照分支同量级。

## 二、技术栈与版本（不得擅自变更）

- 前端：Angular 19.2 standalone components + TypeScript 5.7 + ECharts 5.6，RxJS 7.8
- 后端：Spring Boot 3.3.5 + MyBatis 3.0.3 + H2，Java 17
- 算法服务：Python 3.10+ + FastAPI + scikit-learn + numpy

## 三、目录与分层约定（沿用现有结构）

### 后端 `backend/src/main/java/com/example/mlplatform/`
- `controller/` REST 控制器，统一返回 `ApiResponse<T>`
- `service/` 接口 + `service/impl/` 实现
- `persistence/entity/` 实体、`persistence/mapper/` MyBatis Mapper（注解式，列名手动 `AS camelCase` 别名）
- `dto/request/`、`dto/response/`
- `config/` 配置类
- 建表写 `resources/schema.sql`（`CREATE TABLE IF NOT EXISTS`），种子数据写 `resources/data.sql`（`MERGE INTO ... KEY(id)` 幂等）

### 算法服务 `python-service/`
- 每个算法一个 `stepwise_<algo>.py`，实现统一接口：`step()`、`get_state()`
- 在 `main.py` 的 `build_training_bundle()` 注册分发，`build_status_response()` 接可视化
- 算法 code 用小写下划线，如 `q_learning`、`dqn`

### 前端 `src/app/`
- `core/models/platform.models.ts` 全局类型
- `core/services/` API 封装（经 `api-client.service.ts`）
- `features/<模块>/` 功能组件（standalone）
- `shared/components/` 通用组件
- 挂载到 `features/workbench/workbench-page.component.ts`

## 四、跨层接口契约（关键，避免联调失败）

1. **算法注册**：新算法须同时在以下四处登记，code 完全一致
   - `AlgorithmType.java` 枚举 + `fromCode`/`toCode`
   - `data.sql` 的 `algorithm_meta` 表插入元数据（含 `params_schema_json`）
   - `python-service/main.py` 的 `build_training_bundle` 分发
   - 前端无需硬编码（从 `/api/algorithms` 动态拉取）

2. **训练状态响应**：Python 返回的 dict 结构必须匹配 `TrainingStatusResponse`（sessionId/algorithm/status/currentStep/maxSteps/progress/loss/metrics/parameters/predictions/visualization/updatedAt）

3. **API 统一格式**：后端所有响应包 `ApiResponse{code,message,data}`，前端 `api-client.service.ts` 负责拆包

4. **新增 DB 表**：schema.sql 加表，data.sql 加种子；字段命名 snake_case，Mapper 里 `AS camelCase`

## 五、Git 协作规则

- 每个模块在自己的子分支开发：`feat/m1-*`、`feat/m2-*`、`feat/m3-*`，均从 `feature/team-advanced-modules` 切出
- commit message 用 `feat(m1): ...` / `fix(m2): ...` 前缀，结尾带 Co-Authored-By
- 子分支完成 → 合回 `feature/team-advanced-modules` → 整体对 `main` 发一个 PR
- 不碰 `feature/ml-platform-advanced-features` 的任何文件改动；如有同名文件冲突风险，以新增文件为主，尽量不改既有文件签名

## 六、验证标准（每个模块完成必须自检）

```bash
# Python
python -m py_compile python-service/main.py python-service/stepwise_*.py
# 后端
cd backend && mvn -q -DskipTests compile
# 前端
npm run build
```

三项全过才算模块完成。安全相关（M2 鉴权）额外说明哪些验证做了、哪些未做。

## 七、安全基线

- 新增任何网络端点须说明鉴权情况，不静默暴露无鉴权接口
- 处理上传文件（M3 CSV）须校验大小/行数/类型，防注入
- 不在响应中回显密钥/密码
- 归属判定一律以 JWT 认证主体（`@CurrentUser AuthPrincipal`）为准，禁止信任客户端自报的 userId

## 八、运行前置（鉴权接入后必读）

后端启动**必须**先设置 JWT 密钥环境变量，否则 `JwtProperties` 启动校验会 fail-fast 拒绝启动（这是有意的安全设计，杜绝弱密钥）：

```bash
# Linux/macOS
export APP_JWT_SECRET=$(openssl rand -hex 32)
# Windows PowerShell
$env:APP_JWT_SECRET = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })

cd backend && mvn spring-boot:run
```

密钥要求：非空、≥32 字符、不含 `change-me` 占位串。仓库内无任何可用默认密钥。

