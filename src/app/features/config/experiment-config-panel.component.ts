import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AlgorithmMeta, CustomDatasetCell, CustomDatasetPayload, DatasetMeta, ExperimentConfig, LearningType, ParamSchema, ParamValue } from '../../core/models/platform.models';

const learningTypeLabels: Record<string, string> = {
  supervised: '监督学习',
  unsupervised: '无监督学习',
  reinforcement: '强化学习'
};

const UPLOADED_CSV_DATASET_CODE = 'uploaded_csv';
const MAX_CSV_ROWS = 300;

@Component({
  selector: 'app-experiment-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h2>实验配置</h2>
          <p>算法和数据集均从 Spring Boot + MyBatis 接口动态加载。</p>
        </div>
        <span class="badge">数据库驱动</span>
      </div>

      <p class="placeholder" *ngIf="loading">正在加载算法与数据集元数据...</p>
      <p class="placeholder" *ngIf="!loading && algorithms.length === 0">暂无可用算法元数据。</p>

      <ng-container *ngIf="algorithms.length > 0">
        <div class="grid">
          <label class="field">
            <span>学习类型</span>
            <select [(ngModel)]="learningType" (ngModelChange)="handleLearningTypeChange($event)">
              <option *ngFor="let item of learningTypeOptions" [ngValue]="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>算法</span>
            <select [(ngModel)]="selectedAlgorithmCode" (ngModelChange)="handleAlgorithmChange($event)">
              <option *ngFor="let item of currentAlgorithms" [ngValue]="item.code">{{ item.name }}</option>
            </select>
            <small>{{ currentAlgorithm?.description || '请选择算法' }}</small>
          </label>

          <label class="field">
            <span>数据集</span>
            <select [(ngModel)]="dataset" (ngModelChange)="handleDatasetChange($event)">
              <option *ngFor="let item of datasetOptions" [ngValue]="item.code">{{ item.name }}</option>
            </select>
            <small>{{ currentDataset?.description || '请选择数据集' }}</small>
          </label>
        </div>

        <div class="csv-panel">
          <div class="csv-header">
            <div>
              <h3>CSV 数据集</h3>
              <p>上传小型 CSV 后，可用前两列数值特征做二维训练可视化。</p>
            </div>
            <span class="csv-badge" *ngIf="customDataset">{{ customDataset.sampleCount }} 行</span>
          </div>

          <label class="upload-field">
            <span>上传 CSV 文件</span>
            <input type="file" accept=".csv,text/csv" (change)="handleCsvUpload($event)" />
          </label>

          <p class="csv-message" [class.error]="!!csvError">{{ csvError || csvMessage }}</p>

          <div class="csv-config" *ngIf="customDataset">
            <label>
              <span>X 特征列</span>
              <select [(ngModel)]="csvFeatureColumns[0]" (ngModelChange)="handleCsvColumnChange()">
                <option *ngFor="let column of numericCsvColumns" [ngValue]="column">{{ column }}</option>
              </select>
            </label>

            <label>
              <span>Y 特征列</span>
              <select [(ngModel)]="csvFeatureColumns[1]" (ngModelChange)="handleCsvColumnChange()">
                <option *ngFor="let column of numericCsvColumns" [ngValue]="column">{{ column }}</option>
              </select>
            </label>

            <label *ngIf="requiresLabel">
              <span>标签列</span>
              <select [(ngModel)]="csvLabelColumn" (ngModelChange)="handleCsvColumnChange()">
                <option *ngFor="let column of csvColumns" [ngValue]="column">{{ column }}</option>
              </select>
            </label>
          </div>

          <div class="feature-engineering" *ngIf="customDataset">
            <div>
              <h4>特征工程模拟</h4>
              <p>勾选参与训练的数值特征，前两个勾选特征用于二维画布，额外特征会参与模型训练和指标计算。</p>
            </div>
            <div class="feature-options">
              <label *ngFor="let column of numericCsvColumns">
                <input
                  type="checkbox"
                  [checked]="isCsvFeatureSelected(column)"
                  (change)="toggleCsvFeature(column, $event)"
                />
                <span>{{ column }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="param-grid" *ngIf="currentAlgorithm">
          <div class="param-card" *ngFor="let param of currentAlgorithm.paramsSchema">
            <label>
              <span>{{ getParamLabel(param) }}</span>

              <input
                *ngIf="param.type === 'number'"
                type="number"
                [min]="param.min ?? null"
                [max]="param.max ?? null"
                [step]="param.step ?? 1"
                [(ngModel)]="params[param.key]"
                (ngModelChange)="emitConfig()"
              />

              <select
                *ngIf="param.type === 'select'"
                [(ngModel)]="params[param.key]"
                (ngModelChange)="emitConfig()"
              >
                <option *ngFor="let option of param.options || []" [ngValue]="option.value">{{ option.label }}</option>
              </select>

              <label *ngIf="param.type === 'boolean' || param.type === 'switch'" class="switch-field">
                <input type="checkbox" [(ngModel)]="params[param.key]" (ngModelChange)="emitConfig()" />
                <span>{{ params[param.key] ? '开启' : '关闭' }}</span>
              </label>
            </label>
          </div>
        </div>

        <div class="footer">
          <button class="primary" type="button" (click)="emitConfig()">应用配置</button>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .card {
      background: rgba(255,255,255,0.95);
      border-radius: 28px;
      padding: 32px 36px;
      box-shadow: 0 28px 60px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(255,255,255,0.8);
      backdrop-filter: blur(10px);
    }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 26px; }
    h2 { margin: 0 0 10px; font-size: 32px; color: #0f172a; }
    p { margin: 0; color: #64748b; line-height: 1.8; font-size: 15px; }
    .badge {
      padding: 10px 16px;
      border-radius: 999px;
      background: linear-gradient(135deg, #ecfeff, #dcfce7);
      color: #0f766e;
      font-size: 13px;
      font-weight: 800;
      box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.08);
    }
    .placeholder { color: #64748b; font-size: 15px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
    .field, .param-card label { display: flex; flex-direction: column; gap: 10px; font-weight: 700; color: #1e293b; }
    .field > span:first-child,
    .param-card label > span:first-child { font-size: 17px; }
    .field small { min-height: 48px; font-weight: 500; color: #64748b; line-height: 1.7; }
    select, input[type='number'] {
      width: 100%;
      min-height: 66px;
      border: 1px solid #d7e1f0;
      border-radius: 18px;
      padding: 14px 18px;
      background: rgba(255,255,255,0.98);
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
    }
    .csv-panel {
      margin-top: 24px;
      padding: 20px;
      border-radius: 22px;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
      border: 1px solid #e2e8f0;
    }
    .csv-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .csv-header h3 {
      margin: 0 0 8px;
      color: #0f172a;
      font-size: 20px;
    }
    .csv-badge {
      flex: 0 0 auto;
      padding: 8px 12px;
      border-radius: 999px;
      color: #0f766e;
      background: #ccfbf1;
      font-size: 12px;
      font-weight: 800;
    }
    .upload-field {
      display: grid;
      gap: 10px;
      color: #1e293b;
      font-weight: 800;
    }
    .upload-field input {
      width: 100%;
      border: 1px dashed #93c5fd;
      border-radius: 16px;
      padding: 14px;
      color: #334155;
      background: rgba(255,255,255,0.92);
    }
    .csv-message {
      min-height: 24px;
      margin-top: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .csv-message.error {
      color: #dc2626;
    }
    .csv-config {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .csv-config label {
      display: grid;
      gap: 8px;
      color: #334155;
      font-weight: 800;
    }
    .feature-engineering {
      display: grid;
      gap: 12px;
      margin-top: 16px;
      padding: 16px;
      border-radius: 18px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .feature-engineering h4 {
      margin: 0 0 6px;
      color: #0f172a;
      font-size: 17px;
    }
    .feature-engineering p {
      font-size: 13px;
      line-height: 1.6;
    }
    .feature-options {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .feature-options label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 8px 12px;
      border-radius: 999px;
      background: #f8fafc;
      border: 1px solid #dbeafe;
      color: #334155;
      font-weight: 800;
      cursor: pointer;
    }
    .feature-options input {
      width: 16px;
      height: 16px;
      accent-color: #2563eb;
    }
    .param-grid { margin-top: 28px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
    .param-card {
      padding: 22px 24px;
      border-radius: 22px;
      background: linear-gradient(180deg, #f8fbff, #f8fafc);
      border: 1px solid #e5edf7;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
    }
    .switch-field {
      display: flex;
      gap: 12px;
      align-items: center;
      font-weight: 700;
      color: #1e293b;
      min-height: 66px;
      justify-content: center;
      border: 1px solid #d7e1f0;
      border-radius: 18px;
      background: rgba(255,255,255,0.98);
    }
    .footer { margin-top: 26px; display: flex; justify-content: flex-end; }
    button.primary {
      border: 0;
      border-radius: 18px;
      padding: 16px 28px;
      min-width: 150px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 20px 34px rgba(37, 99, 235, 0.24);
    }
    @media (max-width: 980px) {
      .card { padding: 24px 20px; border-radius: 22px; }
      h2 { font-size: 28px; }
      .field small { min-height: auto; }
      select, input[type='number'] { min-height: 58px; font-size: 16px; }
      .footer { justify-content: stretch; }
      button.primary { width: 100%; }
    }
  `]
})
export class ExperimentConfigPanelComponent implements OnChanges, OnDestroy {
  @Input() algorithms: AlgorithmMeta[] = [];
  @Input() datasets: DatasetMeta[] = [];
  @Input() loading = false;
  @Input() selectedConfig: ExperimentConfig | null = null;
  @Output() readonly configChange = new EventEmitter<ExperimentConfig>();

  learningType: LearningType = 'supervised';
  selectedAlgorithmCode = '';
  dataset = '';
  params: Record<string, ParamValue> = {};
  customDataset: CustomDatasetPayload | null = null;
  csvColumns: string[] = [];
  numericCsvColumns: string[] = [];
  csvFeatureColumns: string[] = [];
  csvLabelColumn = '';
  csvMessage = '尚未上传 CSV。';
  csvError = '';
  private pendingConfigEmit: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedConfig'] && this.selectedConfig) {
      this.applyConfig(this.selectedConfig);
      return;
    }

    if (changes['algorithms'] || changes['datasets']) {
      this.ensureDefaults();
      this.scheduleConfigEmit();
    }
  }

  ngOnDestroy(): void {
    if (this.pendingConfigEmit !== null) {
      clearTimeout(this.pendingConfigEmit);
    }
  }

  get learningTypeOptions(): Array<{ label: string; value: LearningType }> {
    const values = Array.from(new Set(this.algorithms.map((item) => item.learningType)));
    return values.map((value) => ({
      value: value as LearningType,
      label: learningTypeLabels[value] ?? value
    }));
  }

  get currentAlgorithms(): AlgorithmMeta[] {
    return this.algorithms.filter((item) => item.learningType === this.learningType);
  }

  get currentAlgorithm(): AlgorithmMeta | undefined {
    return this.currentAlgorithms.find((item) => item.code === this.selectedAlgorithmCode);
  }

  get currentDatasets(): DatasetMeta[] {
    const filtered = this.datasets.filter((item) => item.taskType === this.learningType);
    return filtered.length > 0 ? filtered : this.datasets;
  }

  get datasetOptions(): DatasetMeta[] {
    if (!this.customDataset) {
      return this.currentDatasets;
    }

    return [
      ...this.currentDatasets,
      {
        id: 0,
        code: UPLOADED_CSV_DATASET_CODE,
        name: `上传 CSV：${this.customDataset.name}`,
        description: `${this.customDataset.sampleCount} 行，${this.customDataset.columns.length} 列，使用所选列参与本次训练。`,
        taskType: this.learningType,
        sourceType: 'upload',
        featureCount: this.customDataset.featureColumns.length,
        sampleCount: this.customDataset.sampleCount,
        labelColumn: this.customDataset.labelColumn
      }
    ];
  }

  get currentDataset(): DatasetMeta | undefined {
    return this.datasetOptions.find((item) => item.code === this.dataset);
  }

  get requiresLabel(): boolean {
    return !['kmeans', 'pca'].includes(this.selectedAlgorithmCode);
  }

  handleLearningTypeChange(value: LearningType): void {
    this.learningType = value;
    this.selectedAlgorithmCode = this.currentAlgorithms[0]?.code ?? '';
    this.dataset = this.customDataset ? UPLOADED_CSV_DATASET_CODE : this.currentDatasets[0]?.code ?? '';
    this.resetParams();
    this.refreshCsvSelection();
    this.emitConfig();
  }

  handleAlgorithmChange(value: string): void {
    this.selectedAlgorithmCode = value;
    this.resetParams();
    this.refreshCsvSelection();
    this.emitConfig();
  }

  handleDatasetChange(value: string): void {
    this.dataset = value;
    this.emitConfig();
  }

  handleCsvUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.csvError = '';
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const parsed = this.parseCsvText(text);
        const dataset = this.buildDatasetFromCsv(file.name, parsed);
        this.customDataset = dataset;
        this.csvColumns = dataset.columns;
        this.numericCsvColumns = this.inferNumericColumns(dataset.rows, dataset.columns);
        this.refreshCsvSelection(true);
        this.dataset = UPLOADED_CSV_DATASET_CODE;
        this.csvMessage = `已载入 ${dataset.sampleCount} 行，${dataset.columns.length} 列。`;
        this.emitConfig();
      } catch (error) {
        this.customDataset = null;
        this.csvColumns = [];
        this.numericCsvColumns = [];
        this.csvFeatureColumns = [];
        this.csvLabelColumn = '';
        this.csvError = error instanceof Error ? error.message : 'CSV 解析失败。';
        this.emitConfig();
      }
    };
    reader.onerror = () => {
      this.csvError = 'CSV 文件读取失败。';
    };
    reader.readAsText(file, 'utf-8');
  }

  handleCsvColumnChange(): void {
    this.refreshCustomDatasetColumns();
    this.emitConfig();
  }

  isCsvFeatureSelected(column: string): boolean {
    return this.csvFeatureColumns.includes(column);
  }

  toggleCsvFeature(column: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const checked = input.checked;

    if (checked) {
      if (!this.csvFeatureColumns.includes(column)) {
        this.csvFeatureColumns = [...this.csvFeatureColumns, column];
      }
    } else {
      if (this.csvFeatureColumns.length <= 2) {
        input.checked = true;
        this.csvError = '至少保留两个数值特征，才能绘制二维训练画布。';
        return;
      }
      this.csvFeatureColumns = this.csvFeatureColumns.filter((item) => item !== column);
    }

    this.refreshCsvSelection();
    this.emitConfig();
  }

  getParamLabel(param: ParamSchema): string {
    return param.label || param.key;
  }

  emitConfig(): void {
    if (!this.selectedAlgorithmCode || !this.dataset) {
      return;
    }

    this.configChange.emit({
      learningType: this.learningType,
      algorithm: this.selectedAlgorithmCode,
      dataset: this.dataset,
      params: { ...this.params },
      customDataset: this.dataset === UPLOADED_CSV_DATASET_CODE ? this.customDataset : null
    });
  }

  private ensureDefaults(): void {
    if (this.algorithms.length === 0) {
      return;
    }

    const learningTypeExists = this.learningTypeOptions.some((item) => item.value === this.learningType);
    if (!learningTypeExists) {
      this.learningType = this.learningTypeOptions[0]?.value ?? 'supervised';
    }

    if (!this.currentAlgorithms.some((item) => item.code === this.selectedAlgorithmCode)) {
      this.selectedAlgorithmCode = this.currentAlgorithms[0]?.code ?? '';
      this.resetParams();
    }

    if (!this.datasetOptions.some((item) => item.code === this.dataset)) {
      this.dataset = this.currentDatasets[0]?.code ?? '';
    }
  }

  private applyConfig(config: ExperimentConfig): void {
    this.learningType = config.learningType;
    this.selectedAlgorithmCode = config.algorithm;
    this.dataset = config.dataset;
    this.params = { ...config.params };
    this.customDataset = config.customDataset ?? null;
    this.csvColumns = this.customDataset?.columns ?? [];
    this.numericCsvColumns = this.customDataset ? this.inferNumericColumns(this.customDataset.rows, this.customDataset.columns) : [];
    this.csvFeatureColumns = this.customDataset?.featureColumns ?? [];
    this.csvLabelColumn = this.customDataset?.labelColumn ?? '';
    this.ensureDefaults();
    this.refreshCsvSelection();
    this.scheduleConfigEmit();
  }

  private scheduleConfigEmit(): void {
    if (this.pendingConfigEmit !== null) {
      clearTimeout(this.pendingConfigEmit);
    }
    this.pendingConfigEmit = setTimeout(() => {
      this.pendingConfigEmit = null;
      this.emitConfig();
    });
  }

  private resetParams(): void {
    this.params = {};
    for (const param of this.currentAlgorithm?.paramsSchema ?? []) {
      this.params[param.key] = param.defaultValue;
    }
  }

  private parseCsvText(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const nextChar = text[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        row.push(cell);
        cell = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          index += 1;
        }
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        continue;
      }

      cell += char;
    }

    row.push(cell);
    rows.push(row);

    return rows.filter((item) => item.some((value) => value.trim().length > 0));
  }

  private buildDatasetFromCsv(fileName: string, rows: string[][]): CustomDatasetPayload {
    if (rows.length < 2) {
      throw new Error('CSV 至少需要表头和一行数据。');
    }

    const columns = this.normalizeHeaders(rows[0]);
    const dataRows = rows.slice(1, MAX_CSV_ROWS + 1)
      .filter((row) => row.some((value) => value.trim().length > 0))
      .map((row) => {
        const record: Record<string, CustomDatasetCell> = {};
        columns.forEach((column, index) => {
          record[column] = this.parseCsvCell(row[index] ?? '');
        });
        return record;
      });

    if (dataRows.length < 2) {
      throw new Error('CSV 至少需要两行有效数据。');
    }

    return {
      name: fileName,
      sourceType: 'csv',
      columns,
      rows: dataRows,
      featureColumns: [],
      labelColumn: null,
      sampleCount: dataRows.length
    };
  }

  private normalizeHeaders(rawHeaders: string[]): string[] {
    const used = new Map<string, number>();
    return rawHeaders.map((header, index) => {
      const baseName = (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim() || `column_${index + 1}`;
      const count = used.get(baseName) ?? 0;
      used.set(baseName, count + 1);
      return count === 0 ? baseName : `${baseName}_${count + 1}`;
    });
  }

  private parseCsvCell(value: string): CustomDatasetCell {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) ? numericValue : trimmed;
  }

  private inferNumericColumns(rows: Array<Record<string, CustomDatasetCell>>, columns: string[]): string[] {
    return columns.filter((column) => {
      let numericCount = 0;
      for (const row of rows) {
        const value = row[column];
        if (value === null) {
          continue;
        }
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return false;
        }
        numericCount += 1;
      }
      return numericCount > 0;
    });
  }

  private refreshCsvSelection(forceDefaults = false): void {
    if (!this.customDataset) {
      return;
    }

    if (this.numericCsvColumns.length < 2) {
      this.csvError = 'CSV 至少需要两个数值列，才能绘制二维训练画布。';
      return;
    }

    if (forceDefaults || this.csvFeatureColumns.length < 2) {
      this.csvFeatureColumns = [this.numericCsvColumns[0], this.numericCsvColumns[1]];
    }

    const firstFeature = this.csvFeatureColumns[0] && this.numericCsvColumns.includes(this.csvFeatureColumns[0])
      ? this.csvFeatureColumns[0]
      : this.numericCsvColumns[0];
    const secondFeature = this.csvFeatureColumns[1]
      && this.numericCsvColumns.includes(this.csvFeatureColumns[1])
      && this.csvFeatureColumns[1] !== firstFeature
      ? this.csvFeatureColumns[1]
      : this.numericCsvColumns.find((column) => column !== firstFeature) ?? this.numericCsvColumns[1];
    const extraFeatures = this.csvFeatureColumns.filter((column) =>
      this.numericCsvColumns.includes(column)
      && column !== firstFeature
      && column !== secondFeature
    );
    this.csvFeatureColumns = [firstFeature, secondFeature, ...extraFeatures];

    if (this.requiresLabel) {
      const labelStillValid = this.csvLabelColumn
        && this.csvColumns.includes(this.csvLabelColumn)
        && !this.csvFeatureColumns.includes(this.csvLabelColumn);
      if (!labelStillValid || forceDefaults) {
        this.csvLabelColumn = this.csvColumns.find((column) => !this.csvFeatureColumns.includes(column) && !this.numericCsvColumns.includes(column))
          ?? this.csvColumns.find((column) => !this.csvFeatureColumns.includes(column))
          ?? '';
      }
    } else {
      this.csvLabelColumn = '';
    }

    this.refreshCustomDatasetColumns();
  }

  private refreshCustomDatasetColumns(): void {
    if (!this.customDataset) {
      return;
    }

    const featureColumns = Array.from(new Set(this.csvFeatureColumns.filter((column) => this.numericCsvColumns.includes(column))));
    const labelColumn = this.requiresLabel ? this.csvLabelColumn || null : null;

    this.csvError = '';
    if (featureColumns.length < 2) {
      this.csvError = '请选择两个不同的数值特征列。';
    } else if (this.requiresLabel && (!labelColumn || featureColumns.includes(labelColumn))) {
      this.csvError = '请选择一个不与特征列重复的标签列。';
    }

    this.customDataset = {
      ...this.customDataset,
      featureColumns,
      labelColumn
    };
  }
}
