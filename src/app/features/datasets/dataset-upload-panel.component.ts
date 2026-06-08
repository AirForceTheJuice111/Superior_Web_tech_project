import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { UploadedDataset, UploadedDatasetDetail, UserProfile } from '../../core/models/platform.models';
import { DatasetUploadApiService } from '../../core/services/dataset-upload-api.service';

interface ParsedCsv {
  headers: string[];
  rows: string[][];
  numericColumns: string[];
}

const MAX_ROWS = 1000;
const MAX_COLUMNS = 50;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-dataset-upload-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dataset-upload-panel.component.html',
  styleUrls: ['./dataset-upload-panel.component.css']
})
export class DatasetUploadPanelComponent implements OnChanges {
  @Input() user: UserProfile | null = null;
  @Output() readonly datasetsChanged = new EventEmitter<void>();

  parsed: ParsedCsv | null = null;
  fileName = '';
  datasetName = '';
  description = '';
  labelColumn = '';

  uploaded: UploadedDataset[] = [];
  detail: UploadedDatasetDetail | null = null;
  detailCode = '';

  loadingList = false;
  uploading = false;
  message = '选择一个 CSV 文件开始解析（仅支持纯数据，最多 1000 行 / 50 列）。';
  parseError = '';

  private readonly subscriptions = new Subscription();

  constructor(private readonly uploadApi: DatasetUploadApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      if (this.user) {
        this.refreshList();
      } else {
        this.uploaded = [];
        this.closeDetail();
      }
    }
  }

  get canUpload(): boolean {
    return !!this.user && !!this.parsed && this.datasetName.trim().length > 0 && !this.uploading;
  }

  get previewHeaders(): string[] {
    return this.parsed?.headers ?? [];
  }

  get previewRows(): string[][] {
    return this.parsed ? this.parsed.rows.slice(0, 8) : [];
  }

  refreshList(): void {
    if (!this.user) {
      this.uploaded = [];
      return;
    }
    this.loadingList = true;
    const sub = this.uploadApi.listUploaded(this.user.userId).subscribe({
      next: (items) => {
        this.uploaded = items;
      },
      error: (error: unknown) => {
        this.message = error instanceof Error ? error.message : '上传数据集列表加载失败';
        this.loadingList = false;
      },
      complete: () => {
        this.loadingList = false;
      }
    });
    this.subscriptions.add(sub);
  }

  handleFileChange(event: Event): void {
    this.parseError = '';
    this.detail = null;
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.parseError = `文件超过 ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB 上限`;
      return;
    }
    this.fileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.parsed = this.parseCsv(String(reader.result ?? ''));
        this.labelColumn = '';
        if (!this.datasetName.trim()) {
          this.datasetName = file.name.replace(/\.csv$/i, '');
        }
        this.message = `解析成功：${this.parsed.headers.length} 列 / ${this.parsed.rows.length} 行，识别到数值列 ${this.parsed.numericColumns.length} 个。`;
      } catch (error: unknown) {
        this.parsed = null;
        this.parseError = error instanceof Error ? error.message : 'CSV 解析失败';
      }
    };
    reader.onerror = () => {
      this.parseError = '读取文件失败';
    };
    reader.readAsText(file);
  }

  upload(): void {
    if (!this.user || !this.parsed || !this.canUpload) {
      return;
    }
    this.uploading = true;
    const payload = {
      userId: this.user.userId,
      name: this.datasetName.trim(),
      description: this.description.trim() || undefined,
      headers: this.parsed.headers,
      rows: this.parsed.rows,
      labelColumn: this.labelColumn || null
    };

    const sub = this.uploadApi.upload(payload).subscribe({
      next: (created) => {
        this.message = `数据集「${created.name}」已保存，code=${created.code}。`;
        this.resetForm();
        this.refreshList();
        this.datasetsChanged.emit();
      },
      error: (error: unknown) => {
        this.message = error instanceof Error ? error.message : '上传失败';
        this.uploading = false;
      },
      complete: () => {
        this.uploading = false;
      }
    });
    this.subscriptions.add(sub);
  }

  viewDetail(code: string): void {
    this.detailCode = code;
    const sub = this.uploadApi.getDetail(code).subscribe({
      next: (detail) => {
        this.detail = detail;
      },
      error: (error: unknown) => {
        this.message = error instanceof Error ? error.message : '详情加载失败';
      }
    });
    this.subscriptions.add(sub);
  }

  closeDetail(): void {
    this.detail = null;
    this.detailCode = '';
  }

  remove(item: UploadedDataset): void {
    if (!this.user) {
      return;
    }
    const sub = this.uploadApi.delete(item.code, this.user.userId).subscribe({
      next: () => {
        this.message = `数据集「${item.name}」已删除。`;
        this.uploaded = this.uploaded.filter((row) => row.code !== item.code);
        if (this.detailCode === item.code) {
          this.closeDetail();
        }
        this.datasetsChanged.emit();
      },
      error: (error: unknown) => {
        this.message = error instanceof Error ? error.message : '删除失败';
      }
    });
    this.subscriptions.add(sub);
  }

  private resetForm(): void {
    this.parsed = null;
    this.fileName = '';
    this.datasetName = '';
    this.description = '';
    this.labelColumn = '';
  }

  /**
   * 纯前端 CSV 解析：支持双引号包裹字段、字段内逗号与转义双引号、\r\n 换行。
   * 仅做数据切分，不执行任何单元格内容。
   */
  private parseCsv(text: string): ParsedCsv {
    const records = this.splitRecords(text);
    if (records.length === 0) {
      throw new Error('CSV 内容为空');
    }
    const headers = records[0].map((value) => value.trim());
    if (headers.length === 0 || headers.some((header) => header.length === 0)) {
      throw new Error('表头存在空列名');
    }
    if (new Set(headers).size !== headers.length) {
      throw new Error('表头存在重复列名');
    }
    if (headers.length > MAX_COLUMNS) {
      throw new Error(`列数超过上限 ${MAX_COLUMNS}`);
    }

    const rows: string[][] = [];
    for (let i = 1; i < records.length; i++) {
      const record = records[i];
      if (record.length === 1 && record[0].trim() === '') {
        continue;
      }
      if (record.length !== headers.length) {
        throw new Error(`第 ${i + 1} 行的列数与表头不一致`);
      }
      rows.push(record);
    }
    if (rows.length === 0) {
      throw new Error('没有可用的数据行');
    }
    if (rows.length > MAX_ROWS) {
      throw new Error(`行数超过上限 ${MAX_ROWS}`);
    }

    return { headers, rows, numericColumns: this.detectNumericColumns(headers, rows) };
  }

  private detectNumericColumns(headers: string[], rows: string[][]): string[] {
    const numeric: string[] = [];
    for (let col = 0; col < headers.length; col++) {
      const allNumeric = rows.every((row) => {
        const cell = row[col]?.trim() ?? '';
        return cell.length > 0 && !Number.isNaN(Number(cell));
      });
      if (allNumeric) {
        numeric.push(headers[col]);
      }
    }
    return numeric;
  }

  private splitRecords(text: string): string[][] {
    const records: string[][] = [];
    let field = '';
    let row: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        records.push(row);
        row = [];
        field = '';
      } else if (char === '\r') {
        // 跳过，等待后续 \n 或下一字符
      } else {
        field += char;
      }
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      records.push(row);
    }
    return records;
  }
}
