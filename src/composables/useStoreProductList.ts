/**
 * Composable para gerenciar lista de produtos do inventário de uma loja
 * Seguindo Frontend.md: encapsula lógica reutilizável, sem template
 */

import { ref, computed, isRef } from 'vue'
import { getStoreProducts } from '@/api/endpoints/storeProducts'
import type { StoreProduct, PaginatedResponse, StoreProductsListParams } from '@/api/types'
import { ValidationError } from '@/api/types'

export function useStoreProductList(storeId: number | { value: number | null }) {
  const storeIdRef = isRef(storeId) ? storeId : ref(storeId)
  // State
  const storeProducts = ref<StoreProduct[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filtros e busca
  const search = ref('')
  const isActive = ref<boolean | undefined>(undefined)
  const lowStock = ref<boolean | undefined>(undefined)
  const sortBy = ref<'stock_quantity' | 'sale_price' | 'created_at' | 'product_name'>(
    'product_name'
  )
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // Paginação
  const currentPage = ref(1)
  const perPage = ref(15)
  const total = ref(0)
  const lastPage = ref(1)
  const meta = ref<PaginatedResponse<StoreProduct>['meta'] | null>(null)
  const links = ref<PaginatedResponse<StoreProduct>['links'] | undefined>(undefined)

  // Flag para evitar chamadas concorrentes
  let isLoading = false

  /**
   * Constrói parâmetros de query para a API
   */
  const params = computed<StoreProductsListParams>(() => {
    const queryParams: StoreProductsListParams = {
      page: currentPage.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    }

    if (search.value && typeof search.value === 'string' && search.value.trim()) {
      queryParams.search = search.value.trim()
    }

    // Só incluir is_active se for boolean explícito
    if (isActive.value === true || isActive.value === false) {
      queryParams.is_active = isActive.value
    }

    // Só incluir low_stock se for boolean explícito
    if (lowStock.value === true || lowStock.value === false) {
      queryParams.low_stock = lowStock.value
    }

    return queryParams
  })

  /**
   * Carrega lista de produtos do inventário
   */
  async function loadStoreProducts(force = false) {
    const sid = storeIdRef.value
    if (!sid || typeof sid !== 'number' || sid <= 0) {
      storeProducts.value = []
      meta.value = null
      links.value = undefined
      error.value = 'Loja inválida'
      return
    }
    // Evitar chamadas concorrentes, mas permitir forçar
    if (isLoading && !force) {
      return
    }

    isLoading = true
    loading.value = true
    error.value = null

    try {
      const response = await getStoreProducts(sid, params.value)

      // Verificar estrutura da resposta paginada
      if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
        storeProducts.value = Array.isArray(response.data) ? response.data : []
        meta.value = response.meta
        links.value = response.links
        total.value = response.meta.total || 0
        lastPage.value = response.meta.last_page || 1
        currentPage.value = response.meta.current_page || 1
        error.value = null
      } else {
        error.value = 'Resposta da API em formato inesperado'
        storeProducts.value = []
        meta.value = null
        links.value = undefined
      }
    } catch (err) {
      let errorMsg = 'Erro ao carregar inventário'

      if (err instanceof ValidationError) {
        errorMsg = err.message || errorMsg
        if (err.validationErrors) {
          const errorMessages = Object.values(err.validationErrors)
            .flat()
            .filter((msg): msg is string => typeof msg === 'string')
          if (errorMessages.length > 0) {
            errorMsg = errorMessages.join(', ')
          }
        }
      } else if (err instanceof Error) {
        errorMsg = err.message || errorMsg
      }

      error.value = errorMsg
      storeProducts.value = []
      meta.value = null
      links.value = undefined
    } finally {
      loading.value = false
      isLoading = false
    }
  }

  /**
   * Aplica filtros e recarrega (reseta para página 1)
   */
  async function applyFilters() {
    currentPage.value = 1
    await loadStoreProducts()
  }

  /**
   * Limpa todos os filtros e recarrega
   */
  function clearFilters() {
    search.value = ''
    isActive.value = undefined
    lowStock.value = undefined
    sortBy.value = 'product_name'
    sortOrder.value = 'asc'
    currentPage.value = 1
    loadStoreProducts()
  }

  /**
   * Muda para uma página específica
   */
  function setPage(page: number) {
    if (page >= 1 && page <= lastPage.value) {
      currentPage.value = page
      loadStoreProducts()
    }
  }

  /**
   * Muda ordenação
   */
  function setSort(field: 'stock_quantity' | 'sale_price' | 'created_at' | 'product_name') {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = 'asc'
    }
    loadStoreProducts()
  }

  /**
   * Verifica se um produto está com estoque baixo
   */
  function isLowStock(storeProduct: StoreProduct): boolean {
    const stock = storeProduct.stock_quantity || 0
    const minLevel = storeProduct.min_stock_level || 0
    return stock <= minLevel
  }

  return {
    // State
    storeProducts,
    loading,
    error,
    search,
    isActive,
    lowStock,
    sortBy,
    sortOrder,
    currentPage,
    perPage,
    total,
    lastPage,
    meta,
    links,
    // Methods
    loadStoreProducts,
    applyFilters,
    clearFilters,
    setPage,
    setSort,
    isLowStock,
  }
}
