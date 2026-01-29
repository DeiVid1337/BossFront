/**
 * Composable para gerenciar vendas do seller
 * Inclui estatísticas e funcionalidades específicas para vendedores
 * Seguindo Frontend.md: encapsula lógica reutilizável, sem template
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { getSales } from '@/api/endpoints/sales'
import type { Sale, PaginatedResponse, SalesListParams } from '@/api/types'

export function useSellerSales(storeId: number | Ref<number> | ComputedRef<number>) {
  // Normalizar storeId para ref
  const storeIdRef = typeof storeId === 'number' ? ref(storeId) : storeId
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

  // Estatísticas
  const statsLoading = ref(false)
  const todaySales = ref<Sale[]>([])
  const monthSales = ref<Sale[]>([])

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
  async function loadSales() {
    if (isLoading) {
      return
    }

    isLoading = true
    loading.value = true
    error.value = null

    try {
      // Obter storeId atual (pode ser ref, computed ou number)
      let currentStoreId: number
      if (typeof storeIdRef === 'object' && 'value' in storeIdRef) {
        currentStoreId = storeIdRef.value
      } else if (typeof storeIdRef === 'number') {
        currentStoreId = storeIdRef
      } else {
        error.value = 'Loja não selecionada'
        return
      }

      if (!currentStoreId || currentStoreId === 0) {
        error.value = 'Loja não selecionada'
        return
      }
      
      const response = await getSales(currentStoreId, params.value)

      if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
        sales.value = Array.isArray(response.data) ? response.data : []
        total.value = response.meta.total || 0
        lastPage.value = response.meta.last_page || 1
        currentPage.value = response.meta.current_page || 1
      } else {
        error.value = 'Resposta da API em formato inesperado'
        sales.value = []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao carregar vendas'
      sales.value = []
    } finally {
      loading.value = false
      isLoading = false
    }
  }

  /**
   * Carrega estatísticas (vendas do dia e do mês)
   */
  async function loadStats() {
    statsLoading.value = true

    try {
      // Obter storeId atual
      let currentStoreId: number
      if (typeof storeIdRef === 'object' && 'value' in storeIdRef) {
        currentStoreId = storeIdRef.value
      } else if (typeof storeIdRef === 'number') {
        currentStoreId = storeIdRef
      } else {
        statsLoading.value = false
        return
      }

      if (!currentStoreId || currentStoreId === 0) {
        statsLoading.value = false
        return
      }

      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const todayStr = today.toISOString().split('T')[0]
      const monthStartStr = firstDayOfMonth.toISOString().split('T')[0]

      // Carregar vendas de hoje
      const todayResponse = await getSales(currentStoreId, {
        from: todayStr,
        to: todayStr,
        per_page: 100,
        sort_by: 'sale_date',
        sort_order: 'desc',
      })

      if (todayResponse && typeof todayResponse === 'object' && 'data' in todayResponse) {
        todaySales.value = Array.isArray(todayResponse.data) ? todayResponse.data : []
      }

      // Carregar vendas do mês
      const monthResponse = await getSales(currentStoreId, {
        from: monthStartStr,
        to: todayStr,
        per_page: 100,
        sort_by: 'sale_date',
        sort_order: 'desc',
      })

      if (monthResponse && typeof monthResponse === 'object' && 'data' in monthResponse) {
        monthSales.value = Array.isArray(monthResponse.data) ? monthResponse.data : []
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * Estatísticas computadas
   */
  const todayCount = computed(() => todaySales.value.length)
  const todayRevenue = computed(() => {
    return todaySales.value.reduce((sum, sale) => {
      return sum + parseFloat(sale.total_amount)
    }, 0)
  })

  const monthCount = computed(() => monthSales.value.length)
  const monthRevenue = computed(() => {
    return monthSales.value.reduce((sum, sale) => {
      return sum + parseFloat(sale.total_amount)
    }, 0)
  })

  const totalRevenue = computed(() => {
    return sales.value.reduce((sum, sale) => {
      return sum + parseFloat(sale.total_amount)
    }, 0)
  })

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
    loadSales()
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
    // Statistics
    statsLoading,
    todaySales,
    monthSales,
    todayCount,
    todayRevenue,
    monthCount,
    monthRevenue,
    totalRevenue,
    // Methods
    loadSales,
    loadStats,
    applyFilters,
    clearFilters,
    setPage,
    setSort,
  }
}
