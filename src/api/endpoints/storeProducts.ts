/**
 * Endpoints de Store Products (Inventário)
 */

import { request } from '../client'
import type {
  CreateStoreProductRequest,
  PaginatedResponse,
  StoreProduct,
  StoreProductsListParams,
  UpdateStoreProductRequest,
  WithdrawInventoryRequest,
} from '../types'

/**
 * Listar produtos do inventário de uma loja
 */
export function getStoreProducts(
  storeId: number,
  params?: StoreProductsListParams
): Promise<PaginatedResponse<StoreProduct>> {
  return request<PaginatedResponse<StoreProduct>>(`/stores/${storeId}/products`, {
    params,
  })
}

/**
 * Obter um produto do inventário
 */
export function getStoreProduct(storeId: number, id: number): Promise<StoreProduct> {
  return request<StoreProduct>(`/stores/${storeId}/products/${id}`)
}

/**
 * Adicionar produto ao inventário
 */
export function createStoreProduct(
  storeId: number,
  data: CreateStoreProductRequest
): Promise<StoreProduct> {
  return request<StoreProduct>(`/stores/${storeId}/products`, {
    method: 'POST',
    body: data,
  })
}

/**
 * Atualizar produto do inventário
 */
export function updateStoreProduct(
  storeId: number,
  id: number,
  data: UpdateStoreProductRequest
): Promise<StoreProduct> {
  return request<StoreProduct>(`/stores/${storeId}/products/${id}`, {
    method: 'PUT',
    body: data,
  })
}

/**
 * Remover produto do inventário
 */
export function deleteStoreProduct(storeId: number, id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/stores/${storeId}/products/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Retirar produtos do estoque da loja para o inventário do vendedor
 */
export function withdrawInventory(
  storeId: number,
  data: WithdrawInventoryRequest
): Promise<{ message: string }> {
  return request<{ message: string }>(`/stores/${storeId}/inventory/withdraw`, {
    method: 'POST',
    body: data,
  })
}
