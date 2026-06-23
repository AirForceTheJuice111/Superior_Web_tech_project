import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ChartPoint, PredictionResult, VisualizationData } from '../../core/models/platform.models';

interface WeightItem {
  name: string;
  value: number;
  formattedValue: string;
  width: number;
  direction: 'positive' | 'negative' | 'neutral';
}

interface CenterItem {
  name: string;
  x: string;
  y: string;
}

interface DistributionItem {
  label: string;
  count: number;
  width: number;
}

interface ExplanationStat {
  label: string;
  value: string;
  hint: string;
}

interface TreeClassCount {
  label: string;
  count: number;
}

interface DecisionTreeNode {
  nodeId: number;
  depth: number;
  isLeaf: boolean;
  samples: number;
  impurity: number;
  prediction: string;
  classCounts: TreeClassCount[];
  featureIndex?: number;
  featureName?: string;
  threshold?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
}

@Component({
  selector: 'app-model-explanation-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h3>模型解释面板</h3>
          <p>{{ explanationText }}</p>
        </div>
        <span class="badge">{{ modeLabel }}</span>
      </div>

      <div class="explanation-grid" *ngIf="hasExplanation; else emptyBlock">
        <article class="explain-block" *ngIf="weightItems.length > 0">
          <div class="block-header">
            <h4>{{ weightBlockTitle }}</h4>
            <span>{{ weightItems.length }} 个特征</span>
          </div>
          <p class="block-copy">{{ weightBlockCopy }}</p>

          <div class="weight-list">
            <div class="weight-row" *ngFor="let item of weightItems">
              <div class="weight-meta">
                <strong>{{ item.name }}</strong>
                <span>{{ item.formattedValue }}</span>
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  [class.negative]="item.direction === 'negative'"
                  [class.neutral]="item.direction === 'neutral'"
                  [style.width.%]="item.width"
                ></div>
              </div>
            </div>
          </div>
        </article>

        <article class="explain-block" *ngIf="statItems.length > 0">
          <div class="block-header">
            <h4>参数摘要</h4>
            <span>当前状态</span>
          </div>
          <div class="stat-list">
            <div class="stat-item" *ngFor="let item of statItems">
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
              <small>{{ item.hint }}</small>
            </div>
          </div>
        </article>

        <article class="explain-block tree-block" *ngIf="treeRoot">
          <div class="block-header">
            <h4>决策树结构图</h4>
            <span>{{ treeDepthLabel }}</span>
          </div>
          <div class="tree-diagram">
            <ng-container *ngTemplateOutlet="treeNodeTemplate; context: { $implicit: treeRoot, branch: '根节点' }"></ng-container>
          </div>
        </article>

        <article class="explain-block" *ngIf="centerItems.length > 0">
          <div class="block-header">
            <h4>聚类中心</h4>
            <span>{{ centerItems.length }} 个中心</span>
          </div>
          <div class="center-list">
            <div class="center-item" *ngFor="let item of centerItems">
              <strong>{{ item.name }}</strong>
              <span>X {{ item.x }}</span>
              <span>Y {{ item.y }}</span>
            </div>
          </div>
        </article>

        <article class="explain-block" *ngIf="distributionItems.length > 0">
          <div class="block-header">
            <h4>{{ distributionTitle }}</h4>
            <span>{{ sampleCount }} 个样本</span>
          </div>
          <div class="distribution-list">
            <div class="distribution-row" *ngFor="let item of distributionItems">
              <div class="distribution-meta">
                <strong>{{ item.label }}</strong>
                <span>{{ item.count }}</span>
              </div>
              <div class="bar-track">
                <div class="distribution-fill" [style.width.%]="item.width"></div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <ng-template #treeNodeTemplate let-node let-branch="branch">
        <div class="tree-node-group">
          <div class="branch-label">{{ branch }}</div>
          <div class="tree-node" [class.leaf]="node.isLeaf">
            <strong>{{ treeNodeTitle(node) }}</strong>
            <span *ngIf="!node.isLeaf">{{ treeSplitText(node) }}</span>
            <span *ngIf="node.isLeaf">预测：{{ node.prediction }}</span>
            <small>样本 {{ node.samples }} · impurity {{ formatTreeNumber(node.impurity) }}</small>
            <em>{{ treeClassSummary(node) }}</em>
          </div>

          <div class="tree-children" *ngIf="node.left || node.right">
            <ng-container *ngIf="node.left">
              <ng-container *ngTemplateOutlet="treeNodeTemplate; context: { $implicit: node.left, branch: '≤ 阈值' }"></ng-container>
            </ng-container>
            <ng-container *ngIf="node.right">
              <ng-container *ngTemplateOutlet="treeNodeTemplate; context: { $implicit: node.right, branch: '> 阈值' }"></ng-container>
            </ng-container>
          </div>
        </div>
      </ng-template>

      <ng-template #emptyBlock>
        <div class="empty">
          初始化训练后会在这里展示特征权重、聚类中心和预测分布。
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }
    .card {
      width: 100%;
      min-width: 0;
      background: rgba(255,255,255,0.94);
      border-radius: 20px;
      padding: 22px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
      margin-bottom: 0;
      border: 1px solid rgba(255,255,255,0.8);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .card-header > div {
      min-width: 0;
    }
    h3,
    h4 {
      margin: 0;
      color: #0f172a;
    }
    h3 {
      margin-bottom: 8px;
      font-size: 22px;
    }
    h4 {
      font-size: 17px;
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
      background: linear-gradient(135deg, #ecfeff, #dcfce7);
      color: #0f766e;
      font-size: 12px;
      font-weight: 800;
    }
    .explanation-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      min-width: 0;
    }
    .explain-block {
      min-width: 0;
      padding: 18px;
      border-radius: 20px;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
      border: 1px solid #e2e8f0;
    }
    .block-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    .block-header span {
      flex: 0 0 auto;
      padding: 6px 10px;
      border-radius: 999px;
      background: #eff6ff;
      color: #2563eb;
      font-size: 12px;
      font-weight: 800;
    }
    .block-copy {
      margin-bottom: 14px;
      font-size: 13px;
    }
    .weight-list,
    .distribution-list,
    .center-list,
    .stat-list {
      display: grid;
      gap: 12px;
    }
    .weight-row,
    .distribution-row {
      display: grid;
      gap: 8px;
    }
    .weight-meta,
    .distribution-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      color: #334155;
    }
    .weight-meta strong,
    .distribution-meta strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .weight-meta span,
    .distribution-meta span {
      flex: 0 0 auto;
      font-variant-numeric: tabular-nums;
      color: #64748b;
      font-weight: 700;
    }
    .bar-track {
      height: 11px;
      overflow: hidden;
      border-radius: 999px;
      background: #e2e8f0;
    }
    .bar-fill,
    .distribution-fill {
      height: 100%;
      min-width: 4%;
      border-radius: inherit;
      background: linear-gradient(90deg, #2563eb, #38bdf8);
    }
    .bar-fill.negative {
      background: linear-gradient(90deg, #ef4444, #fb7185);
    }
    .bar-fill.neutral {
      background: linear-gradient(90deg, #94a3b8, #cbd5e1);
    }
    .distribution-fill {
      background: linear-gradient(90deg, #10b981, #34d399);
    }
    .stat-list {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }
    .stat-item {
      min-height: 120px;
      padding: 14px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .stat-item strong {
      display: block;
      color: #0f172a;
      font-size: 24px;
      line-height: 1.1;
      word-break: break-word;
    }
    .stat-item span {
      display: block;
      margin-top: 8px;
      color: #334155;
      font-weight: 800;
    }
    .stat-item small {
      display: block;
      margin-top: 8px;
      color: #64748b;
      line-height: 1.5;
    }
    .tree-block {
      grid-column: 1 / -1;
    }
    .tree-diagram {
      overflow-x: auto;
      padding: 10px 0 4px;
    }
    .tree-node-group {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      min-width: 190px;
      vertical-align: top;
    }
    .branch-label {
      margin-bottom: 8px;
      padding: 5px 9px;
      border-radius: 999px;
      background: #eff6ff;
      color: #2563eb;
      font-size: 11px;
      font-weight: 900;
    }
    .tree-node {
      width: 180px;
      min-height: 122px;
      display: grid;
      gap: 7px;
      padding: 13px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #bfdbfe;
      box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
      text-align: left;
    }
    .tree-node.leaf {
      border-color: #bbf7d0;
      background: linear-gradient(180deg, #f0fdf4, #ffffff);
    }
    .tree-node strong {
      color: #0f172a;
      font-size: 14px;
    }
    .tree-node span,
    .tree-node small,
    .tree-node em {
      color: #475569;
      font-size: 12px;
      line-height: 1.45;
      font-style: normal;
    }
    .tree-node em {
      color: #0f766e;
      font-weight: 800;
    }
    .tree-children {
      position: relative;
      display: flex;
      gap: 20px;
      justify-content: center;
      align-items: flex-start;
      margin-top: 22px;
      padding-top: 18px;
    }
    .tree-children::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 1px;
      height: 18px;
      background: #cbd5e1;
    }
    .center-list {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
    .center-item {
      display: grid;
      gap: 6px;
      padding: 14px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .center-item strong {
      color: #0f172a;
    }
    .center-item span {
      color: #64748b;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .empty {
      padding: 18px;
      border-radius: 18px;
      color: #64748b;
      background: linear-gradient(180deg, #f8fbff, #f8fafc);
      border: 1px dashed #cbd5e1;
    }
    @media (max-width: 920px) {
      .explanation-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .card-header {
        flex-direction: column;
      }
    }
  `]
})
export class ModelExplanationPanelComponent {
  @Input() algorithm = '';
  @Input() parameters: Record<string, unknown> = {};
  @Input() predictions: PredictionResult[] = [];
  @Input() visualization: VisualizationData = { points: [], boundary: [], centers: [] };

  get modeLabel(): string {
    if (this.algorithm === 'kmeans') {
      return '中心点解释';
    }
    if (this.algorithm === 'svm') {
      return '决策边界解释';
    }
    if (this.algorithm === 'logistic_regression') {
      return '概率边界解释';
    }
    if (this.algorithm === 'decision_tree') {
      return '树结构解释';
    }
    if (this.algorithm === 'random_forest') {
      return '集成模型解释';
    }
    if (this.algorithm === 'pca') {
      return '主成分解释';
    }
    if (this.algorithm === 'q_learning') {
      return '策略与价值函数解释';
    }
    return '线性参数解释';
  }

  get explanationText(): string {
    if (this.algorithm === 'kmeans') {
      return 'KMeans 通过更新聚类中心让同一簇样本更接近，中心点位置就是当前模型学到的代表性原型。';
    }
    if (this.algorithm === 'svm') {
      return 'SVM 当前用权重和偏置描述一条分离边界，权重方向决定边界朝向，偏置决定边界平移。';
    }
    if (this.algorithm === 'logistic_regression') {
      return '逻辑回归通过权重和偏置计算样本属于正类的概率，权重越大说明对应特征越影响分类倾向。';
    }
    if (this.algorithm === 'decision_tree') {
      return '决策树通过逐层分裂特征空间完成分类，树深度、节点数和特征重要性共同说明模型复杂度。';
    }
    if (this.algorithm === 'random_forest') {
      return '随机森林通过多棵决策树投票完成分类，特征重要性显示哪些变量在集成分裂中贡献更大。';
    }
    if (this.algorithm === 'pca') {
      return 'PCA 将原始特征重新组合为主成分，解释方差越高说明二维投影保留的原始信息越多。';
    }
    if (this.algorithm === 'q_learning') {
      return 'Q-Learning 通过 Q 值表记录每个格子各动作的长期收益，贪心策略选取最大 Q 值动作，价值热力图从终点向起点扩散，箭头收敛为最优策略。';
    }
    return '线性模型将每个特征乘以对应权重后相加，权重大小和正负方向共同决定预测结果。';
  }

  get weightBlockTitle(): string {
    return ['decision_tree', 'random_forest'].includes(this.algorithm) ? '特征重要性' : '特征权重';
  }

  get weightBlockCopy(): string {
    if (['decision_tree', 'random_forest'].includes(this.algorithm)) {
      return '条形长度表示该特征在树模型分裂中的相对贡献，越长说明越常用于有效划分样本。';
    }
    return '条形长度表示权重绝对值大小，方向表示该特征对预测或分类边界的影响方向。';
  }

  get hasExplanation(): boolean {
    return this.weightItems.length > 0 || this.centerItems.length > 0 || this.statItems.length > 0 || this.distributionItems.length > 0 || !!this.treeRoot;
  }

  get featureNames(): string[] {
    const rawNames = this.parameters['featureNames'];
    if (!Array.isArray(rawNames)) {
      return [];
    }
    return rawNames.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  get weightItems(): WeightItem[] {
    const weights = this.readNumberArray(this.parameters['weights']);
    const featureImportances = this.readNumberArray(this.parameters['featureImportances']);
    const values = weights.length > 0 ? weights : featureImportances;
    if (values.length === 0) {
      return [];
    }

    const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 0);
    return values.map((value, index) => ({
      name: this.featureNames[index] ?? `特征 ${index + 1}`,
      value,
      formattedValue: this.formatNumber(value),
      width: maxAbs === 0 ? 4 : Math.max(4, (Math.abs(value) / maxAbs) * 100),
      direction: value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
    }));
  }

  get centerItems(): CenterItem[] {
    const rawCenters = this.parameters['centers'];
    const centersFromParams = this.readCenterArrays(rawCenters);
    const centers = centersFromParams.length > 0 ? centersFromParams : this.visualization.centers.map((point) => [point.x, point.y]);

    return centers.map((center, index) => ({
      name: `中心 ${index + 1}`,
      x: this.formatNumber(center[0] ?? 0),
      y: this.formatNumber(center[1] ?? 0)
    }));
  }

  get statItems(): ExplanationStat[] {
    const items: ExplanationStat[] = [];
    const bias = this.readNumber(this.parameters['bias']);
    const weights = this.weightItems;

    if (bias !== null) {
      items.push({
        label: 'Bias',
        value: this.formatNumber(bias),
        hint: '偏置项控制整体预测值或决策边界的位置。'
      });
    }

    if (weights.length > 0) {
      const strongest = weights.reduce((best, item) => Math.abs(item.value) > Math.abs(best.value) ? item : best, weights[0]);
      items.push({
        label: '最强影响特征',
        value: strongest.name,
        hint: `当前绝对权重最大，权重为 ${strongest.formattedValue}。`
      });
    }

    if (this.algorithm === 'kmeans') {
      const clusterCount = this.readNumber(this.parameters['clusterCount']) ?? this.centerItems.length;
      if (clusterCount > 0) {
        items.push({
          label: 'Cluster Count',
          value: String(clusterCount),
          hint: '当前模型维护的聚类中心数量。'
        });
      }
    }

    if (this.algorithm === 'decision_tree') {
      this.pushNumberStat(items, 'treeDepth', 'Tree Depth', '当前决策树已经生长到的最大深度。');
      this.pushNumberStat(items, 'nodeCount', 'Node Count', '当前决策树包含的总节点数量。');
      this.pushNumberStat(items, 'leafCount', 'Leaf Count', '当前决策树的叶子节点数量。');
    }

    if (this.algorithm === 'random_forest') {
      this.pushNumberStat(items, 'treeCount', 'Tree Count', '当前随机森林已经纳入投票的决策树数量。');
      this.pushNumberStat(items, 'maxDepth', 'Max Depth', '单棵树允许生长的最大深度。');
    }

    if (this.algorithm === 'pca') {
      const ratios = this.readNumberArray(this.parameters['explainedVarianceRatio']);
      ratios.forEach((value, index) => {
        items.push({
          label: `PC${index + 1}`,
          value: `${(value * 100).toFixed(1)}%`,
          hint: `第 ${index + 1} 个主成分解释的方差比例。`
        });
      });
    }

    if (this.algorithm === 'q_learning') {
      this.pushNumberStat(items, 'gridSize', 'Grid Size', '网格边长，状态总数为其平方。');
      this.pushNumberStat(items, 'gamma', 'γ 折扣因子', '未来奖励的折扣系数，越大越重视长期收益。');
      this.pushNumberStat(items, 'alpha', 'α 学习率', 'Q 值每次更新的步长。');
      this.pushNumberStat(items, 'epsilon', 'ε 探索率', '当前以随机动作探索的概率，随训练衰减。');
      const path = this.parameters['path'];
      if (Array.isArray(path) && path.length > 0) {
        items.push({
          label: '当前贪心路径长度',
          value: String(path.length),
          hint: '按当前策略从起点走到终点经过的格子数，越短越优。'
        });
      }
    }

    if (this.sampleCount > 0) {
      items.push({
        label: '解释样本数',
        value: String(this.sampleCount),
        hint: '参与当前解释统计的预测样本数量。'
      });
    }

    return items;
  }

  get distributionItems(): DistributionItem[] {
    const source = this.predictions.length > 0
      ? this.predictions.map((item) => item.predicted || item.label || '未分类')
      : this.visualization.points.map((item) => item.label || '未分类');
    const counts = new Map<string, number>();

    for (const label of source) {
      counts.set(String(label), (counts.get(String(label)) ?? 0) + 1);
    }

    const maxCount = Math.max(...Array.from(counts.values()), 0);
    return Array.from(counts.entries()).map(([label, count]) => ({
      label,
      count,
      width: maxCount === 0 ? 4 : Math.max(4, (count / maxCount) * 100)
    }));
  }

  get distributionTitle(): string {
    return this.algorithm === 'kmeans' ? '簇分布' : '预测分布';
  }

  get sampleCount(): number {
    if (this.predictions.length > 0) {
      return this.predictions.length;
    }
    return this.visualization.points.length;
  }

  get treeRoot(): DecisionTreeNode | null {
    return this.readTreeNode(this.parameters['tree']);
  }

  get treeDepthLabel(): string {
    const depth = this.readNumber(this.parameters['treeDepth']);
    return depth === null ? '结构' : `深度 ${depth}`;
  }

  treeNodeTitle(node: DecisionTreeNode): string {
    return node.isLeaf ? `叶子节点 #${node.nodeId}` : `分裂节点 #${node.nodeId}`;
  }

  treeSplitText(node: DecisionTreeNode): string {
    const featureName = node.featureName || this.featureNames[node.featureIndex ?? -1] || `特征 ${(node.featureIndex ?? 0) + 1}`;
    return `${featureName} <= ${this.formatTreeNumber(node.threshold ?? 0)}`;
  }

  treeClassSummary(node: DecisionTreeNode): string {
    if (!node.classCounts.length) {
      return `预测 ${node.prediction}`;
    }
    return node.classCounts
      .map((item) => `${item.label}: ${this.formatTreeNumber(item.count)}`)
      .join(' / ');
  }

  formatTreeNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '-';
    }
    if (Math.abs(value) >= 100) {
      return value.toFixed(1);
    }
    if (Math.abs(value) >= 10) {
      return value.toFixed(2);
    }
    return value.toFixed(3);
  }

  private readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private pushNumberStat(items: ExplanationStat[], key: string, label: string, hint: string): void {
    const value = this.readNumber(this.parameters[key]);
    if (value === null) {
      return;
    }
    items.push({
      label,
      value: String(value),
      hint
    });
  }

  private readNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
  }

  private readCenterArrays(value: unknown): number[][] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.readCenter(item))
      .filter((item): item is number[] => item.length >= 2);
  }

  private readCenter(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
    }

    if (this.isChartPoint(value)) {
      return [value.x, value.y];
    }

    return [];
  }

  private isChartPoint(value: unknown): value is ChartPoint {
    return !!value
      && typeof value === 'object'
      && 'x' in value
      && 'y' in value
      && typeof (value as ChartPoint).x === 'number'
      && typeof (value as ChartPoint).y === 'number';
  }

  private readTreeNode(value: unknown): DecisionTreeNode | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const source = value as Record<string, unknown>;
    const nodeId = this.readNumber(source['nodeId']);
    const depth = this.readNumber(source['depth']);
    const samples = this.readNumber(source['samples']);
    const impurity = this.readNumber(source['impurity']);
    const prediction = typeof source['prediction'] === 'string' ? source['prediction'] : '';

    if (nodeId === null || depth === null || samples === null || impurity === null) {
      return null;
    }

    return {
      nodeId,
      depth,
      isLeaf: source['isLeaf'] === true,
      samples,
      impurity,
      prediction,
      classCounts: this.readTreeClassCounts(source['classCounts']),
      featureIndex: this.readNumber(source['featureIndex']) ?? undefined,
      featureName: typeof source['featureName'] === 'string' ? source['featureName'] : undefined,
      threshold: this.readNumber(source['threshold']) ?? undefined,
      left: this.readTreeNode(source['left']) ?? undefined,
      right: this.readTreeNode(source['right']) ?? undefined
    };
  }

  private readTreeClassCounts(value: unknown): TreeClassCount[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null;
        }
        const source = item as Record<string, unknown>;
        const label = typeof source['label'] === 'string' ? source['label'] : '';
        const count = this.readNumber(source['count']);
        return label && count !== null ? { label, count } : null;
      })
      .filter((item): item is TreeClassCount => item !== null);
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
}
