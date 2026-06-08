import { Injectable, computed, signal } from '@angular/core';

import { UserProfile } from '../models/platform.models';

const TOKEN_KEY = 'mlp.auth.token';
const PROFILE_KEY = 'mlp.auth.profile';

/**
 * 登录态单一事实来源：令牌与用户档案同时保存在内存信号与 localStorage。
 * 内存信号驱动视图（条件渲染），localStorage 负责刷新后恢复会话。
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly profileSignal = signal<UserProfile | null>(this.readProfile());

  /** 当前令牌，供 HTTP 拦截器读取。null 表示未登录。 */
  readonly token = this.tokenSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

  /** 登录成功后写入会话；token 为空视为非法登录结果，直接清理。 */
  setSession(profile: UserProfile): void {
    if (!profile.token) {
      this.clear();
      return;
    }
    this.tokenSignal.set(profile.token);
    this.profileSignal.set(profile);
    this.persist(TOKEN_KEY, profile.token);
    this.persist(PROFILE_KEY, JSON.stringify(profile));
  }

  /** 登出或令牌失效（401）时清空内存与持久化。 */
  clear(): void {
    this.tokenSignal.set(null);
    this.profileSignal.set(null);
    this.remove(TOKEN_KEY);
    this.remove(PROFILE_KEY);
  }

  private readToken(): string | null {
    return this.safeStorage()?.getItem(TOKEN_KEY) ?? null;
  }

  private readProfile(): UserProfile | null {
    const raw = this.safeStorage()?.getItem(PROFILE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  private persist(key: string, value: string): void {
    this.safeStorage()?.setItem(key, value);
  }

  private remove(key: string): void {
    this.safeStorage()?.removeItem(key);
  }

  /** SSR / 隐私模式下 localStorage 可能不可用，降级为纯内存态。 */
  private safeStorage(): Storage | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return null;
    }
  }
}
