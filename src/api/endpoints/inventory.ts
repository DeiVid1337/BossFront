/**
 * Endpoints de Inventory (Seller Inventory / Movimentações)
 */

import { request } from '../client'
import { normalizeArrayResponse } from '../normalize'
import type {
  InventoryUpdateResponse,
  SellerInventoryItem,
  SellerInventoryTransferRequest,
} from '../types'

/**
 * Ver inventário do vendedor
 * GET /api/v1/users/{userId}/inventory
 */
export async function getUserInventory(userId: number): Promise<SellerInventoryItem[]> {
  const resp = await request<unknown>(`/users/${userId}/inventory`)
  return normalizeArrayResponse<SellerInventoryItem>(resp)
}

/**
 * Admin/Manager: obter inventário do vendedor (tolerante a diferenças do backend)
 *
 * Preferência (baseada em Docs/aa.md):
 * 1) GET /users/{sellerId}/inventory
 * 2) GET /stores/{storeId}/inventory?seller_id={sellerId} (fallback, se existir)
 */
export async function getSellerInventory(storeId: number, sellerId: number): Promise<SellerInventoryItem[]> {
  try {
    const resp = await request<unknown>(`/users/${sellerId}/inventory`)
    const items = normalizeArrayResponse<SellerInventoryItem>(resp)
    if (items.length > 0) return items
  } catch {
    // ignorar e tentar fallback legado
  }

  try {
    const resp = await request<unknown>(`/stores/${storeId}/inventory`, {
      params: { seller_id: sellerId },
    })
    return normalizeArrayResponse<SellerInventoryItem>(resp)
  } catch {
    return []
  }
}

/**
 * Admin/Manager: adicionar ao estoque do vendedor (loja → vendedor).
 * Usa o mesmo endpoint de withdraw, enviando seller_id no body para o backend
 * creditar o inventário do vendedor indicado (Docs/aa.md, Docs/api.md).
 * POST /api/v1/stores/{storeId}/inventory/withdraw
 */
export function addSellerInventory(
  storeId: number,
  sellerId: number,
  data: SellerInventoryTransferRequest
): Promise<InventoryUpdateResponse> {
  return request<InventoryUpdateResponse>(`/stores/${storeId}/inventory/withdraw`, {
    method: 'POST',
    body: { seller_id: sellerId, items: data.items },
  })
}

/**
 * Admin/Manager: retirar do estoque do vendedor (vendedor → loja).
 * POST /api/v1/stores/{storeId}/inventory/return
 * Body: { seller_id, items } — o backend decrementa seller_inventory e devolve à loja.
 */
export function removeSellerInventory(
  storeId: number,
  sellerId: number,
  data: SellerInventoryTransferRequest
): Promise<InventoryUpdateResponse> {
  return request<InventoryUpdateResponse>(`/stores/${storeId}/inventory/return`, {
    method: 'POST',
    body: { seller_id: sellerId, items: data.items },
  })
}

