/**
 * Endpoints de Users
 */

import { request } from '../client'
import type {
  CreateUserRequest,
  PaginatedResponse,
  UpdateUserRequest,
  User,
  UsersListParams,
} from '../types'

/**
 * Listar usuários
 */
export function getUsers(params?: UsersListParams): Promise<PaginatedResponse<User>> {
  return request<PaginatedResponse<User>>('/users', {
    params,
  })
}

/**
 * Obter um usuário
 */
export function getUser(id: number): Promise<User> {
  return request<User>(`/users/${id}`)
}

/**
 * Criar usuário
 */
export function createUser(data: CreateUserRequest): Promise<User> {
  return request<User>('/users', {
    method: 'POST',
    body: data,
  })
}

/**
 * Atualizar usuário
 */
export function updateUser(id: number, data: UpdateUserRequest): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: 'PUT',
    body: data,
  })
}

/**
 * Deletar usuário
 */
export function deleteUser(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/users/${id}`, {
    method: 'DELETE',
  })
}
