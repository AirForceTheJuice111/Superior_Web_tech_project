import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import {
  ApiResponse,
  UploadDatasetRequest,
  UploadedDataset,
  UploadedDatasetDetail
} from '../models/platform.models';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class DatasetUploadApiService {
  private readonly apiClient = inject(ApiClientService);
  private readonly http = inject(HttpClient);

  upload(payload: UploadDatasetRequest): Observable<UploadedDataset> {
    return this.apiClient.post<UploadedDataset>('/datasets/upload', payload);
  }

  listUploaded(userId: number): Observable<UploadedDataset[]> {
    return this.apiClient.get<UploadedDataset[]>('/datasets/uploaded', { userId });
  }

  getDetail(code: string): Observable<UploadedDatasetDetail> {
    return this.apiClient.get<UploadedDatasetDetail>(`/datasets/uploaded/${code}`);
  }

  /**
   * 删除上传数据集。后端会校验归属（owner_user_id），不能删除他人数据集。
   * ApiClientService 未暴露 delete，这里直接走 HttpClient 并复用统一解包逻辑。
   */
  delete(code: string, userId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`/api/datasets/uploaded/${code}`, { params: { userId: String(userId) } })
      .pipe(
        map((response) => {
          if (response.code !== 200) {
            throw new Error(response.message || '删除失败');
          }
          return undefined;
        })
      );
  }
}
