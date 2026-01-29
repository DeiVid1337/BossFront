/**
 * Endpoints de Sales
 */

import { request } from '../client'
import type { CreateSaleRequest, PaginatedResponse, Sale, SalesListParams } from '../types'

/**
 * Listar vendas de uma loja
 * A API inclui customer e user automaticamente na resposta
 */
export function getSales(
  storeId: number,
  params?: SalesListParams
): Promise<PaginatedResponse<Sale>> {
  return request<PaginatedResponse<Sale>>(`/stores/${storeId}/sales`, {
    params,
  })
}

/**
 * Obter uma venda
 */
export function getSale(storeId: number, id: number): Promise<Sale> {
  return request<Sale>(`/stores/${storeId}/sales/${id}`)
}

/**
 * Criar venda
 */
export function createSale(storeId: number, data: CreateSaleRequest): Promise<Sale> {
  return request<Sale>(`/stores/${storeId}/sales`, {
    method: 'POST',
    body: data,
  })
}
