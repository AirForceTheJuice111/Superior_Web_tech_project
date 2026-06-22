import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AiChatService } from '../../core/services/ai-chat.service';

/**
 * 全局 AI 助教:右侧中部悬浮按钮(随页面滚动常驻)+ 右侧滑出对话面板。
 * 流式打字机效果由 AiChatService 逐帧追加实现。密钥全程在后端。
 */
@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="fab" type="button" (click)="toggle()" [class.gone]="open()" aria-label="打开 AI 助教">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" fill="currentColor"/>
        <circle cx="18.5" cy="16.5" r="1.6" fill="currentColor"/>
        <circle cx="6" cy="17" r="1.1" fill="currentColor"/>
      </svg>
    </button>

    <section class="panel" *ngIf="open()" role="dialog" aria-label="AI 助教对话">
      <header class="head">
        <span class="title"><i class="dot"></i> AI 助教<small *ngIf="chat.status().model">{{ chat.status().model }}</small></span>
        <span class="acts">
          <button type="button" (click)="chat.clear()" title="清空对话">清空</button>
          <button type="button" class="x" (click)="close()" aria-label="关闭">✕</button>
        </span>
      </header>

      <div class="messages" #scroll>
        <div class="welcome" *ngIf="chat.messages().length === 0">
          <p>我会结合你当前的算法 / 数据集 / 超参与训练结果来回答。试试:</p>
          <div class="chips">
            <button *ngFor="let s of suggestions" type="button" class="chip" (click)="ask(s)">{{ s }}</button>
          </div>
          <p class="warn" *ngIf="!chat.status().configured">尚未配置 API Key,请在后端环境变量 APP_AI_API_KEY 设置后再用。</p>
        </div>

        <div *ngFor="let m of chat.messages()" class="msg" [class.user]="m.role === 'user'">
          <div class="bubble">{{ m.content }}<span class="caret" *ngIf="m.role === 'assistant' && chat.streaming() && !m.content">●</span></div>
        </div>
      </div>

      <footer class="composer">
        <textarea [(ngModel)]="input" (keydown)="onKeydown($event)" rows="1"
          placeholder="问点什么…  (Enter 发送 / Shift+Enter 换行)" [disabled]="chat.streaming()"></textarea>
        <button *ngIf="!chat.streaming()" class="send" type="button" (click)="submit()" [disabled]="!input.trim()">发送</button>
        <button *ngIf="chat.streaming()" class="send stop" type="button" (click)="chat.stop()">停止</button>
      </footer>
    </section>
  `,
  styles: [`
    :host { position: fixed; inset: 0; pointer-events: none; z-index: 1000; }
    .fab, .panel { pointer-events: auto; }

    .fab {
      position: fixed; right: 20px; top: 50%; transform: translateY(-50%);
      width: 54px; height: 54px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.18);
      display: grid; place-items: center; color: #eaf0ff; cursor: pointer;
      background: linear-gradient(150deg, #2a3aa8, #5b34b0 70%, #8a2e6e);
      box-shadow: 0 10px 30px -8px rgba(70,80,220,0.55), inset 0 1px 0 rgba(255,255,255,0.25);
      animation: pulse 3.6s ease-in-out infinite;
    }
    .fab:hover { transform: translateY(-50%) scale(1.06); }
    .fab.gone { display: none; }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 10px 30px -8px rgba(70,80,220,0.45), inset 0 1px 0 rgba(255,255,255,0.25); }
      50% { box-shadow: 0 12px 40px -6px rgba(120,70,200,0.75), inset 0 1px 0 rgba(255,255,255,0.3); }
    }

    .panel {
      position: fixed; top: 0; right: 0; height: 100dvh; width: min(400px, 92vw);
      display: flex; flex-direction: column; color: #e7eaf6;
      background: rgba(11,13,32,0.92); backdrop-filter: blur(16px);
      border-left: 1px solid rgba(255,255,255,0.10);
      box-shadow: -24px 0 60px -30px rgba(0,0,0,0.8);
      animation: slidein 0.28s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes slidein { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    .head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .title { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
    .title small { color: #9aa3c7; font-weight: 500; font-size: 11px; margin-left: 2px; font-family: ui-monospace, monospace; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #7c9cff; box-shadow: 0 0 8px #7c9cff; }
    .acts { display: inline-flex; gap: 6px; }
    .acts button { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); color: #c9cfe8; border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
    .acts button:hover { background: rgba(255,255,255,0.12); }
    .acts .x { padding: 5px 9px; }

    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .welcome { color: #aab2d6; font-size: 13px; line-height: 1.7; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .chip { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: #d6dbf2; border-radius: 999px; padding: 7px 12px; font-size: 12px; cursor: pointer; text-align: left; }
    .chip:hover { background: rgba(124,156,255,0.18); border-color: rgba(124,156,255,0.4); }
    .warn { color: #ffb4a2; font-size: 12px; margin-top: 8px; }

    .msg { display: flex; }
    .msg.user { justify-content: flex-end; }
    .bubble { max-width: 86%; padding: 10px 13px; border-radius: 14px; font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
    .msg:not(.user) .bubble { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #e7eaf6; border-top-left-radius: 4px; }
    .msg.user .bubble { background: linear-gradient(135deg, #3b4fd6, #6a3fd0); color: #fff; border-top-right-radius: 4px; }
    .caret { display: inline-block; animation: blink 1s steps(2) infinite; color: #9aa3c7; }
    @keyframes blink { 50% { opacity: 0.2; } }

    .composer { display: flex; gap: 8px; padding: 12px; border-top: 1px solid rgba(255,255,255,0.08); align-items: flex-end; }
    .composer textarea { flex: 1; resize: none; max-height: 120px; min-height: 42px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 11px 12px; color: #eef1fb; font-size: 14px; line-height: 1.5; }
    .composer textarea::placeholder { color: #7e87ad; }
    .composer textarea:focus { border-color: #7c9cff; box-shadow: 0 0 0 3px rgba(124,156,255,0.2); outline: none; }
    .send { border: 0; border-radius: 12px; padding: 0 16px; height: 42px; font-weight: 600; font-size: 14px; cursor: pointer; color: #fff; background: linear-gradient(135deg, #3b4fd6, #6a3fd0); }
    .send:disabled { opacity: 0.45; cursor: not-allowed; }
    .send.stop { background: rgba(255,255,255,0.12); }

    @media (prefers-reduced-motion: reduce) {
      .fab { animation: none; }
      .panel { animation: none; }
      .caret { animation: none; }
    }
  `]
})
export class AiAssistantComponent implements OnInit {
  readonly open = signal(false);
  input = '';
  readonly suggestions = [
    '用一句话解释我当前选的算法',
    'loss 为什么会震荡?怎么调?',
    '帮我推荐一组合理的超参数',
    '这次训练结果说明了什么?'
  ];

  @ViewChild('scroll') private scrollRef?: ElementRef<HTMLDivElement>;

  constructor(public readonly chat: AiChatService) {
    effect(() => {
      this.chat.messages();
      setTimeout(() => this.scrollToBottom(), 0);
    });
  }

  ngOnInit(): void {
    this.chat.checkStatus();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) {
      this.close();
    }
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }

  close(): void {
    this.open.set(false);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    }
  }

  submit(): void {
    const t = this.input;
    this.input = '';
    void this.chat.send(t);
  }

  ask(s: string): void {
    void this.chat.send(s);
  }

  private scrollToBottom(): void {
    const el = this.scrollRef?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
