import { Injectable } from '@angular/core';

import { UserProfile } from '../models/platform.models';

const TOKEN_KEY = 'ml_token';
const USER_KEY = 'ml_user';

/**
 * 持有当前会话 token 与用户档案,并持久化到 localStorage。
 * - ApiClientService 读取 token 注入 Authorization 头(受保护接口的可信身份来源)。
 * - 持久化使刷新后仍保持登录态(顺带缓解"刷新掉登录")。
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private _token: string | null = null;
  private _user: UserProfile | null = null;

  constructor() {
    this.restore();
  }

  get token(): string | null {
    return this._token;
  }

  get user(): UserProfile | null {
    return this._user;
  }

  setSession(user: UserProfile): void {
    this._user = user;
    this._token = user.token;
    try {
      localStorage.setItem(TOKEN_KEY, user.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* localStorage 不可用时仅保留内存态 */
    }
  }

  clear(): void {
    this._user = null;
    this._token = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }

  private restore(): void {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const user = localStorage.getItem(USER_KEY);
      if (token) {
        this._token = token;
      }
      if (user) {
        this._user = JSON.parse(user) as UserProfile;
      }
    } catch {
      /* 解析失败时忽略,视为未登录 */
    }
  }
}
