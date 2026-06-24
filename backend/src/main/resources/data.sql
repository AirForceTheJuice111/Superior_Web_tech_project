MERGE INTO app_user (id, username, password, display_name, role, created_at)
KEY(id) VALUES
-- 演示账号密码仍为 123456,但以 BCrypt 哈希存储(不再明文落库),两账号使用不同 salt。
(1, 'student', '$2b$10$ttyVmcf4lhxTw7Ns7hrODOKPjkS52ZhdJ/HoBOVs7AENItbf6v/zu', '课程演示用户', 'student', CURRENT_TIMESTAMP()),
(2, 'teacher', '$2b$10$9m3BRDRY38bwxYzWyWyPmuSFIPDoIR5JW9yQOmq4QX2S9p3lETtTy', '指导教师', 'teacher', CURRENT_TIMESTAMP());

MERGE INTO dataset_meta (id, code, name, description, task_type, source_type, feature_count, sample_count, label_column, created_at)
KEY(id) VALUES
(1, 'iris', 'Iris 鸢尾花', '真实鸢尾花分类数据集，适合 SVM/逻辑回归/决策树分类演示', 'supervised', 'builtin', 4, 150, 'species', CURRENT_TIMESTAMP()),
(2, 'california', 'California 房价', '真实加州房价回归数据集，适合线性回归演示', 'supervised', 'builtin', 8, 20640, 'price', CURRENT_TIMESTAMP()),
(3, 'cluster_demo', 'Cluster Demo', '二维聚类演示数据集，适合 KMeans 聚类实验', 'unsupervised', 'builtin', 2, 180, NULL, CURRENT_TIMESTAMP()),
(4, 'gridworld', 'GridWorld 网格世界', '强化学习网格环境，智能体从起点学习走到终点的最优策略', 'reinforcement', 'builtin', 2, 25, NULL, CURRENT_TIMESTAMP());

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

MERGE INTO algorithm_meta (id, code, name, category, learning_type, description, params_schema_json, created_at)
KEY(id) VALUES
(8, 'q_learning', 'Q-Learning', 'reinforcement_learning', 'reinforcement', '在 GridWorld 网格环境中通过 Q 值表学习从起点到终点的最优策略，可视化价值热力图、策略箭头与智能体路径', '[{"key":"gridSize","label":"网格大小","type":"number","defaultValue":5,"min":3,"max":8,"step":1},{"key":"epsilon","label":"探索率 ε","type":"number","defaultValue":0.2,"min":0.0,"max":1.0,"step":0.01},{"key":"learningRate","label":"学习率 α","type":"number","defaultValue":0.1,"min":0.01,"max":1.0,"step":0.01},{"key":"gamma","label":"折扣因子 γ","type":"number","defaultValue":0.9,"min":0.0,"max":1.0,"step":0.05},{"key":"maxEpisodeSteps","label":"单回合最大步数","type":"number","defaultValue":100,"min":20,"max":300,"step":10}]', CURRENT_TIMESTAMP());

MERGE INTO experiment_case (
    id, code, title, description, learning_type, algorithm_code, dataset_code,
    config_json, guide_text, expected_result, display_order, created_at
)
KEY(id) VALUES
(1, 'linear_regression_basic', '线性回归：观察权重如何拟合数据', '使用线性回归观察权重、偏置和回归线随训练逐步靠近样本趋势。', 'supervised', 'linear_regression', 'california',
 '{"learningType":"supervised","algorithm":"linear_regression","dataset":"california","params":{"learningRate":0.01,"epochs":100,"fitIntercept":true}}',
 '1. 载入案例后点击初始化。2. 连续点击单步执行，观察 loss 曲线下降。3. 查看模型解释面板中的权重和 Bias 如何变化。4. 对照二维可视化中的回归线是否逐渐贴近样本点。',
 '随着训练步数增加，MSE 通常下降，回归线逐渐靠近样本点，权重和 Bias 会从初始值逐步调整到更合理的位置。',
 1, CURRENT_TIMESTAMP()),
(2, 'linear_regression_large_lr', '线性回归：学习率过大对收敛的影响', '调大学习率，观察参数更新幅度和 loss 曲线变化。', 'supervised', 'linear_regression', 'california',
 '{"learningType":"supervised","algorithm":"linear_regression","dataset":"california","params":{"learningRate":0.08,"epochs":100,"fitIntercept":true}}',
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
 5, CURRENT_TIMESTAMP()),
(6, 'q_learning_gridworld', 'Q-Learning：GridWorld 最优路径学习', '在网格世界中观察智能体如何通过 Q 值表逐步学会从起点走到终点的最优路径。', 'reinforcement', 'q_learning', 'gridworld',
 '{"learningType":"reinforcement","algorithm":"q_learning","dataset":"gridworld","params":{"gridSize":5,"epsilon":0.2,"learningRate":0.1,"gamma":0.9,"maxEpisodeSteps":100}}',
 '1. 载入案例后初始化。2. 连续单步执行，观察网格中价值热力图逐渐成形。3. 查看每格的策略箭头是否指向终点。4. 观察智能体路径（高亮）是否变短，以及 Episode Reward 上升、ε 衰减。',
 '随着回合增加，价值热力图从终点向起点扩散，策略箭头收敛到指向终点的最优方向，智能体路径变短，成功率接近 1，平均奖励上升。',
 6, CURRENT_TIMESTAMP());

-- 练习题题库:topic_id 对应前端课程路径节点 id;correct_index 为 0 基的正确选项下标
MERGE INTO quiz_question (id, topic_id, category, question, options_json, correct_index, explanation, display_order, created_at)
KEY(id) VALUES
(1, 'data-feature', '机器学习基础', '在监督学习中，用来预测的输入列通常称为什么？',
 '["特征(Feature)","标签(Label)","损失(Loss)","权重(Weight)"]', 0,
 '用于预测的输入列称为特征，被预测的目标列称为标签。', 1, CURRENT_TIMESTAMP()),
(2, 'data-feature', '机器学习基础', '下面哪一项最适合作为分类任务的标签列？',
 '["连续的房价数值","样本的类别(如是否通过)","样本编号 ID","随机噪声列"]', 1,
 '分类任务的标签是离散类别；房价是回归目标，ID 与噪声不应作为标签。', 2, CURRENT_TIMESTAMP()),
(3, 'data-feature', '机器学习基础', '特征工程的主要目的是什么？',
 '["增加样本数量","把原始数据转化为更有利于模型学习的特征","直接提高硬件性能","删除所有含缺失值的行"]', 1,
 '特征工程通过构造、变换、筛选特征，让模型更容易学到规律。', 3, CURRENT_TIMESTAMP()),
(4, 'train-test', '机器学习基础', '划分训练集和测试集的主要目的是？',
 '["增大数据规模","评估模型在未见过数据上的泛化能力","加快训练速度","减少特征数量"]', 1,
 '测试集模拟未见过的数据，用来评估模型的泛化能力。', 1, CURRENT_TIMESTAMP()),
(5, 'train-test', '机器学习基础', '为什么不能只用训练集上的表现来判断模型好坏？',
 '["训练集太小","模型可能记住训练数据而无法泛化","训练集没有标签","训练集不能计算指标"]', 1,
 '只看训练集可能掩盖过拟合，模型在新数据上未必表现好。', 2, CURRENT_TIMESTAMP()),
(6, 'train-test', '机器学习基础', '测试集在模型训练过程中应当如何使用？',
 '["参与每一步参数更新","训练时反复用它来调参","训练完成后用于最终评估，不参与训练","与训练集混在一起"]', 2,
 '测试集应保持独立，只在训练结束后评估，避免信息泄露。', 3, CURRENT_TIMESTAMP()),
(7, 'loss', '机器学习基础', '损失函数(Loss)衡量的是什么？',
 '["模型预测与真实值之间的差距","训练所用的时间","特征的数量","数据集的大小"]', 0,
 '损失函数度量预测与真实标签的差距，是优化的目标。', 1, CURRENT_TIMESTAMP()),
(8, 'loss', '机器学习基础', '训练时学习率设置过大，loss 曲线最可能出现什么现象？',
 '["平滑且快速收敛","剧烈震荡甚至发散","始终保持不变","直接变为负数"]', 1,
 '学习率过大时参数更新步长过大，loss 容易震荡甚至发散。', 2, CURRENT_TIMESTAMP()),
(9, 'loss', '机器学习基础', '回归任务中常用的损失函数是？',
 '["交叉熵","均方误差(MSE)","准确率","轮廓系数"]', 1,
 '回归常用均方误差；交叉熵多用于分类，准确率与轮廓系数是评估指标。', 3, CURRENT_TIMESTAMP()),
(10, 'overfit', '机器学习基础', '模型在训练集上表现很好但在测试集上很差，最可能是？',
 '["欠拟合","过拟合","数据太多","学习率太小"]', 1,
 '训练好、测试差是过拟合的典型表现：模型记住了训练细节。', 1, CURRENT_TIMESTAMP()),
(11, 'overfit', '机器学习基础', '下面哪种现象属于欠拟合？',
 '["训练集和测试集表现都很差","训练集很好但测试集很差","训练集和测试集都很好","训练 loss 降到 0"]', 0,
 '欠拟合时模型能力不足，训练集和测试集都表现较差。', 2, CURRENT_TIMESTAMP()),
(12, 'overfit', '机器学习基础', '缓解过拟合的常见做法是？',
 '["进一步增大模型复杂度","增加正则化或更多训练数据","减少训练数据","去掉测试集"]', 1,
 '正则化、增加数据、早停等都能缓解过拟合。', 3, CURRENT_TIMESTAMP()),
(13, 'metrics', '机器学习基础', '下列哪个指标通常用于评估聚类效果？',
 '["准确率 Accuracy","轮廓系数 Silhouette","召回率 Recall","均方误差 MSE"]', 1,
 '轮廓系数衡量聚类的紧密与分离程度，适合无监督聚类评估。', 1, CURRENT_TIMESTAMP()),
(14, 'metrics', '机器学习基础', '在类别极不平衡的分类任务中，仅看准确率可能有什么问题？',
 '["准确率无法计算","即使全预测为多数类也可能很高，掩盖少数类表现","准确率总是偏低","准确率只能用于回归"]', 1,
 '不平衡时高准确率可能只是预测多数类，需结合精确率/召回率/F1。', 2, CURRENT_TIMESTAMP()),
(15, 'metrics', '机器学习基础', '回归任务更适合用下面哪个指标？',
 '["F1 分数","R^2 / 解释方差","准确率","混淆矩阵"]', 1,
 'R^2、解释方差、MSE 适合回归；F1、准确率、混淆矩阵用于分类。', 3, CURRENT_TIMESTAMP());

MERGE INTO quiz_question (id, topic_id, category, question, options_json, correct_index, explanation, display_order, created_at)
KEY(id) VALUES
(16, 'linear-regression', '监督学习', '线性回归主要用于解决哪类问题？',
 '["连续数值预测","离散类别分类","聚类","降维"]', 0,
 '线性回归拟合连续数值目标，属于回归任务。', 1, CURRENT_TIMESTAMP()),
(17, 'linear-regression', '监督学习', '线性回归中提高学习率会带来什么影响？',
 '["参数更新更慢","每步参数更新幅度更大，可能更快但也可能不稳定","一定收敛更好","与训练无关"]', 1,
 '学习率越大步长越大，收敛更快但可能震荡或发散。', 2, CURRENT_TIMESTAMP()),
(18, 'linear-regression', '监督学习', '线性回归模型的预测形式通常是？',
 '["特征的线性加权和再加偏置","取特征的最大值","对样本类别投票","计算特征间的距离"]', 0,
 '线性回归是 y = w·x + b，即特征的线性组合加偏置。', 3, CURRENT_TIMESTAMP()),
(19, 'logistic-regression', '监督学习', '逻辑回归通常用来做什么？',
 '["回归预测连续值","二分类并输出概率","聚类","降维"]', 1,
 '逻辑回归通过 sigmoid 输出概率，常用于二分类。', 1, CURRENT_TIMESTAMP()),
(20, 'logistic-regression', '监督学习', '逻辑回归用于把线性输出映射到 (0,1) 概率的函数是？',
 '["ReLU","Sigmoid","均方误差","欧氏距离"]', 1,
 'Sigmoid 把任意实数压缩到 (0,1)，作为概率输出。', 2, CURRENT_TIMESTAMP()),
(21, 'logistic-regression', '监督学习', '提高逻辑回归分类的概率阈值(如从 0.5 到 0.8)通常会？',
 '["让更多样本被判为正类","让更少样本被判为正类，提高精确率但可能降低召回","不影响结果","改变特征数量"]', 1,
 '阈值升高使判正更严格，精确率上升、召回率可能下降。', 3, CURRENT_TIMESTAMP()),
(22, 'decision-tree', '监督学习', '决策树是通过什么方式做预测的？',
 '["按特征逐层划分到达叶节点","计算样本间距离","线性加权求和","梯度下降迭代"]', 0,
 '决策树按特征条件分裂，样本落到叶节点得到预测。', 1, CURRENT_TIMESTAMP()),
(23, 'decision-tree', '监督学习', '决策树的最大深度设得过大，最可能导致？',
 '["欠拟合","过拟合","无法训练","特征变多"]', 1,
 '树太深会记住训练细节，导致过拟合。', 2, CURRENT_TIMESTAMP()),
(24, 'decision-tree', '监督学习', '决策树常用的分裂准则包括？',
 '["Gini 和 信息熵(Entropy)","学习率和动量","K 值和距离","Sigmoid 和 ReLU"]', 0,
 '分类树常用基尼系数或信息熵衡量分裂纯度。', 3, CURRENT_TIMESTAMP()),
(25, 'svm', '监督学习', 'SVM 的核心思想是？',
 '["寻找使两类间隔最大的决策边界","对样本随机分组","逐步降维","统计类别频率"]', 0,
 'SVM 追求最大间隔的分类超平面。', 1, CURRENT_TIMESTAMP()),
(26, 'svm', '监督学习', 'SVM 中的核函数(如 RBF)主要作用是？',
 '["压缩数据规模","在高维空间中处理线性不可分问题","减少训练轮数","删除异常值"]', 1,
 '核函数把样本映射到高维，使原本线性不可分的数据变得可分。', 2, CURRENT_TIMESTAMP()),
(27, 'svm', '监督学习', '减小 SVM 的惩罚系数 C 通常意味着？',
 '["对误分类惩罚更小，间隔更宽，容忍更多错分","完全不允许错分","一定提高准确率","与边界无关"]', 0,
 'C 越小越容忍错分、间隔越宽(正则更强)；C 越大越严格。', 3, CURRENT_TIMESTAMP());

MERGE INTO quiz_question (id, topic_id, category, question, options_json, correct_index, explanation, display_order, created_at)
KEY(id) VALUES
(28, 'kmeans', '无监督学习', 'K-Means 属于哪类学习任务？',
 '["监督分类","无监督聚类","回归","强化学习"]', 1,
 'K-Means 无需标签，按距离把样本聚成 K 个簇。', 1, CURRENT_TIMESTAMP()),
(29, 'kmeans', '无监督学习', 'K-Means 中的 K 值代表什么？',
 '["聚类的簇数量","迭代次数","特征维度","学习率"]', 0,
 'K 是预先指定的聚类中心(簇)数量。', 2, CURRENT_TIMESTAMP()),
(30, 'kmeans', '无监督学习', 'K-Means 每次迭代的核心步骤是？',
 '["把样本分配到最近中心，再用簇内均值更新中心","对样本随机打标签","计算交叉熵","构造决策树"]', 0,
 '先按距离分配样本，再把中心更新为簇内均值，反复迭代。', 3, CURRENT_TIMESTAMP()),
(31, 'pca', '无监督学习', 'PCA 的主要用途是？',
 '["数据降维并保留主要方差","分类","生成聚类标签","增加特征数量"]', 0,
 'PCA 把数据投影到主成分上以降维，尽量保留方差信息。', 1, CURRENT_TIMESTAMP()),
(32, 'pca', '无监督学习', 'PCA 中 explained variance(解释方差)越高说明？',
 '["降维后保留的信息越多","样本数量越多","模型越简单","学习率越大"]', 0,
 '解释方差比例越高，降维后保留的原始信息越多。', 2, CURRENT_TIMESTAMP()),
(33, 'pca', '无监督学习', '关于 PCA，下面说法正确的是？',
 '["降维一定不损失任何信息","降维通常会损失部分信息以换取更低维度","PCA 需要标签","PCA 只能用于分类"]', 1,
 '投影到更少维度通常丢失部分方差，是信息与维度之间的折中。', 3, CURRENT_TIMESTAMP()),
(34, 'state-action-reward', '强化学习', '强化学习中，智能体学习的依据主要是？',
 '["环境反馈的奖励信号","人工标注的标签","样本间的距离","特征的方差"]', 0,
 '强化学习通过与环境交互获得奖励，据此优化策略。', 1, CURRENT_TIMESTAMP()),
(35, 'state-action-reward', '强化学习', '下列哪一项属于强化学习的基本要素？',
 '["状态、动作、奖励","训练集、测试集、验证集","权重、偏置、激活","Gini、熵、深度"]', 0,
 '状态、动作、奖励(以及策略)是强化学习的核心要素。', 2, CURRENT_TIMESTAMP()),
(36, 'state-action-reward', '强化学习', '奖励函数(Reward)的作用是？',
 '["定义智能体行为好坏的导向","存储样本特征","划分训练与测试集","计算分类准确率"]', 0,
 '奖励引导智能体趋向高回报的行为，是学习目标的体现。', 3, CURRENT_TIMESTAMP()),
(37, 'q-learning', '强化学习', 'Q-Learning 中的 Q 值表示什么？',
 '["在某状态下采取某动作的预期长期价值","样本的类别概率","特征的权重","聚类中心坐标"]', 0,
 'Q(s,a) 估计在状态 s 执行动作 a 后的期望累积回报。', 1, CURRENT_TIMESTAMP()),
(38, 'q-learning', '强化学习', 'Q-Learning 中 epsilon(ε) 通常控制什么？',
 '["探索与利用的平衡","学习率大小","折扣因子","网格大小"]', 0,
 'ε 决定以多大概率随机探索，其余则利用当前已知的最优动作。', 2, CURRENT_TIMESTAMP()),
(39, 'q-learning', '强化学习', '为什么 Q-Learning 中 epsilon 常常随训练逐步衰减？',
 '["早期多探索，后期多利用已学到的策略","为了加快读取速度","因为奖励会变负","与策略无关"]', 0,
 '早期需要探索环境，后期策略趋于成熟应更多利用，故 ε 逐步减小。', 3, CURRENT_TIMESTAMP());
