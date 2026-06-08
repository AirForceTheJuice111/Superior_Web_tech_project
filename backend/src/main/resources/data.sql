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
(4, 'q_learning', 'Q-Learning', 'control', 'reinforcement', '表格型 Q-Learning，在网格世界中学习最优策略', '[{"key":"gridSize","label":"网格尺寸","type":"number","defaultValue":5,"min":3,"max":8,"step":1},{"key":"learningRate","label":"学习率","type":"number","defaultValue":0.1,"min":0.01,"max":1,"step":0.01},{"key":"discountFactor","label":"折扣因子","type":"number","defaultValue":0.95,"min":0.5,"max":0.999,"step":0.001},{"key":"epsilon","label":"探索率","type":"number","defaultValue":0.2,"min":0.01,"max":1,"step":0.01}]', CURRENT_TIMESTAMP()),
(5, 'dqn', 'DQN', 'control', 'reinforcement', '深度 Q 网络（numpy 两层网络），含经验回放与目标网络', '[{"key":"gridSize","label":"网格尺寸","type":"number","defaultValue":5,"min":3,"max":8,"step":1},{"key":"learningRate","label":"学习率","type":"number","defaultValue":0.01,"min":0.001,"max":0.5,"step":0.001},{"key":"discountFactor","label":"折扣因子","type":"number","defaultValue":0.95,"min":0.5,"max":0.999,"step":0.001},{"key":"epsilon","label":"探索率","type":"number","defaultValue":0.3,"min":0.01,"max":1,"step":0.01},{"key":"batchSize","label":"批大小","type":"number","defaultValue":16,"min":4,"max":64,"step":4},{"key":"targetUpdateFreq","label":"目标网络更新频率","type":"number","defaultValue":5,"min":1,"max":50,"step":1}]', CURRENT_TIMESTAMP());
