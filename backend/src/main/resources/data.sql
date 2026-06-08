MERGE INTO app_user (id, username, password, display_name, role, created_at)
KEY(id) VALUES
(1, 'student', '123456', '课程演示用户', 'student', CURRENT_TIMESTAMP()),
(2, 'teacher', '123456', '指导教师', 'teacher', CURRENT_TIMESTAMP());

MERGE INTO dataset_meta (id, code, name, description, task_type, source_type, feature_count, sample_count, label_column, created_at)
KEY(id) VALUES
(1, 'iris', 'Iris', '经典分类数据集，适合 SVM 分类演示', 'supervised', 'builtin', 4, 150, 'species', CURRENT_TIMESTAMP()),
(2, 'boston', 'Boston Housing', '经典回归数据集，适合线性回归演示', 'supervised', 'builtin', 13, 506, 'price', CURRENT_TIMESTAMP()),
(3, 'cluster_demo', 'Cluster Demo', '二维聚类演示数据集，适合 KMeans 聚类实验', 'unsupervised', 'builtin', 2, 180, NULL, CURRENT_TIMESTAMP());

MERGE INTO algorithm_meta (id, code, name, category, learning_type, description, params_schema_json, created_at)
KEY(id) VALUES
(1, 'linear_regression', '线性回归', 'regression', 'supervised', '适合数值预测任务', '[{"key":"learningRate","label":"学习率","type":"number","defaultValue":0.01,"min":0.001,"max":1,"step":0.001},{"key":"epochs","label":"训练轮数","type":"number","defaultValue":100,"min":10,"max":1000,"step":10},{"key":"fitIntercept","label":"拟合截距","type":"boolean","defaultValue":true}]', CURRENT_TIMESTAMP()),
(2, 'svm', '支持向量机', 'classification', 'supervised', '适合分类场景', '[{"key":"kernel","label":"核函数","type":"select","defaultValue":"linear","options":[{"label":"Linear","value":"linear"},{"label":"RBF","value":"rbf"}]},{"key":"learningRate","label":"学习率","type":"number","defaultValue":0.01,"min":0.001,"max":1,"step":0.001},{"key":"cValue","label":"惩罚系数 C","type":"number","defaultValue":1.0,"min":0.1,"max":10,"step":0.1}]', CURRENT_TIMESTAMP()),
(3, 'kmeans', 'KMeans', 'clustering', 'unsupervised', '适合二维聚类演示', '[{"key":"kValue","label":"聚类数 K","type":"number","defaultValue":3,"min":2,"max":10,"step":1},{"key":"maxIter","label":"最大迭代次数","type":"number","defaultValue":100,"min":10,"max":500,"step":10},{"key":"initMethod","label":"初始化方式","type":"select","defaultValue":"k-means++","options":[{"label":"k-means++","value":"k-means++"},{"label":"random","value":"random"}]}]', CURRENT_TIMESTAMP()),
(4, 'logistic_regression', '逻辑回归', 'classification', 'supervised', '适合二分类概率建模与线性决策边界演示', '[{"key":"learningRate","label":"学习率","type":"number","defaultValue":0.05,"min":0.001,"max":1,"step":0.001},{"key":"maxIter","label":"最大迭代次数","type":"number","defaultValue":100,"min":10,"max":500,"step":10},{"key":"fitIntercept","label":"拟合截距","type":"boolean","defaultValue":true}]', CURRENT_TIMESTAMP()),
(5, 'decision_tree', '决策树', 'classification', 'supervised', '适合展示逐层分裂、树深度与特征重要性', '[{"key":"maxDepth","label":"最大深度","type":"number","defaultValue":4,"min":1,"max":8,"step":1},{"key":"criterion","label":"分裂准则","type":"select","defaultValue":"gini","options":[{"label":"Gini","value":"gini"},{"label":"Entropy","value":"entropy"}]},{"key":"minSamplesSplit","label":"最小分裂样本数","type":"number","defaultValue":2,"min":2,"max":20,"step":1}]', CURRENT_TIMESTAMP());

MERGE INTO algorithm_meta (id, code, name, category, learning_type, description, params_schema_json, created_at)
KEY(id) VALUES
(6, 'random_forest', '随机森林', 'classification', 'supervised', '通过多棵决策树投票提升分类稳定性，适合观察集成学习和特征重要性', '[{"key":"nEstimators","label":"树数量","type":"number","defaultValue":30,"min":5,"max":100,"step":5},{"key":"treesPerStep","label":"每步新增树","type":"number","defaultValue":5,"min":1,"max":20,"step":1},{"key":"maxDepth","label":"最大深度","type":"number","defaultValue":4,"min":1,"max":12,"step":1},{"key":"minSamplesSplit","label":"最小分裂样本数","type":"number","defaultValue":2,"min":2,"max":20,"step":1}]', CURRENT_TIMESTAMP()),
(7, 'pca', 'PCA', 'dimensionality_reduction', 'unsupervised', '将高维特征投影到二维主成分空间，观察解释方差和降维分布', '[{"key":"nComponents","label":"主成分数","type":"number","defaultValue":2,"min":2,"max":2,"step":1},{"key":"standardize","label":"标准化特征","type":"boolean","defaultValue":true}]', CURRENT_TIMESTAMP());

MERGE INTO experiment_case (
    id, code, title, description, learning_type, algorithm_code, dataset_code,
    config_json, guide_text, expected_result, display_order, created_at
)
KEY(id) VALUES
(1, 'linear_regression_basic', '线性回归：观察权重如何拟合数据', '使用线性回归观察权重、偏置和回归线随训练逐步靠近样本趋势。', 'supervised', 'linear_regression', 'boston',
 '{"learningType":"supervised","algorithm":"linear_regression","dataset":"boston","params":{"learningRate":0.01,"epochs":100,"fitIntercept":true}}',
 '1. 载入案例后点击初始化。2. 连续点击单步执行，观察 loss 曲线下降。3. 查看模型解释面板中的权重和 Bias 如何变化。4. 对照二维可视化中的回归线是否逐渐贴近样本点。',
 '随着训练步数增加，MSE 通常下降，回归线逐渐靠近样本点，权重和 Bias 会从初始值逐步调整到更合理的位置。',
 1, CURRENT_TIMESTAMP()),
(2, 'linear_regression_large_lr', '线性回归：学习率过大对收敛的影响', '调大学习率，观察参数更新幅度和 loss 曲线变化。', 'supervised', 'linear_regression', 'boston',
 '{"learningType":"supervised","algorithm":"linear_regression","dataset":"boston","params":{"learningRate":0.08,"epochs":100,"fitIntercept":true}}',
 '1. 载入案例后初始化训练。2. 与学习率 0.01 的案例对比。3. 单步观察 loss 和权重变化幅度。4. 如果曲线波动或下降不稳定，思考学习率对梯度下降的影响。',
 '较大的学习率会让参数更新更快，但也可能让 loss 曲线更不稳定，体现梯度下降中步长选择的重要性。',
 2, CURRENT_TIMESTAMP()),
(3, 'svm_iris_boundary', 'SVM：鸢尾花二分类决策边界', '使用线性 SVM 观察分类边界、间隔损失和分类指标。', 'supervised', 'svm', 'iris',
 '{"learningType":"supervised","algorithm":"svm","dataset":"iris","params":{"kernel":"linear","learningRate":0.01,"cValue":1.0}}',
 '1. 载入案例后初始化。2. 单步训练并观察二维图中的决策边界。3. 查看评估指标面板中的 Accuracy、Precision、Recall 和 F1。4. 查看模型解释面板中的权重和 Bias。',
 '训练后决策边界会逐步分离两类样本，Hinge Loss 降低，分类指标通常会提升或保持较高水平。',
 3, CURRENT_TIMESTAMP()),
(4, 'kmeans_k3_standard', 'KMeans：K=3 的标准聚类过程', '使用 K=3 观察中心点移动、簇分布和聚类质量指标。', 'unsupervised', 'kmeans', 'cluster_demo',
 '{"learningType":"unsupervised","algorithm":"kmeans","dataset":"cluster_demo","params":{"kValue":3,"maxIter":100,"initMethod":"k-means++"}}',
 '1. 载入案例后初始化。2. 连续单步执行，观察聚类中心如何移动。3. 查看 Inertia 和 Silhouette。4. 查看模型解释面板中的中心坐标和簇分布。',
 '中心点会向各自簇的样本均值移动，Inertia 往往下降，Silhouette 可用于判断聚类分离度。',
 4, CURRENT_TIMESTAMP()),
(5, 'kmeans_k5_compare', 'KMeans：不同 K 值对聚类结果的影响', '将 K 调为 5，观察中心数量增加后簇分布和轮廓系数变化。', 'unsupervised', 'kmeans', 'cluster_demo',
 '{"learningType":"unsupervised","algorithm":"kmeans","dataset":"cluster_demo","params":{"kValue":5,"maxIter":100,"initMethod":"k-means++"}}',
 '1. 先运行 K=3 案例。2. 再载入本案例并初始化。3. 对比中心数量、簇分布、Inertia 和 Silhouette。4. 思考 K 值过大时聚类是否被切得过碎。',
 'K 增大后中心点更多，Inertia 可能下降，但 Silhouette 不一定提升；这能帮助理解 K 值选择并非越大越好。',
 5, CURRENT_TIMESTAMP());
