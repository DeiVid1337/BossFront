/**
 * Composable para gerenciar lista de usuários
 * Seguindo Frontend.md: encapsula lógica reutilizável, sem template
 */

import { ref, computed } from 'vue'
import { getUsers } from '@/api/endpoints/users'
import type { User, PaginatedResponse, UsersListParams } from '@/api/types'
import { ValidationError } from '@/api/types'

export function useUserList() {
  // State
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filtros e busca
  const search = ref('')
  const role = ref<'admin' | 'manager' | 'seller' | undefined>(undefined)
  const storeId = ref<number | undefined>(undefined)
  const isActive = ref<boolean | undefined>(undefined)
  const sortBy = ref<'name' | 'email' | 'role' | 'created_at'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // Paginação
  const currentPage = ref(1)
  const perPage = ref(15)
  const total = ref(0)
  const lastPage = ref(1)
  const meta = ref<PaginatedResponse<User>['meta'] | null>(null)
  const links = ref<PaginatedResponse<User>['links'] | undefined>(undefined)

  // Flag para evitar chamadas concorrentes
  let isLoading = false

  /**
   * Constrói parâmetros de query para a API
   */
  const params = computed<UsersListParams>(() => {
    const queryParams: UsersListParams = {
      page: currentPage.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    }

    if (search.value && typeof search.value === 'string' && search.value.trim()) {
      queryParams.search = search.value.trim()
    }

    if (role.value) {
      queryParams.role = role.value
    }

    if (storeId.value) {
      queryParams.store_id = storeId.value
    }

    // Só incluir is_active se for boolean explícito
    if (isActive.value === true || isActive.value === false) {
      queryParams.is_active = isActive.value
    }

    return queryParams
  })

  /**
   * Carrega lista de usuários
   */
  async function loadUsers() {
    // Evitar chamadas concorrentes
    if (isLoading) {
      return
    }

    isLoading = true
    loading.value = true
    error.value = null

    try {
      const response = await getUsers(params.value)

      // Verificar estrutura da resposta paginada
      if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
        users.value = Array.isArray(response.data) ? response.data : []
        meta.value = response.meta
        links.value = response.links
        total.value = response.meta.total || 0
        lastPage.value = response.meta.last_page || 1
        currentPage.value = response.meta.current_page || 1
        error.value = null
      } else {
        error.value = 'Resposta da API em formato inesperado'
        users.value = []
        meta.value = null
        links.value = undefined
      }
    } catch (err) {
      let errorMsg = 'Erro ao carregar usuários'

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
      users.value = []
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
    await loadUsers()
  }

  /**
   * Limpa todos os filtros e recarrega
   */
  function clearFilters() {
    search.value = ''
    role.value = undefined
    storeId.value = undefined
    isActive.value = undefined
    sortBy.value = 'name'
    sortOrder.value = 'asc'
    currentPage.value = 1
    loadUsers()
  }

  /**
   * Muda para uma página específica
   */
  function setPage(page: number) {
    if (page >= 1 && page <= lastPage.value) {
      currentPage.value = page
      loadUsers()
    }
  }

  /**
   * Muda ordenação
   */
  function setSort(field: 'name' | 'email' | 'role' | 'created_at') {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = 'asc'
    }
    loadUsers()
  }

  return {
    // State
    users,
    loading,
    error,
    search,
    role,
    storeId,
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
    loadUsers,
    applyFilters,
    clearFilters,
    setPage,
    setSort,
  }
}
