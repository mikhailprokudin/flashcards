import { apiRequest } from '@/lib/api/client'

export { ApiError } from '@/lib/api/client'

export interface AuthUser {
  id: number
  email: string
  requireHandwritingInStudy: boolean
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export const authApi = {
  register(body: { email: string; password: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  login(body: { email: string; password: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  me(token: string): Promise<AuthUser> {
    return apiRequest<AuthUser>('/auth/me', { method: 'GET', token })
  },

  patchMe(
    token: string,
    body: { requireHandwritingInStudy: boolean },
  ): Promise<AuthUser> {
    return apiRequest<AuthUser>('/auth/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    })
  },
}
