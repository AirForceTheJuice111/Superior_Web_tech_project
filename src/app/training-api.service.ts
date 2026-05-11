import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';

import { TrainingSessionResponse, TrainingStatusResponse } from './models';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class TrainingApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  initTraining(payload: Record<string, unknown>): Observable<TrainingSessionResponse> {
    return this.request<TrainingSessionResponse>('POST', '/trainings', payload);
  }

  stepTraining(sessionId: string, stepCount = 1): Observable<TrainingStatusResponse> {
    return this.request<TrainingStatusResponse>('POST', `/trainings/${sessionId}/step`, { stepCount });
  }

  runTraining(sessionId: string, payload: Record<string, unknown>): Observable<TrainingSessionResponse> {
    return this.request<TrainingSessionResponse>('POST', `/trainings/${sessionId}/run`, payload);
  }

  pauseTraining(sessionId: string): Observable<TrainingSessionResponse> {
    return this.request<TrainingSessionResponse>('POST', `/trainings/${sessionId}/pause`);
  }

  stopTraining(sessionId: string): Observable<TrainingSessionResponse> {
    return this.request<TrainingSessionResponse>('POST', `/trainings/${sessionId}/stop`);
  }

  getTrainingStatus(sessionId: string): Observable<TrainingStatusResponse> {
    return this.request<TrainingStatusResponse>('GET', `/trainings/${sessionId}/status`);
  }

  private request<T>(method: string, url: string, body?: Record<string, unknown>): Observable<T> {
    return this.http.request<ApiResponse<T>>(method, `${this.apiBase}${url}`, { body }).pipe(
      map((response) => {
        if (response.code !== 200) {
          throw new Error(response.message || '请求失败');
        }
        return response.data;
      }),
      map((data) => data),
    );
  }
}
