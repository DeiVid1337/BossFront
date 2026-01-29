/**
 * Endpoints de Stores
 */

import { request } from '../client'
import type {
  CreateStoreRequest,
  PaginatedResponse,
  Store,
  StoresListParams,
  UpdateStoreRequest,
} from '../types'

/**
 * Listar lojas
 */
export function getStores(params?: StoresListParams): Promise<PaginatedResponse<Store>> {
  return request<PaginatedResponse<Store>>('/stores', {
    params,
  })
}

/**
 * Obter uma loja
 */
export function getStore(id: number): Promise<Store> {
  return request<Store>(`/stores/${id}`)
}

/**
 * Criar loja
 */
export function createStore(data: CreateStoreRequest): Promise<Store> {
  return request<Store>('/stores', {
    method: 'POST',
    body: data,
  })
}

/**
 * Atualizar loja
 */
export function updateStore(id: number, data: UpdateStoreRequest): Promise<Store> {
  return request<Store>(`/stores/${id}`, {
    method: 'PUT',
    body: data,
  })
}

/**
 * Deletar loja
 */
export function deleteStore(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/stores/${id}`, {
    method: 'DELETE',
  })
}
