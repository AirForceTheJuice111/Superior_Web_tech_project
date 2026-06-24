import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, OperatorFunction, TimeoutError, catchError, map, retry, throwError, timeout, timer } from 'rxjs';

import { ApiResponse } from '../models/platform.models';
import { AuthSessionService } from './auth-session.service';

/** 单次请求超时(ms)。需大于跨境慢响应(2-6s)留足余量,只拦真正的卡死。 */
const REQUEST_TIMEOUT_MS = 12000;
/** GET 失败时的最大重试次数(仅瞬时错误:网络中断/超时/5xx)。 */
const GET_RETRY_COUNT = 2;

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly apiBase = '/api';

  get<T>(url: string, params?: Record<string, string | number | boolean | null | undefined>): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.apiBase}${url}`, {
      params: this.buildParams(params),
      headers: this.authHeaders()
    }).pipe(
      // 跨境公网链路约 8% 请求会丢包/卡死;对幂等的 GET 加超时+瞬时重试,
      // 避免目录(算法/数据集/案例)forkJoin 因单个请求失败而整批白屏(BUG-07)。
      timeout(REQUEST_TIMEOUT_MS),
      retry({
        count: GET_RETRY_COUNT,
        delay: (error, retryCount) => {
          if (!this.isTransient(error)) {
            return throwError(() => error);
          }
          return timer(300 * retryCount); // 退避: 300ms, 600ms
        }
      }),
      this.unwrapResponse(),
      this.normalizeError()
    );
  }

  post<T>(url: string, body?: unknown): Observable<T> {
    // POST 非幂等(登录/注册/保存/训练步进),不做自动重试以免重复提交;
    // 仅做错误信息归一化,把后端业务消息透出给 UI(BUG-03)。
    return this.http.post<ApiResponse<T>>(`${this.apiBase}${url}`, body ?? {}, {
      headers: this.authHeaders()
    }).pipe(this.unwrapResponse(), this.normalizeError());
  }

  private authHeaders(): Record<string, string> {
    const token = this.session.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private unwrapResponse<T>(): OperatorFunction<ApiResponse<T>, T> {
    return map((response: ApiResponse<T>) => {
      if (response.code !== 200) {
        throw new Error(response.message || '请求失败');
      }
      return response.data;
    });
  }

  /** 把 HttpErrorResponse / 超时归一化为带可读后端消息的 Error,供各调用点直接读 error.message。 */
  private normalizeError<T>(): OperatorFunction<T, T> {
    return catchError((error: unknown) => {
      if (error instanceof TimeoutError) {
        return throwError(() => new Error('请求超时，请稍后重试'));
      }
      if (error instanceof HttpErrorResponse) {
        const backendMessage = (error.error && typeof error.error === 'object'
          ? (error.error as ApiResponse<unknown>).message
          : undefined);
        return throwError(() => new Error(backendMessage || error.message || '请求失败'));
      }
      return throwError(() => error);
    });
  }

  private isTransient(error: unknown): boolean {
    if (error instanceof TimeoutError) {
      return true;
    }
    if (error instanceof HttpErrorResponse) {
      // status 0 = 网络中断/CORS/被阻断; >=500 = 服务端瞬时错误。4xx 是确定性业务错误,不重试。
      return error.status === 0 || error.status >= 500;
    }
    return false;
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
