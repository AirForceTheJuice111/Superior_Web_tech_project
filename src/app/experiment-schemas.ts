import { AlgorithmSchema, DatasetOption, LearningType } from './models';

export const learningTypeOptions: Array<{ label: string; value: LearningType }> = [
  { label: '监督学习', value: 'supervised' },
  { label: '无监督学习', value: 'unsupervised' },
  { label: '强化学习', value: 'reinforcement' }
];

export const datasetOptions: DatasetOption[] = [
  { label: 'Iris', value: 'iris', sourceType: 'builtin' },
  { label: 'Boston', value: 'boston', sourceType: 'builtin' },
  { label: 'CSV 上传', value: 'csv_upload', sourceType: 'upload' }
];

export const algorithmOptionsByType: Record<LearningType, AlgorithmSchema[]> = {
  supervised: [
    {
      label: '线性回归',
      value: 'linear_regression',
      description: '适合数值预测任务',
      params: [
        { key: 'learningRate', label: '学习率', type: 'number', default: 0.01, min: 0.0001, max: 1, step: 0.001 },
        { key: 'epochs', label: '训练轮数', type: 'number', default: 100, min: 1, max: 1000, step: 1 },
        { key: 'fitIntercept', label: '拟合截距', type: 'switch', default: true }
      ]
    },
    {
      label: 'SVM',
      value: 'svm',
      description: '适合分类和部分回归场景',
      params: [
        {
          key: 'kernel',
          label: '核函数',
          type: 'select',
          default: 'linear',
          options: [
            { label: '线性核', value: 'linear' },
            { label: 'RBF', value: 'rbf' },
            { label: '多项式核', value: 'poly' }
          ]
        },
        { key: 'learningRate', label: '学习率', type: 'number', default: 0.01, min: 0.001, max: 1, step: 0.001 },
        { key: 'cValue', label: '惩罚系数 C', type: 'number', default: 1, min: 0.1, max: 100, step: 0.1 }
      ]
    }
  ],
  unsupervised: [
    {
      label: 'KMeans',
      value: 'kmeans',
      description: '常用聚类算法',
      params: [
        { key: 'kValue', label: 'K 值', type: 'number', default: 3, min: 2, max: 20, step: 1 },
        { key: 'maxIter', label: '最大迭代次数', type: 'number', default: 300, min: 10, max: 2000, step: 10 },
        {
          key: 'initMethod',
          label: '初始化方式',
          type: 'select',
          default: 'k-means++',
          options: [
            { label: 'k-means++', value: 'k-means++' },
            { label: '随机初始化', value: 'random' }
          ]
        }
      ]
    },
    {
      label: 'PCA',
      value: 'pca',
      description: '用于降维与特征压缩',
      params: [
        { key: 'nComponents', label: '降维维度', type: 'number', default: 2, min: 1, max: 10, step: 1 },
        { key: 'whiten', label: '白化处理', type: 'switch', default: false }
      ]
    }
  ],
  reinforcement: [
    {
      label: 'Q-Learning',
      value: 'q_learning',
      description: '适合离散状态与动作空间',
      params: [
        { key: 'learningRate', label: '学习率', type: 'number', default: 0.1, min: 0.001, max: 1, step: 0.001 },
        { key: 'discountFactor', label: '折扣因子', type: 'number', default: 0.9, min: 0, max: 1, step: 0.01 },
        { key: 'epsilon', label: '探索率', type: 'number', default: 0.2, min: 0, max: 1, step: 0.01 }
      ]
    },
    {
      label: 'DQN',
      value: 'dqn',
      description: '适合复杂状态空间的强化学习任务',
      params: [
        { key: 'learningRate', label: '学习率', type: 'number', default: 0.0005, min: 0.0001, max: 0.1, step: 0.0001 },
        { key: 'batchSize', label: '批大小', type: 'number', default: 64, min: 16, max: 512, step: 16 },
        { key: 'targetUpdateFreq', label: '目标网络更新频率', type: 'number', default: 100, min: 10, max: 1000, step: 10 }
      ]
    }
  ]
};
