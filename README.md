# 机器学习可视化学习平台

## 项目简介

机器学习可视化学习平台是一个面向课程设计、实验教学与算法演示的前后端分离项目，旨在为监督学习与无监督学习场景提供统一的实验配置、训练控制、结果可视化与实验记录管理能力。

项目当前采用如下技术栈：

- 前端：`Angular`、`TypeScript`、`ECharts`
- 后端：`Spring Boot`、`MyBatis`、`H2`
- 算法服务：`Python`、`FastAPI`、`scikit-learn`

本项目具备较完整的业务分层、接口组织与数据库持久化能力，可用于课程实验、教学演示与功能扩展。

## 项目目标

- 支持机器学习实验的统一配置与训练控制
- 支持训练过程中的实时状态更新与图形化展示
- 支持多算法扩展与算法元数据统一管理
- 支持用户登录、实验保存与历史记录查询
- 满足课程项目对 `Angular + Spring Boot/MyBatis` 技术路线的要求

## 系统架构

项目采用三层协作架构：

1. `Angular` 前端负责实验配置、训练控制、结果展示与历史记录交互
2. `Spring Boot + MyBatis` 后端负责业务接口、会话管理、元数据管理与实验记录持久化
3. `Python FastAPI` 服务负责具体算法训练与训练状态计算

核心调用链路如下：

```text
Angular Frontend
   -> Spring Boot REST API
      -> MyBatis / H2
      -> Python FastAPI Training Service
   -> 返回训练状态、指标与可视化数据
   -> Angular 使用 ECharts 实时更新图表
```

## 主要功能

### 1. 用户与实验管理

- 支持用户登录
- 支持实验配置保存
- 支持按用户查询实验历史记录
- 支持将训练 Session 与实验记录关联保存

### 2. 实验配置

- 支持学习类型选择
- 支持算法选择
- 支持数据集选择
- 支持根据算法元数据动态生成参数表单
- 算法与数据集配置均由后端接口动态提供

### 3. 训练控制

- 支持训练初始化
- 支持单步训练
- 支持连续训练
- 支持暂停训练
- 支持停止训练
- 支持训练状态刷新
- 支持 SSE 实时推送训练状态

### 4. 可视化展示

- 支持二维散点图展示
- 支持分类决策边界展示
- 支持回归线展示
- 支持聚类中心展示
- 支持 `loss` 曲线与 `accuracy` 曲线动态更新

### 5. 算法支持

当前已接入以下算法：

- `linear_regression`
- `svm`
- `kmeans`

## 技术特点

- 前端采用 `standalone component` 与 `feature-based` 目录组织
- 后端采用 `Controller / Service / Mapper / Entity / DTO` 分层
- 算法元数据不再写死于代码，而是由 `algorithm_meta` 表统一管理
- 使用 `training_session` 表与内存会话协同管理训练状态
- 使用 `experiment` 表记录实验配置与最近训练会话

## 目录结构

```text
高级Web技术pj/
├─ src/
│  ├─ app/
│  │  ├─ core/
│  │  │  ├─ models/                  # 全局类型定义
│  │  │  └─ services/                # API 服务封装
│  │  ├─ shared/
│  │  │  └─ components/              # 通用可视化组件
│  │  ├─ features/
│  │  │  ├─ auth/                    # 登录模块
│  │  │  ├─ config/                  # 实验配置模块
│  │  │  ├─ history/                 # 实验历史模块
│  │  │  ├─ training/                # 训练控制模块
│  │  │  └─ workbench/               # 综合工作台页面
│  │  ├─ app.component.ts
│  │  └─ ...
│  ├─ index.html
│  ├─ main.ts
│  └─ styles.css
├─ backend/
│  ├─ src/main/java/com/example/mlplatform/
│  │  ├─ client/python/              # Python 服务调用客户端
│  │  ├─ common/                     # 通用响应、异常、枚举
│  │  ├─ config/                     # CORS、OpenAPI、RestClient 等配置
│  │  ├─ controller/                 # 控制器层
│  │  ├─ dto/                        # 请求与响应 DTO
│  │  ├─ model/                      # 训练过程领域模型
│  │  ├─ persistence/
│  │  │  ├─ entity/                  # 数据库实体
│  │  │  └─ mapper/                  # MyBatis Mapper
│  │  ├─ service/                    # 业务接口
│  │  └─ service/impl/               # 业务实现
│  ├─ src/main/resources/
│  │  ├─ application.yml
│  │  ├─ schema.sql
│  │  ├─ data.sql
│  │  └─ mapper/
│  └─ pom.xml
├─ python-service/
│  ├─ main.py
│  ├─ stepwise_linear_regression.py
│  ├─ stepwise_svm.py
│  ├─ stepwise_kmeans.py
│  └─ requirements.txt
├─ angular.json
├─ package.json
├─ proxy.conf.json
├─ tsconfig.json
└─ README.md
```

## 数据库设计

当前后端已建立以下核心业务表：

- `app_user`：用户信息
- `dataset_meta`：数据集元数据
- `algorithm_meta`：算法元数据与参数模式
- `experiment`：实验记录
- `training_session`：训练会话状态

其中：

- `algorithm_meta` 用于保存算法展示名称、学习类型、参数模式等信息
- `experiment` 用于保存实验名称、用户、算法、数据集、配置 JSON 与最近会话 ID
- `training_session` 用于保存训练中间状态、指标、参数、预测与可视化结果

## 已实现的后端接口

### 1. 认证接口

- `POST /api/auth/login`：用户登录

### 2. 元数据接口

- `GET /api/algorithms`：获取算法元数据列表
- `GET /api/datasets`：获取数据集元数据列表

### 3. 实验接口

- `POST /api/experiments`：保存实验
- `GET /api/experiments/history?userId={id}`：查询实验历史

### 4. 训练接口

- `POST /api/trainings`：创建训练会话
- `POST /api/trainings/{sessionId}/step`：单步训练
- `POST /api/trainings/{sessionId}/run`：连续训练
- `POST /api/trainings/{sessionId}/pause`：暂停训练
- `POST /api/trainings/{sessionId}/stop`：停止训练
- `GET /api/trainings/{sessionId}`：获取训练会话摘要
- `GET /api/trainings/{sessionId}/status`：获取训练状态
- `GET /api/trainings/{sessionId}/stream`：订阅训练状态流

### 5. Python 训练服务接口

- `POST /internal/trainings`
- `POST /internal/trainings/{sessionId}/step`
- `POST /internal/trainings/{sessionId}/run`
- `GET /internal/trainings/{sessionId}/status`
- `POST /internal/trainings/{sessionId}/pause`
- `POST /internal/trainings/{sessionId}/stop`
- `GET /internal/health`

## 运行环境

建议使用如下运行环境：

- `Node.js 18+`
- `npm 9+`
- `Java 17`
- `Maven 3.9+`
- `Python 3.10+`

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repository-url>
cd 高级Web技术pj
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 安装 Python 依赖

```bash
python -m pip install -r python-service/requirements.txt
```

## 项目启动说明

建议按以下顺序启动：

1. Python 训练服务
2. Spring Boot 后端
3. Angular 前端

### 第一步：启动 Python 训练服务

在项目根目录执行：

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir python-service
```

启动成功后可访问：

- 服务地址：`http://localhost:8000`
- 健康检查：`http://localhost:8000/internal/health`

### 第二步：启动 Spring Boot 后端

进入后端目录：

```bash
cd backend
```

运行开发服务：

```bash
mvn spring-boot:run
```

若上面的后端启动无法正常运行，可以尝试先打包后运行：

```bash
mvn -q -DskipTests package
java -jar target/mlplatform-backend-0.0.1-SNAPSHOT.jar
```

启动成功后可访问：

- 后端地址：`http://localhost:8080`
- Swagger 文档：`http://localhost:8080/swagger-ui.html`

说明：

- H2 数据库默认使用文件模式，数据文件写入项目根目录下的 `data/`
- 后端启动时会根据 `schema.sql` 和 `data.sql` 自动初始化数据

### 第三步：启动 Angular 前端

回到项目根目录执行：

```bash
npm start
```

启动成功后可访问：

- 前端地址：`http://localhost:4200`

说明：

- 前端通过 `proxy.conf.json` 将 `/api` 请求代理到 `http://localhost:8080`

## 默认演示账号

项目已在初始化数据中内置演示用户：

- 学生账号：`student / 123456`
- 教师账号：`teacher / 123456`

## 关键配置说明

### 前端代理配置

文件：`proxy.conf.json`

作用：

- 将开发环境中的 `/api` 请求代理到 Spring Boot 服务

### 后端配置

文件：`backend/src/main/resources/application.yml`

主要配置项：

- 服务端口：`8080`
- H2 数据库路径：`jdbc:h2:file:./data/mlplatform`
- Swagger 路径：`/swagger-ui.html`
- Python 服务地址：`http://localhost:8000`
- 允许的前端跨域来源：`http://localhost:4200`

## 训练状态返回示例

```json
{
  "sessionId": "demo-session-id",
  "algorithm": "svm",
  "status": "running",
  "currentStep": 3,
  "maxSteps": 20,
  "progress": 0.15,
  "loss": 0.123,
  "metrics": {
    "accuracy": 0.95
  },
  "parameters": {},
  "predictions": [],
  "visualization": {
    "points": [],
    "boundary": [],
    "centers": []
  },
  "updatedAt": "2026-05-11T12:00:00"
}
```

## 测试与验证

当前已完成的基础验证包括：

- 后端编译：`mvn -q -DskipTests compile`
- 前端构建：`npm run build`
- 前后端主要接口联通验证

如需本地自检，建议依次执行：

```bash
cd backend
mvn -q -DskipTests compile

cd ..
npm run build
```

## 小组协作建议

建议提交到 GitHub 的内容：

- `src/`
- `backend/src/`
- `python-service/`
- `package.json`
- `package-lock.json`
- `angular.json`
- `proxy.conf.json`
- `backend/pom.xml`
- `README.md`
- `.gitignore`

不建议提交的内容：

- `node_modules/`
- `dist/`
- `backend/target/`
- `data/`
- `.angular/`
- `__pycache__/`
- IDE 本地配置文件

提交前建议检查：

```bash
git status
```

## 后续可扩展方向

- 支持真实 CSV 数据上传与解析
- 增加基于 Token 的鉴权与拦截器
- 支持实验记录编辑、删除与分页查询
- 增加更多算法类型与参数模板
- 扩展三维可视化或更丰富的教学交互能力

## 版权与说明

本项目用于课程设计、实验教学与技术演示。若用于正式课程答辩或团队协作提交，建议结合本仓库实际分工情况补充以下内容：

- 小组成员与职责分工
- 项目演示截图
- 功能完成度说明
- 答辩演示流程

