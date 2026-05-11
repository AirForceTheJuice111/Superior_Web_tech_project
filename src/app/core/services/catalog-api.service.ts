import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AlgorithmMeta, DatasetMeta } from '../models/platform.models';
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
}
