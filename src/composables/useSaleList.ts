/**
 * Composable para gerenciar lista de vendas
 * Seguindo Frontend.md: encapsula lógica reutilizável, sem template
 */

import { ref, computed, isRef } from 'vue'
import { getSales } from '@/api/endpoints/sales'
import type { Sale, PaginatedResponse, SalesListParams } from '@/api/types'
import { ValidationError } from '@/api/types'

export function useSaleList(storeId: number | { value: number | null }) {
  const storeIdRef = isRef(storeId) ? storeId : ref(storeId)
  // State
  const sales = ref<Sale[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filtros e busca
  const search = ref('')
  const from = ref<string>('')
  const to = ref<string>('')
  const sortBy = ref<'sale_date' | 'total_amount' | 'created_at'>('sale_date')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  // Paginação
  const currentPage = ref(1)
  const perPage = ref(15)
  const total = ref(0)
  const lastPage = ref(1)
  const meta = ref<PaginatedResponse<Sale>['meta'] | null>(null)
  const links = ref<PaginatedResponse<Sale>['links'] | undefined>(undefined)

  // Flag para evitar chamadas concorrentes
  let isLoading = false

  /**
   * Constrói parâmetros de query para a API
   */
  const params = computed<SalesListParams>(() => {
    const queryParams: SalesListParams = {
      page: currentPage.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    }

    if (search.value && typeof search.value === 'string' && search.value.trim()) {
      queryParams.search = search.value.trim()
    }

    if (from.value && typeof from.value === 'string' && from.value.trim()) {
      queryParams.from = from.value.trim()
    }

    if (to.value && typeof to.value === 'string' && to.value.trim()) {
      queryParams.to = to.value.trim()
    }

    return queryParams
  })

  /**
   * Carrega lista de vendas
   */
  async function loadSales(force = false) {
    const sid = storeIdRef.value
    if (!sid || typeof sid !== 'number' || sid <= 0) {
      sales.value = []
      meta.value = null
      links.value = undefined
      error.value = 'Loja inválida'
      return
    }
    // Evitar chamadas concorrentes, mas permitir forçar
    if (isLoading && !force) return

    isLoading = true
    loading.value = true
    error.value = null

    try {
      const response = await getSales(sid, params.value)

      // Verificar estrutura da resposta paginada
      if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
        const salesData = Array.isArray(response.data) ? response.data : []
        sales.value = salesData
        meta.value = response.meta
        links.value = response.links
        total.value = response.meta.total || 0
        lastPage.value = response.meta.last_page || 1
        currentPage.value = response.meta.current_page || 1
        error.value = null
      } else {
        error.value = 'Resposta da API em formato inesperado'
        sales.value = []
        meta.value = null
        links.value = undefined
      }
    } catch (err) {
      let errorMsg = 'Erro ao carregar vendas'

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
      sales.value = []
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
    await loadSales()
  }

  /**
   * Limpa todos os filtros e recarrega
   */
  function clearFilters() {
    search.value = ''
    from.value = ''
    to.value = ''
    sortBy.value = 'sale_date'
    sortOrder.value = 'desc'
    currentPage.value = 1
    loadSales(true)
  }

  /**
   * Muda para uma página específica
   */
  function setPage(page: number) {
    if (page >= 1 && page <= lastPage.value) {
      currentPage.value = page
      loadSales()
    }
  }

  /**
   * Muda ordenação
   */
  function setSort(field: 'sale_date' | 'total_amount' | 'created_at') {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = 'desc'
    }
    loadSales()
  }

  return {
    // State
    sales,
    loading,
    error,
    search,
    from,
    to,
    sortBy,
    sortOrder,
    currentPage,
    perPage,
    total,
    lastPage,
    meta,
    links,
    // Methods
    loadSales,
    applyFilters,
    clearFilters,
    setPage,
    setSort,
  }
}
