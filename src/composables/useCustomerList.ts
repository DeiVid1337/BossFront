/**
 * Composable para gerenciar lista de clientes
 * Seguindo Frontend.md: encapsula lógica reutilizável, sem template
 */

import { ref, computed } from 'vue'
import { getCustomers } from '@/api/endpoints/customers'
import type { Customer, PaginatedResponse, CustomersListParams } from '@/api/types'
import { ValidationError } from '@/api/types'

export function useCustomerList() {
  // State
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filtros e busca
  const search = ref('')
  const phone = ref('')
  const sortBy = ref<'name' | 'phone' | 'total_purchases' | 'created_at'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // Paginação
  const currentPage = ref(1)
  const perPage = ref(15)
  const total = ref(0)
  const lastPage = ref(1)
  const meta = ref<PaginatedResponse<Customer>['meta'] | null>(null)
  const links = ref<PaginatedResponse<Customer>['links'] | undefined>(undefined)

  // Flag para evitar chamadas concorrentes
  let isLoading = false

  /**
   * Constrói parâmetros de query para a API
   */
  const params = computed<CustomersListParams>(() => {
    const queryParams: CustomersListParams = {
      page: currentPage.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    }

    if (search.value && typeof search.value === 'string' && search.value.trim()) {
      queryParams.search = search.value.trim()
    }

    if (phone.value && typeof phone.value === 'string' && phone.value.trim()) {
      queryParams.phone = phone.value.trim()
    }

    return queryParams
  })

  /**
   * Carrega lista de clientes
   */
  async function loadCustomers() {
    // Evitar chamadas concorrentes
    if (isLoading) {
      return
    }

    isLoading = true
    loading.value = true
    error.value = null

    try {
      const response = await getCustomers(params.value)

      // Verificar estrutura da resposta paginada
      if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
        customers.value = Array.isArray(response.data) ? response.data : []
        meta.value = response.meta
        links.value = response.links
        total.value = response.meta.total || 0
        lastPage.value = response.meta.last_page || 1
        currentPage.value = response.meta.current_page || 1
        error.value = null
      } else {
        error.value = 'Resposta da API em formato inesperado'
        customers.value = []
        meta.value = null
        links.value = undefined
      }
    } catch (err) {
      let errorMsg = 'Erro ao carregar clientes'

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
      customers.value = []
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
    await loadCustomers()
  }

  /**
   * Limpa todos os filtros e recarrega
   */
  function clearFilters() {
    search.value = ''
    phone.value = ''
    sortBy.value = 'name'
    sortOrder.value = 'asc'
    currentPage.value = 1
    loadCustomers()
  }

  /**
   * Muda para uma página específica
   */
  function setPage(page: number) {
    if (page >= 1 && page <= lastPage.value) {
      currentPage.value = page
      loadCustomers()
    }
  }

  /**
   * Muda ordenação
   */
  function setSort(field: 'name' | 'phone' | 'total_purchases' | 'created_at') {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = 'asc'
    }
    loadCustomers()
  }

  return {
    // State
    customers,
    loading,
    error,
    search,
    phone,
    sortBy,
    sortOrder,
    currentPage,
    perPage,
    total,
    lastPage,
    meta,
    links,
    // Methods
    loadCustomers,
    applyFilters,
    clearFilters,
    setPage,
    setSort,
  }
}
