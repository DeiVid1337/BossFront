/**
 * Endpoints de autenticação
 */

import { request } from '../client'
import type { LoginRequest, LoginResponse, User } from '../types'

/**
 * Login
 */
export function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: data,
    requiresAuth: false,
  })
}

/**
 * Logout
 */
export function logout(): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/logout', {
    method: 'POST',
  })
}

/**
 * Obter usuário atual
 */
export function me(): Promise<User> {
  return request<User>('/auth/me')
}
