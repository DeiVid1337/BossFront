/**
 * Composable para gerenciar carrinho de compras (POS)
 * Seguindo Frontend.md: encapsula lógica reutilizável, sem template
 */

import { ref, computed } from 'vue'
import type { StoreProduct } from '@/api/types'

export interface CartItem {
  storeProduct: StoreProduct
  quantity: number
}

export function useCart() {
  const items = ref<CartItem[]>([])

  /**
   * Adiciona ou atualiza item no carrinho
   */
  function addItem(storeProduct: StoreProduct, quantity: number) {
    const existingIndex = items.value.findIndex(item => item.storeProduct.id === storeProduct.id)

    if (existingIndex >= 0) {
      // Atualizar quantidade existente
      const existingItem = items.value[existingIndex]
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity <= storeProduct.stock_quantity) {
          existingItem.quantity = newQuantity
        }
      }
    } else {
      // Adicionar novo item
      if (quantity <= storeProduct.stock_quantity) {
        items.value.push({ storeProduct, quantity })
      }
    }
  }

  /**
   * Remove item do carrinho
   */
  function removeItem(storeProductId: number) {
    const index = items.value.findIndex(item => item.storeProduct.id === storeProductId)
    if (index >= 0) {
      items.value.splice(index, 1)
    }
  }

  /**
   * Atualiza quantidade de um item
   */
  function updateQuantity(storeProductId: number, quantity: number) {
    const item = items.value.find(item => item.storeProduct.id === storeProductId)
    if (item) {
      if (quantity <= 0) {
        removeItem(storeProductId)
      } else if (quantity <= item.storeProduct.stock_quantity) {
        item.quantity = quantity
      }
    }
  }

  /**
   * Limpa o carrinho
   */
  function clear() {
    items.value = []
  }

  /**
   * Remove itens inválidos do carrinho
   */
  function removeInvalidItems(validStoreProductIds: number[]) {
    const initialLength = items.value.length
    items.value = items.value.filter(item => 
      validStoreProductIds.includes(item.storeProduct.id)
    )
    return initialLength - items.value.length
  }

  /**
   * Calcula subtotal de um item
   */
  function getItemSubtotal(item: CartItem): number {
    return parseFloat(item.storeProduct.sale_price) * item.quantity
  }

  /**
   * Calcula total do carrinho
   */
  const total = computed(() => {
    return items.value.reduce((sum, item) => {
      return sum + parseFloat(item.storeProduct.sale_price) * item.quantity
    }, 0)
  })

  /**
   * Verifica se o carrinho está vazio
   */
  const isEmpty = computed(() => items.value.length === 0)

  /**
   * Valida se todas as quantidades são válidas
   */
  const isValid = computed(() => {
    return items.value.every(
      item => item.quantity > 0 && item.quantity <= item.storeProduct.stock_quantity
    )
  })

  return {
    items,
    total,
    isEmpty,
    isValid,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    removeInvalidItems,
    getItemSubtotal,
  }
}
