import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ExperimentCase } from '../models/platform.models';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class ExperimentCaseApiService {
  private readonly apiClient = inject(ApiClientService);

  listCases(): Observable<ExperimentCase[]> {
    return this.apiClient.get<ExperimentCase[]>('/experiment-cases');
  }
}
