import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { UserProfile } from '../../core/models/platform.models';
import { AuthApiService } from '../../core/services/auth-api.service';

@Component({
  selector: 'app-login-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <div class="card-header">
        <div>
          <h2>课程账号登录</h2>
          <p>演示账号可直接使用 <code>student / 123456</code> 或 <code>teacher / 123456</code>。</p>
        </div>
        <span class="badge" *ngIf="user">{{ user.role }}</span>
      </div>

      <div *ngIf="!user; else loggedInBlock" class="form-grid">
        <label class="field">
          <span>用户名</span>
          <input type="text" [(ngModel)]="username" placeholder="student" />
        </label>
        <label class="field">
          <span>密码</span>
          <input type="password" [(ngModel)]="password" placeholder="123456" />
        </label>
        <button class="primary" type="button" (click)="handleLogin()" [disabled]="loading">登录</button>
      </div>

      <ng-template #loggedInBlock>
        <div class="summary">
          <div>
            <strong>当前用户</strong>
            <span>{{ user?.displayName }}</span>
          </div>
          <div>
            <strong>用户名</strong>
            <span>{{ user?.username }}</span>
          </div>
          <div>
            <strong>Token</strong>
            <span>{{ user?.token }}</span>
          </div>
        </div>
        <div class="actions">
          <button type="button" (click)="logout.emit()">退出登录</button>
        </div>
      </ng-template>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
    </section>
  `,
  styles: [`
    .card {
      background: rgba(255,255,255,0.94);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(255,255,255,0.8);
    }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
    h2 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0; color: #64748b; line-height: 1.7; }
    code { padding: 2px 6px; border-radius: 8px; background: #eff6ff; color: #1d4ed8; }
    .badge { padding: 6px 12px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: end; }
    .field { display: flex; flex-direction: column; gap: 8px; font-weight: 600; color: #334155; }
    input { border: 1px solid #dbe2ea; border-radius: 14px; padding: 12px 14px; background: rgba(255,255,255,0.98); }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; padding: 14px; border-radius: 16px; background: linear-gradient(180deg, #f8fbff, #f8fafc); border: 1px solid #e2e8f0; }
    .summary strong { display: block; font-size: 12px; color: #64748b; }
    .summary span { display: block; margin-top: 4px; font-weight: 600; word-break: break-all; }
    .actions { margin-top: 12px; }
    button { border: 0; border-radius: 14px; padding: 12px 18px; background: #e2e8f0; color: #0f172a; font-weight: 700; cursor: pointer; }
    button.primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; box-shadow: 0 18px 30px rgba(37, 99, 235, 0.18); }
    .error { margin-top: 12px; color: #dc2626; }
  `]
})
export class LoginPanelComponent implements OnDestroy {
  @Input() user: UserProfile | null = null;
  @Output() readonly loginSuccess = new EventEmitter<UserProfile>();
  @Output() readonly logout = new EventEmitter<void>();

  username = 'student';
  password = '123456';
  loading = false;
  errorMessage = '';

  private readonly subscriptions = new Subscription();

  constructor(private readonly authApi: AuthApiService) {}

  handleLogin(): void {
    this.loading = true;
    this.errorMessage = '';
    const sub = this.authApi.login({ username: this.username, password: this.password }).subscribe({
      next: (user) => this.loginSuccess.emit(user),
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : '登录失败';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
