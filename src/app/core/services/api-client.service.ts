import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/platform.models';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  get<T>(url: string, params?: Record<string, string | number | boolean | null | undefined>): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.apiBase}${url}`, {
      params: this.buildParams(params)
    }).pipe(this.unwrapResponse());
  }

  post<T>(url: string, body?: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.apiBase}${url}`, body ?? {}).pipe(this.unwrapResponse());
  }

  private unwrapResponse<T>() {
    return map((response: ApiResponse<T>) => {
      if (response.code !== 200) {
        throw new Error(response.message || '请求失败');
      }
      return response.data;
    });
  }

  private buildParams(params?: Record<string, string | number | boolean | null | undefined>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams.keys().length > 0 ? httpParams : undefined;
  }
}
