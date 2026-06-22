import { Injectable, signal } from '@angular/core';

/**
 * 收集"当前实验页面"的上下文,供 AI 助手作答时参考。
 * 各面板(配置/训练)调用 patch() 写入自己关心的片段;AI 发送时读取 snapshot()。
 */
@Injectable({ providedIn: 'root' })
export class ExperimentContextService {
  private readonly _ctx = signal<Record<string, unknown>>({});
  readonly ctx = this._ctx.asReadonly();

  patch(partial: Record<string, unknown>): void {
    this._ctx.update((c) => ({ ...c, ...partial }));
  }

  snapshot(): Record<string, unknown> {
    return this._ctx();
  }
}
