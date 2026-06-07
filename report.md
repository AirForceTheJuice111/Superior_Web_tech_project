# 项目功能实现报告



## 一、已完成的功能

### 1. 评估指标面板

新增训练结果评估面板，接入训练控制区。

主要能力：

- 回归任务：显示 MSE、RMSE、拟合质量等指标。
- 分类任务：显示 Accuracy、Precision、Recall、F1、Error Rate 等指标。
- 聚类任务：显示 Inertia、Silhouette、聚类数量等指标。
- PCA 任务：显示解释方差、重构误差、各主成分解释方差占比。
- 不同算法会显示更贴近算法含义的主要 loss，例如 Logistic Regression 的 Log Loss、SVM 的 Hinge Loss、决策树和随机森林的 Error Rate。

相关文件：

- `src/app/features/training/evaluation-metrics-panel.component.ts`
- `src/app/features/training/training-control-panel.component.ts`

### 2. 模型解释面板

新增模型解释面板，接入训练控制区。

主要能力：

- 线性回归、SVM、逻辑回归：显示特征权重、Bias、主要影响特征。
- KMeans：显示聚类中心和簇分布。
- 决策树：显示特征重要性、树深度、节点数、叶子数、分裂信息。
- 随机森林：显示集成模型的树数量、最大深度、特征重要性和代表性分裂信息。
- PCA：显示主成分解释、解释方差占比和特征贡献。

相关文件：

- `src/app/features/training/model-explanation-panel.component.ts`
- `src/app/features/training/training-control-panel.component.ts`

### 3. 决策树结构图

加强了决策树解释能力，从原来的统计和分裂信息扩展为树形结构展示。

后端与 Python 服务返回内容：

- `parameters.tree` 递归树结构。
- 每个节点包含 nodeId、depth、isLeaf、samples、impurity、prediction、classCounts、featureName、threshold、left、right。

前端展示内容：

- 根节点、左右分支、叶子节点。
- 每个节点展示样本数、impurity、预测类别、类别计数。

相关文件：

- `python-service/stepwise_decision_tree.py`
- `python-service/main.py`
- `src/app/features/training/model-explanation-panel.component.ts`

### 4. 预设实验案例库

新增 5 个预设实验案例，并接入数据库和前端页面。

数据存储：

- 预设案例存储在 H2 数据库的 `experiment_case` 表中。
- 表结构定义在 `backend/src/main/resources/schema.sql`。
- 初始化种子数据写在 `backend/src/main/resources/data.sql`。

后端接口：

- `GET /api/experiment-cases`

相关文件：

- `backend/src/main/java/com/example/mlplatform/controller/ExperimentCaseController.java`
- `backend/src/main/java/com/example/mlplatform/dto/response/ExperimentCaseResponse.java`
- `backend/src/main/java/com/example/mlplatform/persistence/entity/ExperimentCaseEntity.java`
- `backend/src/main/java/com/example/mlplatform/persistence/mapper/ExperimentCaseMapper.java`
- `backend/src/main/java/com/example/mlplatform/service/ExperimentCaseService.java`
- `backend/src/main/java/com/example/mlplatform/service/impl/ExperimentCaseServiceImpl.java`
- `src/app/core/services/experiment-case-api.service.ts`
- `src/app/features/cases/experiment-case-library-panel.component.ts`
- `src/app/features/workbench/workbench-page.component.ts`

### 5. 逻辑回归与决策树

新增两个监督学习算法。

逻辑回归：

- 支持二分类训练。
- 支持单步梯度下降过程。
- 返回权重、Bias、Log Loss、Accuracy、预测结果和二维线性决策边界。

决策树：

- 支持分类任务。
- 单步训练时按树深度逐步增长。
- 返回 Accuracy、Error Rate、特征重要性、树深度、节点数、叶子数、分裂边界和树结构。

相关文件：

- `backend/src/main/java/com/example/mlplatform/common/enums/AlgorithmType.java`
- `backend/src/main/resources/data.sql`
- `python-service/stepwise_logistic_regression.py`
- `python-service/stepwise_decision_tree.py`
- `python-service/main.py`

### 6. CSV 上传与特征工程模拟

新增小型 CSV 上传能力，当前实现为本次实验内使用的临时数据集。

CSV 使用方式：

- 在实验配置区上传 CSV。
- 前端解析表头和行数据。
- 自动识别数值列。
- 至少选择两个数值特征用于二维画布。
- 可以勾选更多数值特征参与训练，从而模拟特征选择、特征排除带来的模型效果变化。
- 画布仍使用前两个已选数值特征绘制，额外特征参与模型训练和指标计算。
- 监督学习算法需要选择标签列；KMeans 和 PCA 不需要标签列。
- 当前最多读取前 300 行，适合课程演示和小型数据集。

数据存储说明：

- CSV 不单独落库成 dataset 表记录。
- 训练时 CSV 行数据通过 `customDataset` 请求体传给后端，再透明转发给 Python 服务。
- 如果用户保存实验，CSV 配置会作为 experiment 的 config JSON 一起保存。

相关文件：

- `src/app/features/config/experiment-config-panel.component.ts`
- `src/app/core/models/platform.models.ts`
- `src/app/features/training/training-control-panel.component.ts`
- `src/app/features/workbench/workbench-page.component.ts`
- `backend/src/main/java/com/example/mlplatform/dto/request/InitTrainingRequest.java`
- `backend/src/main/java/com/example/mlplatform/service/impl/ExperimentServiceImpl.java`
- `python-service/main.py`

### 7. 随机森林

新增随机森林算法，作为高级集成学习算法。

主要能力：

- 支持监督分类任务。
- 支持参数：树数量、每步新增树数量、最大深度、最小分裂样本数。
- 单步训练时逐步增加森林中的树数量。
- 返回 Accuracy、Error Rate、treeCount、特征重要性、代表性分裂信息和预测结果。
- 前端算法列表、参数面板、评估指标面板、模型解释面板均已接入。

相关文件：

- `backend/src/main/java/com/example/mlplatform/common/enums/AlgorithmType.java`
- `backend/src/main/resources/data.sql`
- `python-service/stepwise_random_forest.py`
- `python-service/main.py`
- `src/app/features/training/training-control-panel.component.ts`
- `src/app/features/training/evaluation-metrics-panel.component.ts`
- `src/app/features/training/model-explanation-panel.component.ts`

### 8. PCA

新增 PCA 降维算法，作为高级无监督学习算法。

主要能力：

- 支持内置高维演示数据集。
- 支持上传 CSV 后选择多个数值特征参与降维。
- 固定投影到二维主成分空间，方便画布展示。
- 返回主成分、解释方差占比、总解释方差、重构误差和二维投影点。
- 前端算法列表、参数面板、二维画布、评估指标面板、模型解释面板均已接入。

相关文件：

- `backend/src/main/java/com/example/mlplatform/common/enums/AlgorithmType.java`
- `backend/src/main/resources/data.sql`
- `python-service/stepwise_pca.py`
- `python-service/main.py`
- `src/app/core/models/platform.models.ts`
- `src/app/shared/components/two-dimensional-visualizer.component.ts`
- `src/app/features/training/training-control-panel.component.ts`
- `src/app/features/training/evaluation-metrics-panel.component.ts`
- `src/app/features/training/model-explanation-panel.component.ts`

### 9. 模型对比功能

新增模型对比面板，接入工作台页面。

主要能力：

- 在同一个数据集、同一组特征配置上，对比当前算法和另一个同类型算法。
- 自动临时创建两个训练 session，不影响主训练控制区。
- 支持设置对比训练步数。
- 对比结果显示核心指标、loss、步数和 session id。
- 分类模型优先展示 Accuracy，PCA 展示 Explained Variance，KMeans 展示 Silhouette，回归模型展示 MSE。

相关文件：

- `src/app/features/comparison/model-comparison-panel.component.ts`
- `src/app/features/workbench/workbench-page.component.ts`

## 二、验证结果

已运行并通过：

```bash
python -m py_compile python-service\main.py python-service\stepwise_random_forest.py python-service\stepwise_pca.py python-service\stepwise_logistic_regression.py python-service\stepwise_decision_tree.py
mvn -q -DskipTests compile
npm run build
```

补充验证：

- `/api/algorithms` 已返回 7 个算法：linear_regression、svm、kmeans、logistic_regression、decision_tree、random_forest、pca。
- Spring Boot 到 Python 服务的随机森林训练链路通过。
- Spring Boot 到 Python 服务的 PCA 训练链路通过。
- 浏览器页面已确认能看到随机森林、PCA 和模型对比入口。
- Angular build 仍有原有 bundle 体积预算 warning，不影响运行。

## 三、本地使用方式

启动 Python 训练服务：

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir python-service
```

启动后端服务：

```bash
cd backend
mvn spring-boot:run
```

启动前端服务：

```bash
cd ..
npm start
```

打开页面：

```text
http://localhost:4200
```

## 四、功能使用说明

随机森林：

1. 在学习类型中选择“监督学习”。
2. 在算法中选择“随机森林”。
3. 调整树数量、每步新增树、最大深度等参数。
4. 初始化训练后，单步执行可以观察树数量增加、准确率变化和特征重要性。

PCA：

1. 在学习类型中选择“无监督学习”。
2. 在算法中选择“PCA”。
3. 使用内置数据集或上传 CSV。
4. 初始化后单步执行，观察二维投影、解释方差和重构误差。

模型对比：

1. 先完成实验配置。
2. 在“模型对比”面板选择另一个同学习类型算法。
3. 设置对比步数。
4. 点击“运行对比”，查看两个 session 的核心指标和 loss。

特征工程模拟：

1. 上传 CSV。
2. 在“特征工程模拟”区域勾选或取消勾选数值特征。
3. 前两个已选特征用于二维画布。
4. 更多已选特征会参与训练和指标计算。
5. 改变特征组合后重新初始化训练，观察模型表现变化。

## 五、仍可继续增强的部分

- CSV 当前适合小型数据集，最多读取前 300 行。
- CSV 没有单独落库为可复用数据集，只随训练请求或实验 config JSON 保存。
- SVM 和逻辑回归当前主要面向二分类 CSV。
- 二维画布仍以二维展示为主，高维特征通过训练指标体现。
- 强化学习相关功能尚未实现。

## 六、提交到远程独立分支

建议不要直接把当前本地 `main` 推到远程 `main`，可以基于当前工作区新建独立分支。

推荐分支名：

```bash
feature/ml-platform-advanced-features
```

提交步骤：

```bash
cd D:\vscode\web\pj\Superior_Web_tech_project

git status --short

git switch -c feature/ml-platform-advanced-features

git add .

git commit -m "feat: add advanced ML visualization features"

git push -u origin feature/ml-platform-advanced-features
```

如果远程已经存在同名分支，可以换一个带日期的分支名：

```bash
git switch -c feature/ml-platform-advanced-features-20260607
git push -u origin feature/ml-platform-advanced-features-20260607
```

推送完成后，到 GitHub 仓库页面打开该分支，并向 `main` 发起 Pull Request。
