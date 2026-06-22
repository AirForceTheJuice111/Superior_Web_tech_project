import { Injectable, NgZone, signal } from '@angular/core';

import { ExperimentContextService } from './experiment-context.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiStatus {
  configured: boolean;
  model?: string;
}

/**
 * 前端对话状态 + 流式调用。
 * 通过 fetch 读取后端 SSE(/api/ai/chat/stream),逐帧把增量文本追加到最后一条助手消息,
 * 从而形成打字机效果。API key 全程在后端,前端不接触。
 */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly _messages = signal<ChatMessage[]>([]);
  readonly messages = this._messages.asReadonly();

  private readonly _streaming = signal(false);
  readonly streaming = this._streaming.asReadonly();

  private readonly _status = signal<AiStatus>({ configured: false });
  readonly status = this._status.asReadonly();

  private controller?: AbortController;

  constructor(
    private readonly zone: NgZone,
    private readonly context: ExperimentContextService
  ) {}

  async checkStatus(): Promise<void> {
    try {
      const r = await fetch('/api/ai/status');
      const j = await r.json();
      const data = j?.data ?? {};
      this.zone.run(() =>
        this._status.set({ configured: !!data.configured, model: data.model })
      );
    } catch {
      /* 状态获取失败时按未配置处理 */
    }
  }

  clear(): void {
    if (this._streaming()) {
      this.stop();
    }
    this._messages.set([]);
  }

  stop(): void {
    this.controller?.abort();
  }

  async send(text: string): Promise<void> {
    const content = text.trim();
    if (!content || this._streaming()) {
      return;
    }

    this._messages.update((m) => [
      ...m,
      { role: 'user', content },
      { role: 'assistant', content: '' }
    ]);
    this._streaming.set(true);
    this.controller = new AbortController();

    const payloadMessages = this._messages()
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          context: this.context.snapshot()
        }),
        signal: this.controller.signal
      });

      if (!resp.ok || !resp.body) {
        this.appendToLast(`\n[请求失败] HTTP ${resp.status}`);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          this.handleFrame(frame);
        }
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        this.appendToLast('\n[连接中断] ' + ((e as Error)?.message ?? ''));
      }
    } finally {
      this.zone.run(() => this._streaming.set(false));
      this.controller = undefined;
    }
  }

  private handleFrame(frame: string): void {
    const line = frame.split('\n').find((l) => l.startsWith('data:'));
    if (!line) {
      return;
    }
    const json = line.slice('data:'.length).trim();
    if (!json) {
      return;
    }
    try {
      const evt = JSON.parse(json);
      if (evt.type === 'delta' && evt.text) {
        this.appendToLast(evt.text);
      } else if (evt.type === 'error' && evt.message) {
        this.appendToLast('\n[错误] ' + evt.message);
      }
    } catch {
      /* 忽略无法解析的帧 */
    }
  }

  private appendToLast(text: string): void {
    this.zone.run(() => {
      this._messages.update((m) => {
        if (m.length === 0) {
          return m;
        }
        const copy = m.slice();
        const last = copy[copy.length - 1];
        if (last.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: last.content + text };
        }
        return copy;
      });
    });
  }
}
