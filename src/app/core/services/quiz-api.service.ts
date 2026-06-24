import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  QuizOverviewItem,
  QuizQuestion,
  QuizSubmitRequest,
  QuizSubmitResult
} from '../models/platform.models';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class QuizApiService {
  private readonly apiClient = inject(ApiClientService);

  /** 各专题题量 + 当前登录用户的最佳成绩(带 token 自动注入) */
  getOverview(): Observable<QuizOverviewItem[]> {
    return this.apiClient.get<QuizOverviewItem[]>('/quiz/overview');
  }

  /** 某专题全部题目(不含答案) */
  listQuestions(topicId: string): Observable<QuizQuestion[]> {
    return this.apiClient.get<QuizQuestion[]>('/quiz/questions', { topicId });
  }

  /** 提交作答,后端判分;登录用户成绩按最佳值落库 */
  submit(payload: QuizSubmitRequest): Observable<QuizSubmitResult> {
    return this.apiClient.post<QuizSubmitResult>('/quiz/submit', payload);
  }
}
