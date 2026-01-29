/**
 * Composable para gerenciar lista de stores com filtros, busca e paginação
 */

import { ref, computed } from 'vue'
import { getStores } from '@/api/endpoints/stores'
import type { Store, PaginatedResponse, StoresListParams } from '@/api/types'
import { ValidationError } from '@/api/types'

export function useStoreList() {
  const stores = ref<Store[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Flag para evitar chamadas concorrentes
  let isLoading = false

  // Filtros e busca
  const search = ref('')
  const isActive = ref<boolean | undefined>(undefined)
  const sortBy = ref<'name' | 'is_active' | 'created_at'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // Paginação
  const currentPage = ref(1)
  const perPage = ref(15)
  const total = ref(0)
  const lastPage = ref(1)
  const meta = ref<PaginatedResponse<Store>['meta'] | null>(null)
  const links = ref<PaginatedResponse<Store>['links'] | undefined>(undefined)

  /**
   * Constrói parâmetros de query
   */
  const params = computed<StoresListParams>(() => {
    const queryParams: StoresListParams = {
      page: currentPage.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    }

    if (search.value && typeof search.value === 'string' && search.value.trim()) {
      queryParams.search = search.value.trim()
    }

    // Só incluir is_active se for boolean explícito (true ou false)
    // Não enviar se for undefined
    if (isActive.value === true || isActive.value === false) {
      queryParams.is_active = isActive.value
    }

    return queryParams
  })

  /**
   * Carrega lista de stores
   */
  async function loadStores() {
    // Evitar chamadas concorrentes
    if (isLoading) {
      console.warn('loadStores já está em execução, ignorando chamada duplicada')
      return
    }

    isLoading = true
    loading.value = true
    error.value = null

    try {
      // Log dos parâmetros sendo enviados (apenas em desenvolvimento)
      if (import.meta.env.DEV) {
        console.log('Carregando stores com parâmetros:', params.value)
      }

      const response = await getStores(params.value)

      // Verificar se a resposta tem a estrutura esperada
      if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
        stores.value = response.data || []
        meta.value = response.meta
        links.value = response.links
        total.value = response.meta.total || 0
        lastPage.value = response.meta.last_page || 1
        currentPage.value = response.meta.current_page || 1
        // Limpar erro se a requisição foi bem-sucedida
        error.value = null
      } else {
        // Fallback: se a resposta não tem meta, tratar como erro
        const errorMsg = 'Resposta da API em formato inesperado'
        error.value = errorMsg
        console.error(errorMsg, response)
        stores.value = []
        meta.value = null
        links.value = undefined
      }
    } catch (err) {
      // Extrair mensagem de erro de forma mais robusta
      let errorMsg = 'Erro ao carregar lojas'

      if (err instanceof ValidationError) {
        // Se for ValidationError, tentar extrair mensagens mais detalhadas
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
      } else if (typeof err === 'string') {
        errorMsg = err
      }

      error.value = errorMsg
      console.error('Erro ao carregar lojas:', err)
      stores.value = []
      meta.value = null
      links.value = undefined
    } finally {
      // Garantir que loading sempre seja resetado
      loading.value = false
      isLoading = false
    }
  }

  /**
   * Aplica filtros e recarrega
   */
  async function applyFilters() {
    // Resetar para página 1 antes de carregar
    currentPage.value = 1
    await loadStores()
  }

  /**
   * Limpa filtros
   */
  function clearFilters() {
    search.value = ''
    isActive.value = undefined
    sortBy.value = 'name'
    sortOrder.value = 'asc'
    currentPage.value = 1
    loadStores()
  }

  /**
   * Muda página
   */
  function setPage(page: number) {
    if (page >= 1 && page <= lastPage.value) {
      currentPage.value = page
      loadStores()
    }
  }

  /**
   * Muda ordenação
   */
  function setSort(field: 'name' | 'is_active' | 'created_at') {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = 'asc'
    }
    loadStores()
  }

  return {
    // State
    stores,
    loading,
    error,
    search,
    isActive,
    sortBy,
    sortOrder,
    currentPage,
    perPage,
    total,
    lastPage,
    meta,
    links,
    // Methods
    loadStores,
    applyFilters,
    clearFilters,
    setPage,
    setSort,
  }
}
