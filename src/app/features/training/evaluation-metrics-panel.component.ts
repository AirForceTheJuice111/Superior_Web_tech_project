import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { PredictionResult } from '../../core/models/platform.models';

interface MetricItem {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'orange' | 'red' | 'slate';
}

interface ClassificationSummary {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

@Component({
  selector: 'app-evaluation-metrics-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h3>评估指标面板</h3>
          <p>{{ summaryText }}</p>
        </div>
        <span class="badge">{{ modeLabel }}</span>
      </div>

      <div class="metric-grid">
        <article class="metric-card" *ngFor="let item of metricItems" [class]="item.tone">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.hint }}</small>
        </article>
      </div>

      <div class="empty" *ngIf="metricItems.length === 0">
        初始化训练后会在这里展示当前模型的评估指标。
      </div>
    </section>
  `,
  styles: [`
    .card {
      background: rgba(255,255,255,0.94);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
      margin-bottom: 20px;
      border: 1px solid rgba(255,255,255,0.8);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 22px;
      color: #0f172a;
    }
    p {
      margin: 0;
      color: #64748b;
      line-height: 1.7;
    }
    .badge {
      flex: 0 0 auto;
      padding: 8px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, #eff6ff, #e0f2fe);
      color: #2563eb;
      font-size: 12px;
      font-weight: 800;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 14px;
    }
    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 136px;
      padding: 18px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
    }
    .metric-card span {
      color: #64748b;
      font-size: 13px;
      font-weight: 800;
    }
    .metric-card strong {
      color: #0f172a;
      font-size: 28px;
      line-height: 1.1;
      word-break: break-word;
    }
    .metric-card small {
      color: #64748b;
      line-height: 1.55;
    }
    .metric-card.blue {
      border-color: #bfdbfe;
      background: linear-gradient(180deg, #eff6ff, #ffffff);
    }
    .metric-card.green {
      border-color: #bbf7d0;
      background: linear-gradient(180deg, #f0fdf4, #ffffff);
    }
    .metric-card.orange {
      border-color: #fed7aa;
      background: linear-gradient(180deg, #fff7ed, #ffffff);
    }
    .metric-card.red {
      border-color: #fecaca;
      background: linear-gradient(180deg, #fef2f2, #ffffff);
    }
    .metric-card.slate {
      border-color: #cbd5e1;
      background: linear-gradient(180deg, #f8fafc, #ffffff);
    }
    .empty {
      padding: 18px;
      border-radius: 18px;
      color: #64748b;
      background: linear-gradient(180deg, #f8fbff, #f8fafc);
      border: 1px dashed #cbd5e1;
    }
    @media (max-width: 640px) {
      .card-header {
        flex-direction: column;
      }
    }
  `]
})
export class EvaluationMetricsPanelComponent {
  @Input() algorithm = '';
  @Input() loss: number | null = null;
  @Input() metrics: Record<string, number | string | null> = {};
  @Input() predictions: PredictionResult[] = [];
  @Input() parameters: Record<string, unknown> = {};

  get modeLabel(): string {
    if (this.algorithm === 'q_learning') {
      return '强化学习评估';
    }
    if (this.algorithm === 'pca') {
      return '降维评估';
    }
    if (this.algorithm === 'kmeans') {
      return '聚类评估';
    }
    if (this.isClassificationAlgorithm) {
      return '分类评估';
    }
    return '回归评估';
  }

  get summaryText(): string {
    if (this.algorithm === 'q_learning') {
      return '展示平均奖励、成功率、到达终点平均步数和探索率，用于观察 Q-Learning 策略是否收敛。';
    }
    if (this.algorithm === 'pca') {
      return '展示 PCA 主成分解释方差和重构误差，用于观察降维后保留了多少原始信息。';
    }
    if (this.algorithm === 'kmeans') {
      return '展示聚类紧凑度、轮廓系数和聚类规模，用于观察 KMeans 的收敛质量。';
    }
    if (this.isClassificationAlgorithm) {
      return '展示准确率，并根据当前预测结果推导宏平均 precision、recall 和 F1。';
    }
    return '展示回归误差和由损失函数推导的 RMSE，用于观察拟合效果。';
  }

  get metricItems(): MetricItem[] {
    if (this.algorithm === 'q_learning') {
      return this.buildReinforcementMetrics();
    }
    if (this.algorithm === 'pca') {
      return this.buildProjectionMetrics();
    }
    if (this.algorithm === 'kmeans') {
      return this.buildClusteringMetrics();
    }
    if (this.isClassificationAlgorithm) {
      return this.buildClassificationMetrics();
    }
    return this.buildRegressionMetrics();
  }

  private buildReinforcementMetrics(): MetricItem[] {
    const avgReward = this.readNumber('avgReward');
    const successRate = this.readNumber('successRate');
    const stepsToGoal = this.readNumber('stepsToGoal');
    const epsilon = this.readNumber('epsilon');
    const items: MetricItem[] = [];

    if (avgReward !== null) {
      items.push({
        label: 'Avg Reward',
        value: this.formatNumber(avgReward),
        hint: '最近若干回合的平均累计奖励，越高说明策略越优。',
        tone: 'green'
      });
    }
    if (successRate !== null) {
      items.push({
        label: 'Success Rate',
        value: this.formatPercent(successRate),
        hint: '最近若干回合中成功到达终点的比例。',
        tone: 'blue'
      });
    }
    if (stepsToGoal !== null) {
      items.push({
        label: 'Steps to Goal',
        value: stepsToGoal > 0 ? this.formatNumber(stepsToGoal) : '-',
        hint: '成功回合到达终点的平均步数，越少说明路径越短。',
        tone: 'orange'
      });
    }
    if (epsilon !== null) {
      items.push({
        label: 'Exploration ε',
        value: this.formatNumber(epsilon),
        hint: '当前探索率，随训练衰减，逐步从探索转向利用。',
        tone: 'slate'
      });
    }

    return [...items, ...this.buildExtraMetrics(['avgReward', 'successRate', 'stepsToGoal', 'epsilon'])];
  }

  private get isClassificationAlgorithm(): boolean {
    return ['svm', 'logistic_regression', 'decision_tree', 'random_forest'].includes(this.algorithm);
  }

  private buildRegressionMetrics(): MetricItem[] {
    const mse = this.readNumber('mse') ?? this.loss;
    const score = this.readNumber('accuracy');
    const items: MetricItem[] = [];

    if (mse !== null && mse !== undefined) {
      items.push({
        label: 'MSE',
        value: this.formatNumber(mse),
        hint: '均方误差，越低表示预测值越接近真实值。',
        tone: 'red'
      });
      items.push({
        label: 'RMSE',
        value: this.formatNumber(Math.sqrt(Math.max(mse, 0))),
        hint: 'MSE 的平方根，与目标值处在相近量纲。',
        tone: 'orange'
      });
    }

    if (score !== null && score !== undefined) {
      items.push({
        label: '拟合得分',
        value: this.formatPercent(score),
        hint: '当前服务返回的归一化拟合质量分数。',
        tone: 'green'
      });
    }

    return [...items, ...this.buildExtraMetrics(['mse', 'accuracy'])];
  }

  private buildClassificationMetrics(): MetricItem[] {
    const derived = this.buildClassificationSummary();
    const accuracy = this.readNumber('accuracy') ?? derived?.accuracy ?? null;
    const lossMetric = this.readClassificationLossMetric();
    const items: MetricItem[] = [];

    if (accuracy !== null && accuracy !== undefined) {
      items.push({
        label: 'Accuracy',
        value: this.formatPercent(accuracy),
        hint: '预测正确的样本占全部样本的比例。',
        tone: 'green'
      });
    }

    if (derived) {
      items.push({
        label: 'Precision',
        value: this.formatPercent(derived.precision),
        hint: '宏平均精确率，衡量被预测为某类的样本有多少是真的。',
        tone: 'blue'
      });
      items.push({
        label: 'Recall',
        value: this.formatPercent(derived.recall),
        hint: '宏平均召回率，衡量真实类别样本被找回的比例。',
        tone: 'orange'
      });
      items.push({
        label: 'F1',
        value: this.formatPercent(derived.f1),
        hint: 'precision 与 recall 的调和平均。',
        tone: 'slate'
      });
    }

    if (lossMetric.value !== null) {
      items.push({
        label: lossMetric.label,
        value: this.formatNumber(lossMetric.value),
        hint: lossMetric.hint,
        tone: 'red'
      });
    }

    return [...items, ...this.buildExtraMetrics(['accuracy', 'hingeLoss', 'logLoss', 'errorRate'])];
  }

  private buildClusteringMetrics(): MetricItem[] {
    const inertia = this.readNumber('inertia') ?? this.loss;
    const silhouette = this.readNumber('silhouette') ?? this.readNumber('accuracy');
    const clusterCount = this.readNumber('clusterCount') ?? this.readParameterNumber('clusterCount') ?? this.readCentersCount();
    const items: MetricItem[] = [];

    if (inertia !== null && inertia !== undefined) {
      items.push({
        label: 'Inertia',
        value: this.formatNumber(inertia),
        hint: '簇内平方和，越低表示簇内样本越紧凑。',
        tone: 'red'
      });
    }

    if (silhouette !== null && silhouette !== undefined) {
      items.push({
        label: 'Silhouette',
        value: this.formatNumber(silhouette),
        hint: '轮廓系数，越接近 1 聚类分离度越好。',
        tone: 'green'
      });
    }

    if (clusterCount !== null && clusterCount !== undefined) {
      items.push({
        label: '聚类数',
        value: String(clusterCount),
        hint: '当前 KMeans 模型维护的中心点数量。',
        tone: 'blue'
      });
    }

    return [...items, ...this.buildExtraMetrics(['inertia', 'silhouette', 'accuracy'])];
  }

  private buildProjectionMetrics(): MetricItem[] {
    const explainedVariance = this.readNumber('explainedVariance');
    const reconstructionError = this.readNumber('reconstructionError') ?? this.loss;
    const ratio = this.readNumberArrayParameter('explainedVarianceRatio');
    const items: MetricItem[] = [];

    if (explainedVariance !== null && explainedVariance !== undefined) {
      items.push({
        label: 'Explained Variance',
        value: this.formatPercent(explainedVariance),
        hint: '前两个主成分保留的总方差信息比例，越高说明二维投影保留信息越多。',
        tone: 'green'
      });
    }

    if (reconstructionError !== null && reconstructionError !== undefined) {
      items.push({
        label: 'Reconstruction Error',
        value: this.formatNumber(reconstructionError),
        hint: '从主成分空间还原到原特征空间后的平均误差，越低越好。',
        tone: 'orange'
      });
    }

    ratio.forEach((value, index) => {
      items.push({
        label: `PC${index + 1} 方差`,
        value: this.formatPercent(value),
        hint: `第 ${index + 1} 个主成分单独解释的方差比例。`,
        tone: index === 0 ? 'blue' : 'slate'
      });
    });

    return [...items, ...this.buildExtraMetrics(['explainedVariance', 'reconstructionError'])];
  }

  private buildClassificationSummary(): ClassificationSummary | null {
    const rows = this.predictions.filter((item) => item.label && item.predicted);
    if (rows.length === 0) {
      return null;
    }

    const labels = Array.from(new Set(rows.flatMap((item) => [String(item.label), String(item.predicted)])));
    if (labels.length === 0) {
      return null;
    }

    let precisionSum = 0;
    let recallSum = 0;
    let f1Sum = 0;
    let correct = 0;

    for (const label of labels) {
      let truePositive = 0;
      let falsePositive = 0;
      let falseNegative = 0;

      for (const row of rows) {
        const actual = String(row.label);
        const predicted = String(row.predicted);
        if (actual === predicted) {
          correct += actual === label ? 1 : 0;
        }
        if (actual === label && predicted === label) {
          truePositive += 1;
        } else if (actual !== label && predicted === label) {
          falsePositive += 1;
        } else if (actual === label && predicted !== label) {
          falseNegative += 1;
        }
      }

      const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
      const recall = truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);
      const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
      precisionSum += precision;
      recallSum += recall;
      f1Sum += f1;
    }

    return {
      accuracy: correct / rows.length,
      precision: precisionSum / labels.length,
      recall: recallSum / labels.length,
      f1: f1Sum / labels.length
    };
  }

  private buildExtraMetrics(knownKeys: string[]): MetricItem[] {
    const known = new Set(knownKeys);
    return Object.entries(this.metrics)
      .filter(([key, value]) => !known.has(key) && value !== null && value !== undefined)
      .map(([key, value]) => ({
        label: this.humanizeKey(key),
        value: typeof value === 'number' ? this.formatNumber(value) : String(value),
        hint: '训练服务返回的附加评估指标。',
        tone: 'slate' as const
      }));
  }

  private readNumber(key: string): number | null {
    const value = this.metrics[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private readClassificationLossMetric(): { label: string; value: number | null; hint: string } {
    if (this.algorithm === 'svm') {
      return {
        label: 'Hinge Loss',
        value: this.readNumber('hingeLoss') ?? this.loss,
        hint: 'SVM 间隔损失，越低说明分类间隔越理想。'
      };
    }
    if (this.algorithm === 'logistic_regression') {
      return {
        label: 'Log Loss',
        value: this.readNumber('logLoss') ?? this.loss,
        hint: '逻辑回归交叉熵损失，越低说明概率预测越可靠。'
      };
    }
    if (this.algorithm === 'decision_tree') {
      return {
        label: 'Error Rate',
        value: this.readNumber('errorRate') ?? this.loss,
        hint: '当前树模型的错误率，等于 1 - accuracy。'
      };
    }
    if (this.algorithm === 'random_forest') {
      return {
        label: 'Error Rate',
        value: this.readNumber('errorRate') ?? this.loss,
        hint: '随机森林的错误率，等于 1 - accuracy，用于观察集成投票后的分类效果。'
      };
    }
    return {
      label: 'Loss',
      value: this.loss,
      hint: '训练服务返回的分类损失。'
    };
  }

  private readParameterNumber(key: string): number | null {
    const value = this.parameters[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private readCentersCount(): number | null {
    const centers = this.parameters['centers'];
    return Array.isArray(centers) ? centers.length : null;
  }

  private readNumberArrayParameter(key: string): number[] {
    const value = this.parameters[key];
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
  }

  private formatNumber(value: number): string {
    if (Math.abs(value) >= 1000) {
      return value.toFixed(1);
    }
    if (Math.abs(value) >= 10) {
      return value.toFixed(2);
    }
    return value.toFixed(4);
  }

  private formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (letter) => letter.toUpperCase());
  }
}
