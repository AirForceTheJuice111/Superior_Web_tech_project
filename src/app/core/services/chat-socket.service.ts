import { Injectable, signal } from '@angular/core';

import { ChatMessage } from '../models/platform.models';

/**
 * 实时聊天室 WebSocket 客户端。
 * - 每个标签页只保持「一条」连接:open() 前先彻底拆掉旧连接(摘除回调再 close),
 *   避免重连/换 token 时残留多条连接(否则在线数虚高、消息重复)。
 * - 收到的消息按 id 去重,二次兜底防重复。
 */
@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  readonly messages = signal<ChatMessage[]>([]);
  readonly online = signal(0);
  readonly connected = signal(false);
  readonly lastError = signal('');

  private ws: WebSocket | null = null;
  private token: string | null = null;
  private retry = 0;
  private manualClose = false;
  private started = false;

  /** 首次连接(幂等):已启动则只更新 token,不重复连。 */
  connect(token: string | null): void {
    this.token = token;
    if (this.started) {
      return;
    }
    this.started = true;
    this.open();
  }

  /** 登录/登出后带新 token 重连(单连接:open 会先拆旧连接)。 */
  reconnectWithToken(token: string | null): void {
    this.token = token;
    this.started = true;
    this.open();
  }

  send(content: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ content }));
    }
  }

  disconnect(): void {
    this.manualClose = true;
    this.teardown();
    this.started = false;
  }

  /** 摘除回调后再关闭,确保旧连接的 onclose 不会触发重连。 */
  private teardown(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
  }

  private open(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.teardown();
    this.manualClose = false;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws/chat`
      + (this.token ? `?token=${encodeURIComponent(this.token)}` : '');
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;
    socket.onopen = () => {
      this.connected.set(true);
      this.retry = 0;
      this.lastError.set('');
    };
    socket.onmessage = (event) => this.handle(event.data);
    socket.onclose = () => {
      // 只有「当前」连接断开且非主动关闭时才重连;被 teardown 摘除回调的旧连接不会进来
      if (this.ws === socket) {
        this.connected.set(false);
        if (!this.manualClose) {
          this.scheduleReconnect();
        }
      }
    };
    socket.onerror = () => {
      this.lastError.set('聊天连接异常');
    };
  }

  private handle(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }
    let payload: { type?: string; messages?: ChatMessage[]; message?: ChatMessage; online?: number };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    switch (payload.type) {
      case 'history':
        this.messages.set(payload.messages ?? []);
        break;
      case 'message':
        if (payload.message) {
          const incoming = payload.message;
          this.messages.update((list) => {
            // 按 id 去重,防止任何残留重复连接造成的消息重复
            if (incoming.id !== undefined && list.some((m) => m.id === incoming.id)) {
              return list;
            }
            return [...list, incoming].slice(-200);
          });
        }
        break;
      case 'presence':
        this.online.set(payload.online ?? 0);
        break;
      case 'error':
        this.lastError.set((payload as { message?: string }).message ?? '发送失败');
        break;
      default:
        break;
    }
  }

  private scheduleReconnect(): void {
    this.retry = Math.min(this.retry + 1, 6);
    setTimeout(() => {
      if (!this.manualClose) {
        this.open();
      }
    }, 1000 * this.retry);
  }
}
