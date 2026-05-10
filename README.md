# 机器学习可视化学习平台

一个面向教学与实验演示的机器学习可视化项目，当前采用：

- `Vue 3 + Element Plus + ECharts` 作为前端可视化界面
- `Spring Boot` 作为后端接口层与训练会话管理层
- `Python + FastAPI + sklearn` 作为模型训练服务

项目当前已经打通了“前端训练控制 -> Spring Boot 接口 -> Python 训练服务 -> 图表实时刷新”的完整链路。

## 当前已实现功能

### 1. 前端实验配置面板

- 支持选择学习类型：监督学习 / 无监督学习 / 强化学习
- 支持选择算法：线性回归、SVM、KMeans 等
- 支持选择数据集：内置示例数据集和 CSV 上传入口
- 支持根据算法动态显示参数配置表单
- 使用 Vue3 组件化设计与响应式数据管理

对应核心文件：

- `src/components/ExperimentConfigPanel.vue`
- `src/components/LearningTypeSelector.vue`
- `src/components/AlgorithmSelector.vue`
- `src/components/DynamicParamForm.vue`
- `src/components/DatasetSelector.vue`

### 2. 二维训练可视化

- 使用 ECharts 实现二维数据可视化组件
- 支持散点图显示
- 支持不同类别不同颜色
- 支持显示：
  - 决策边界
  - 回归线
  - 聚类中心
- 支持动态数据刷新

对应核心文件：

- `src/components/TwoDimensionalVisualizer.vue`

### 3. 前端训练控制模块

- 支持初始化训练会话
- 支持单步执行 `step`
- 支持自动训练 `run`
- 支持暂停 `pause`
- 使用前端 `setInterval` 控制逐步训练
- 每一步都会调用后端接口
- 每一步都会更新：
  - 二维图表
  - `loss` 曲线
  - `accuracy` 曲线

对应核心文件：

- `src/components/TrainingControlPanel.vue`
- `src/components/MetricTrendChart.vue`
- `src/api/training.js`

### 4. Spring Boot 后端训练接口

已实现统一训练接口，支持：

- 初始化模型
- 单步训练
- 连续训练
- 暂停训练
- 停止训练
- 获取训练状态
- SSE 实时推送训练状态
- Swagger / OpenAPI 文档

当前支持算法：

- `linear_regression`
- `svm`
- `kmeans`

对应核心文件：

- `backend/src/main/java/com/example/mlplatform/controller/TrainingController.java`
- `backend/src/main/java/com/example/mlplatform/service/impl/TrainingServiceImpl.java`
- `backend/src/main/java/com/example/mlplatform/client/python/PythonTrainingClient.java`

### 5. Python FastAPI 训练服务

已实现真实训练服务，并通过 HTTP 接口供 Spring Boot 调用。

当前支持：

- 线性回归单步训练
- SVM 单步训练
- KMeans 单步训练
- 初始化 / step / run / status / reset / pause / stop / health 接口

对应核心文件：

- `python-service/main.py`
- `python-service/stepwise_linear_regression.py`
- `python-service/stepwise_svm.py`
- `python-service/stepwise_kmeans.py`

## 项目结构

```text
高级Web技术pj/
├─ src/                    # Vue 前端
├─ backend/                # Spring Boot 后端
├─ python-service/         # FastAPI + Python 训练服务
├─ package.json
└─ README.md
```

## 运行环境要求

建议使用以下环境：

- `Node.js >= 18`
- `Java 17`
- `Maven 3.9+`
- `Python 3.10+`

## 安装依赖

### 1. 安装前端依赖

在项目根目录执行：

```bash
npm install
```

### 2. 安装 Python 依赖

在项目根目录执行：

```bash
python -m pip install -r python-service/requirements.txt
```

## 启动项目

项目需要按顺序启动三个部分：

1. Python 训练服务
2. Spring Boot 后端
3. Vue 前端

### 第一步：启动 Python FastAPI 服务

在项目根目录执行：

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir python-service
```

启动成功后，Python 服务地址为：

- `http://localhost:8000`

可用于健康检查的接口：

- `GET http://localhost:8000/internal/health`

### 第二步：启动 Spring Boot 后端

进入后端目录：

```bash
cd backend
```

推荐使用以下方式启动：

```bash
mvn -q -DskipTests package
java -jar target/mlplatform-backend-0.0.1-SNAPSHOT.jar
```

启动成功后，后端地址为：

- `http://localhost:8080`

Swagger 文档地址：

- `http://localhost:8080/swagger-ui.html`

### 第三步：启动 Vue 前端

回到项目根目录执行：

```bash
npm run dev
```

启动成功后，前端访问地址为：

- `http://localhost:5173`

## 推荐启动顺序

请按以下顺序启动：

1. 先启动 `Python FastAPI`
2. 再启动 `Spring Boot`
3. 最后启动 `Vue 前端`

否则前端或后端在初始化训练时可能会因为依赖服务未启动而报错。

## GitHub 协作建议

为了方便小组成员协作开发，当前仓库建议只提交源码、配置文件和必要依赖清单，不提交编译产物和本地环境缓存。

已经通过根目录 `.gitignore` 过滤以下内容：

- 前端依赖目录：`node_modules/`
- 前端打包产物：`dist/`
- Spring Boot 编译产物：`backend/target/`
- Python 缓存与虚拟环境：`__pycache__/`、`.venv/`
- 本地 IDE 配置：`.idea/`、`.vscode/`
- 本地日志与临时文件

团队成员拉取仓库后，只需要执行安装依赖和启动命令即可，不需要拉取任何构建结果文件。

### 小组成员拉取后推荐步骤

```bash
git clone <你的仓库地址>
cd 高级Web技术pj
npm install
python -m pip install -r python-service/requirements.txt
```

然后按本 README 中的启动顺序分别启动：

1. Python 服务
2. Spring Boot 后端
3. Vue 前端

## 当前接口链路

当前项目的训练调用链路如下：

```text
Vue 前端
   -> Spring Boot /api/trainings
   -> Python FastAPI /internal/trainings
   -> 返回 loss / accuracy / visualization
   -> 前端刷新图表与指标曲线
```

## 已支持的训练数据返回结构

后端返回的训练状态中，前端重点消费以下字段：

```json
{
  "sessionId": "xxx",
  "algorithm": "svm",
  "status": "running",
  "currentStep": 3,
  "maxSteps": 20,
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
  }
}
```

## 当前页面说明

启动后你可以在前端页面看到两个主要区域：

- 实验配置面板
- 训练控制与可视化面板

在训练控制模块中可以：

- 选择算法
- 初始化训练
- 单步执行
- 自动训练
- 暂停训练
- 查看二维图表
- 查看 `loss` 曲线
- 查看 `accuracy` 曲线

## 常用调试入口

### 前端

- `src/App.vue`
- `src/components/TrainingControlPanel.vue`

### 后端

- `backend/src/main/java/com/example/mlplatform/controller/TrainingController.java`
- `backend/src/main/java/com/example/mlplatform/service/impl/TrainingServiceImpl.java`

### Python

- `python-service/main.py`

## 提交前检查建议

为了避免把无用文件提交到 GitHub，建议每次提交前先检查：

```bash
git status
```

建议重点提交这些内容：

- `src/` 前端源码
- `backend/src/` 后端源码
- `python-service/` Python 服务源码
- `package.json`
- `package-lock.json`
- `backend/pom.xml`
- `README.md`
- `.gitignore`

不建议提交这些内容：

- `node_modules/`
- `dist/`
- `backend/target/`
- `__pycache__/`
- 本地 IDE 配置目录

## 后续可扩展方向

当前项目已经具备一个完整的教学型训练演示框架，接下来可以继续扩展：

- 接入真实 CSV 数据集解析
- 接入更多算法
- 增加训练日志面板
- 增加模型参数可视化
- 增加实验结果保存与历史对比
- 增加用户系统与实验管理

## 说明

当前版本重点是“训练过程可视化”和“前后端联调链路打通”。
