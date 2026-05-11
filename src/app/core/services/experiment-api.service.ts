import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ExperimentRecord, SaveExperimentRequest } from '../models/platform.models';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class ExperimentApiService {
  private readonly apiClient = inject(ApiClientService);

  saveExperiment(payload: SaveExperimentRequest): Observable<ExperimentRecord> {
    return this.apiClient.post<ExperimentRecord>('/experiments', payload);
  }

  listHistory(userId: number): Observable<ExperimentRecord[]> {
    return this.apiClient.get<ExperimentRecord[]>('/experiments/history', { userId });
  }
}
