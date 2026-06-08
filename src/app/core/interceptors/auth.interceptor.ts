import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthSessionService } from '../services/auth-session.service';

/** 登录端点不需要令牌，避免循环依赖（无 token 时也能登录）。 */
const PUBLIC_PATHS = ['/api/auth/login'];

/**
 * 给受保护的 /api 请求附加 Authorization 头，并对 401 统一处理：
 * 清空本地会话，使视图回到未登录态。约束（公开路径、注入位置）写在代码里。
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);

  const isApi = req.url.startsWith('/api');
  const isPublic = PUBLIC_PATHS.some((path) => req.url.startsWith(path));
  const token = session.token();

  // 未登录时不向受保护端点附带空令牌；让请求自然收到 401 由调用方处理。
  const authReq = isApi && !isPublic && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublic) {
        // 令牌非法/过期是大半径失败：立刻清理会话，不静默重试。
        session.clear();
      }
      return throwError(() => error);
    })
  );
};
