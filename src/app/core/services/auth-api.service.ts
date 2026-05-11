import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { LoginRequest, UserProfile } from '../models/platform.models';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly apiClient = inject(ApiClientService);

  login(payload: LoginRequest): Observable<UserProfile> {
    return this.apiClient.post<UserProfile>('/auth/login', payload);
  }
}
