/**
 * Composable: gestão de inventário do vendedor (Admin/Manager)
 * - Carrega produtos da loja (com available_quantity) e inventário do vendedor
 * - Permite seleção em lote (adicionar/remover)
 * - Executa submit via endpoints dedicados
 *
 * Seguindo Frontend.md: views apenas orquestram; lógica fica aqui.
 */

import { computed, ref, isRef } from 'vue'
import { getStoreProducts } from '@/api/endpoints/storeProducts'
import { getUser } from '@/api/endpoints/users'
import { addSellerInventory, getSellerInventory, removeSellerInventory } from '@/api/endpoints/inventory'
import { useStockSync } from '@/composables/useStockSync'
import type {
  SellerInventoryItem,
  SellerInventoryTransferRequest,
  StoreProduct,
  User,
} from '@/api/types'
import { ValidationError } from '@/api/types'

export type InventoryAction = 'add' | 'remove'

export interface InventoryLine {
  storeProduct: StoreProduct
  /** disponível para ADD (da loja → vendedor) */
  availableToAdd: number
  /** disponível para REMOVE (do vendedor → loja) */
  availableToRemove: number
}

function clampInt(value: number, min: number, max: number): number {
  const v = Number.isFinite(value) ? Math.trunc(value) : 0
  return Math.max(min, Math.min(max, v))
}

function getProductLabel(storeProduct: StoreProduct): string {
  const p = storeProduct.product
  if (p) return `${p.brand} ${p.name}${p.flavor ? ` - ${p.flavor}` : ''}`
  return `Produto #${storeProduct.product_id}`
}

export function useSellerInventoryManagement(storeId: number | { value: number | null }, sellerId: number) {
  const storeIdRef = isRef(storeId) ? storeId : ref(storeId)
  const stockSync = useStockSync(storeIdRef)
  // Dados base
  const seller = ref<User | null>(null)
  const storeProducts = ref<StoreProduct[]>([])
  const sellerInventory = ref<SellerInventoryItem[]>([])

  // UI state
  const loading = ref(false)
  const loadingSeller = ref(false)
  const error = ref<string | null>(null)
  const success = ref<string | null>(null)

  // filtros
  const search = ref('')

  // seleção em lote
  const addSelection = ref<Map<number, number>>(new Map()) // store_product_id -> qty
  const removeSelection = ref<Map<number, number>>(new Map()) // store_product_id -> qty

  // erros por item (422)
  const addItemErrors = ref<Record<number, string[]>>({})
  const removeItemErrors = ref<Record<number, string[]>>({})

  // controles de confirmação
  const pendingAction = ref<InventoryAction | null>(null)
  const confirmOpen = ref(false)

  const storeProductsById = computed(() => {
    const map = new Map<number, StoreProduct>()
    storeProducts.value.forEach(sp => map.set(sp.id, sp))
    return map
  })

  const sellerQtyByStoreProductId = computed(() => {
    const map = new Map<number, number>()
    // Preferir seller_quantity vindo do endpoint de produtos (quando suportado)
    for (const sp of storeProducts.value) {
      if (typeof sp.seller_quantity === 'number') {
        map.set(sp.id, sp.seller_quantity || 0)
      }
    }
    // Fallback: usar GET inventory (quando disponível)
    if (map.size === 0) {
      for (const item of sellerInventory.value) {
        map.set(item.store_product_id, item.quantity || 0)
      }
    }
    return map
  })

  const lines = computed<InventoryLine[]>(() => {
    const qMap = sellerQtyByStoreProductId.value
    // Admin/Manager: manter a UI focada em itens ativos
    return storeProducts.value.filter(sp => sp.is_active).map(sp => {
      const availableToAdd = sp.available_quantity ?? 0
      const availableToRemove = qMap.get(sp.id) ?? 0
      return {
        storeProduct: sp,
        availableToAdd,
        availableToRemove,
      }
    })
  })

  const filteredLines = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return lines.value
    return lines.value.filter(l => getProductLabel(l.storeProduct).toLowerCase().includes(q))
  })

  const totalSellerUnits = computed(() => {
    return Array.from(sellerQtyByStoreProductId.value.values()).reduce((sum, n) => sum + (n || 0), 0)
  })

  const totalAvailableToAdd = computed(() => {
    return lines.value.reduce((sum, l) => sum + (l.availableToAdd || 0), 0)
  })

  /** Vendedor pertence à loja selecionada (store_id do vendedor === storeId). */
  const sellerBelongsToStore = computed(() => {
    const sid = storeIdRef.value
    const s = seller.value
    if (!sid || !s) return true
    return s.store_id === sid
  })

  /** Mensagem quando a loja selecionada não é a do vendedor (evita erro do backend). */
  const storeMismatchMessage = computed(() => {
    if (sellerBelongsToStore.value) return null
    const s = seller.value
    if (!s) return null
    return 'O vendedor selecionado deve pertencer à loja selecionada. Altere a loja no seletor acima ou volte e escolha um vendedor desta loja.'
  })

  function clearMessages() {
    error.value = null
    success.value = null
  }

  function clearSelections(action?: InventoryAction) {
    if (!action || action === 'add') addSelection.value.clear()
    if (!action || action === 'remove') removeSelection.value.clear()
  }

  function clearItemErrors(action?: InventoryAction) {
    if (!action || action === 'add') addItemErrors.value = {}
    if (!action || action === 'remove') removeItemErrors.value = {}
  }

  function setAddQuantity(storeProductId: number, qty: number) {
    clearMessages()
    clearItemErrors('add')
    const sp = storeProductsById.value.get(storeProductId)
    const max = sp?.available_quantity ?? 0
    const v = clampInt(qty, 0, max)
    if (v <= 0) addSelection.value.delete(storeProductId)
    else addSelection.value.set(storeProductId, v)
  }

  function setRemoveQuantity(storeProductId: number, qty: number) {
    clearMessages()
    clearItemErrors('remove')
    const max = sellerQtyByStoreProductId.value.get(storeProductId) ?? 0
    const v = clampInt(qty, 0, max)
    if (v <= 0) removeSelection.value.delete(storeProductId)
    else removeSelection.value.set(storeProductId, v)
  }

  function getAddQuantity(storeProductId: number): number {
    return addSelection.value.get(storeProductId) ?? 0
  }

  function getRemoveQuantity(storeProductId: number): number {
    return removeSelection.value.get(storeProductId) ?? 0
  }

  const addSummary = computed(() => {
    return Array.from(addSelection.value.entries())
      .map(([storeProductId, qty]) => {
        const sp = storeProductsById.value.get(storeProductId)
        return {
          storeProductId,
          qty,
          label: sp ? getProductLabel(sp) : `Produto #${storeProductId}`,
        }
      })
      .filter(x => x.qty > 0)
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  const removeSummary = computed(() => {
    return Array.from(removeSelection.value.entries())
      .map(([storeProductId, qty]) => {
        const sp = storeProductsById.value.get(storeProductId)
        return {
          storeProductId,
          qty,
          label: sp ? getProductLabel(sp) : `Produto #${storeProductId}`,
        }
      })
      .filter(x => x.qty > 0)
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  const canConfirmAdd = computed(() => sellerBelongsToStore.value && addSummary.value.length > 0)
  const canConfirmRemove = computed(() => sellerBelongsToStore.value && removeSummary.value.length > 0)

  function openConfirm(action: InventoryAction) {
    clearMessages()
    clearItemErrors(action)
    pendingAction.value = action
    confirmOpen.value = true
  }

  function closeConfirm() {
    confirmOpen.value = false
    pendingAction.value = null
  }

  async function loadAll(force = false) {
    if (loading.value && !force) return
    loading.value = true
    clearMessages()
    try {
      const sid = storeIdRef.value
      if (!sid || typeof sid !== 'number' || sid <= 0) {
        storeProducts.value = []
        sellerInventory.value = []
        error.value = 'Loja inválida'
        return
      }

      // Algumas APIs validam `per_page`/boolean com mais rigidez. Fazemos fallback seguro.
      const tryLoadProducts = async () => {
        try {
          // Backend atual não aceita seller_id como query em /products (gera 422),
          // então buscamos apenas os produtos da loja e combinamos com o inventário do vendedor.
          return await getStoreProducts(sid, { per_page: 100 })
        } catch (err) {
          if (err instanceof ValidationError) {
            // fallback para paginação menor
            return await getStoreProducts(sid, { per_page: 50 })
          }
          throw err
        }
      }

      const [productsResp, inventoryResp] = await Promise.all([
        tryLoadProducts(),
        getSellerInventory(sid, sellerId),
      ])

      // getStoreProducts retorna PaginatedResponse<StoreProduct>
      if (productsResp && typeof productsResp === 'object' && 'data' in productsResp) {
        storeProducts.value = Array.isArray(productsResp.data) ? productsResp.data : []
      } else {
        storeProducts.value = []
      }

      sellerInventory.value = Array.isArray(inventoryResp) ? inventoryResp : []
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados de inventário'
      error.value = (msg && (msg.includes('seller must belong') || msg.includes('must belong to this store')))
        ? 'O vendedor selecionado deve pertencer à loja selecionada. Altere a loja no seletor acima ou volte e escolha um vendedor desta loja.'
        : msg
      storeProducts.value = []
      sellerInventory.value = []
    } finally {
      loading.value = false
    }
  }

  async function loadSeller() {
    if (loadingSeller.value) return
    loadingSeller.value = true
    try {
      seller.value = await getUser(sellerId)
    } catch {
      seller.value = null
    } finally {
      loadingSeller.value = false
    }
  }

  function parseValidationErrorsToItemMap(
    err: ValidationError,
    action: InventoryAction
  ): Record<number, string[]> {
    // Esperado: items.0.quantity / items.0.store_product_id
    const out: Record<number, string[]> = {}
    const errors = err.validationErrors || err.errors || {}

    // fallback: se não conseguimos mapear por produto, anexar ao id 0
    const fallback: string[] = []

    // precisamos reconstruir store_product_id por índice, se vierem erros
    // como o backend pode só retornar quantity, vamos mapear pelo índice em nossa seleção
    const summary = action === 'add' ? addSummary.value : removeSummary.value

    Object.entries(errors).forEach(([field, messages]) => {
      const match = field.match(/^items\.(\d+)\./)
      const idx = match ? Number(match[1]) : null
      const msgList = Array.isArray(messages) ? messages : []

      if (idx === null || !Number.isFinite(idx)) {
        fallback.push(...msgList)
        return
      }

      const item = summary[idx]
      if (!item) {
        fallback.push(...msgList)
        return
      }

      out[item.storeProductId] = [...(out[item.storeProductId] || []), ...msgList]
    })

    if (fallback.length > 0) {
      out[0] = [...(out[0] || []), ...fallback]
    }

    return out
  }

  async function submitConfirmed() {
    const action = pendingAction.value
    if (!action) return

    clearMessages()
    clearItemErrors(action)

    const summary = action === 'add' ? addSummary.value : removeSummary.value
    if (summary.length === 0) {
      error.value = 'Selecione pelo menos um produto com quantidade.'
      return
    }

    const data: SellerInventoryTransferRequest = {
      items: summary.map(s => ({
        store_product_id: s.storeProductId,
        quantity: s.qty,
      })),
    }

    loading.value = true
    try {
      const sid = storeIdRef.value
      if (!sid || typeof sid !== 'number' || sid <= 0) {
        error.value = 'Loja inválida'
        return
      }
      if (action === 'add') {
        await addSellerInventory(sid, sellerId, data)
        success.value = 'Estoque do vendedor atualizado (itens adicionados).'
        clearSelections('add')
      } else {
        await removeSellerInventory(sid, sellerId, data)
        success.value = 'Estoque do vendedor atualizado (itens retirados).'
        clearSelections('remove')
      }

      stockSync.emitStockUpdated({ source: action === 'add' ? 'seller-inventory-add' : 'seller-inventory-remove' })
      closeConfirm()
      await loadAll()
    } catch (err) {
      if (err instanceof ValidationError) {
        const mapped = parseValidationErrorsToItemMap(err, action)
        if (action === 'add') addItemErrors.value = mapped
        else removeItemErrors.value = mapped

        const msgs = Object.values(err.validationErrors || err.errors || {}).flat()
        error.value = msgs.join('. ') || err.message || 'Erro de validação ao atualizar inventário'
      } else if (err instanceof Error) {
        const msg = err.message || ''
        error.value = msg.includes('seller must belong') || msg.includes('must belong to this store')
          ? 'O vendedor selecionado deve pertencer à loja selecionada. Altere a loja no seletor acima ou volte e escolha um vendedor desta loja.'
          : (msg || 'Erro ao atualizar inventário')
      } else {
        error.value = 'Erro desconhecido ao atualizar inventário'
      }
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    seller,
    storeProducts,
    sellerInventory,
    loading,
    loadingSeller,
    error,
    success,
    search,
    sellerBelongsToStore,
    storeMismatchMessage,

    // computed
    filteredLines,
    totalSellerUnits,
    totalAvailableToAdd,

    // seleção
    addSelection,
    removeSelection,
    getAddQuantity,
    getRemoveQuantity,
    setAddQuantity,
    setRemoveQuantity,
    clearSelections,

    // erros por item
    addItemErrors,
    removeItemErrors,
    clearItemErrors,

    // confirmação
    confirmOpen,
    pendingAction,
    addSummary,
    removeSummary,
    canConfirmAdd,
    canConfirmRemove,
    openConfirm,
    closeConfirm,
    submitConfirmed,

    // loaders
    loadAll,
    loadSeller,

    // helpers
    getProductLabel,
  }
}

