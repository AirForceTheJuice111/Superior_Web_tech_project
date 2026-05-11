import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TrainingSessionResponse, TrainingStatusResponse } from '../models/platform.models';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class TrainingApiService {
  private readonly apiClient = inject(ApiClientService);

  initTraining(payload: Record<string, unknown>): Observable<TrainingSessionResponse> {
    return this.apiClient.post<TrainingSessionResponse>('/trainings', payload);
  }

  stepTraining(sessionId: string, stepCount = 1): Observable<TrainingStatusResponse> {
    return this.apiClient.post<TrainingStatusResponse>(`/trainings/${sessionId}/step`, { stepCount });
  }

  runTraining(sessionId: string, payload: Record<string, unknown>): Observable<TrainingSessionResponse> {
    return this.apiClient.post<TrainingSessionResponse>(`/trainings/${sessionId}/run`, payload);
  }

  pauseTraining(sessionId: string): Observable<TrainingSessionResponse> {
    return this.apiClient.post<TrainingSessionResponse>(`/trainings/${sessionId}/pause`);
  }

  stopTraining(sessionId: string): Observable<TrainingSessionResponse> {
    return this.apiClient.post<TrainingSessionResponse>(`/trainings/${sessionId}/stop`);
  }

  getTrainingStatus(sessionId: string): Observable<TrainingStatusResponse> {
    return this.apiClient.get<TrainingStatusResponse>(`/trainings/${sessionId}/status`);
  }
}
