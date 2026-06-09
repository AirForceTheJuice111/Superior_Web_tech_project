import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AlgorithmMeta, CustomDatasetPayload, DatasetMeta } from '../models/platform.models';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly apiClient = inject(ApiClientService);

  listAlgorithms(): Observable<AlgorithmMeta[]> {
    return this.apiClient.get<AlgorithmMeta[]>('/algorithms');
  }

  listDatasets(): Observable<DatasetMeta[]> {
    return this.apiClient.get<DatasetMeta[]>('/datasets');
  }

  createDataset(payload: CustomDatasetPayload): Observable<DatasetMeta> {
    return this.apiClient.post<DatasetMeta>('/datasets', {
      name: payload.name,
      columns: payload.columns,
      rows: payload.rows,
      featureColumns: payload.featureColumns,
      labelColumn: payload.labelColumn
    });
  }
}
