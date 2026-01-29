/**
 * Composable para gerenciar o contexto de loja atual
 * Admin pode selecionar loja; Manager/Seller usa sua loja atribuída
 */

import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getStores } from '@/api/endpoints/stores'
import type { Store } from '@/api/types'

const currentStoreId = ref<number | null>(null)
const stores = ref<Store[]>([])
const loading = ref(false)

/**
 * Composable para gerenciar contexto de loja
 */
export function useStoreContext() {
  const authStore = useAuthStore()

  // Store ID atual: Admin pode selecionar, Manager/Seller usa sua loja
  const storeId = computed(() => {
    if (authStore.user?.role === 'admin') {
      const id = currentStoreId.value
      return typeof id === 'number' ? id : null
    }
    const id = authStore.user?.store_id
    return typeof id === 'number' ? id : null
  })

  // Se é Admin, pode alterar; caso contrário, é read-only
  const canChangeStore = computed(() => authStore.user?.role === 'admin')

  // Opções de lojas para Admin
  const storeOptions = computed(() => stores.value)

  // Nome da loja atual
  const currentStoreName = computed(() => {
    if (!storeId.value) return null
    const store = stores.value.find(s => s.id === storeId.value)
    return store?.name ?? null
  })

  /**
   * Define a loja atual (apenas Admin)
   */
  function setCurrentStoreId(id: number | null) {
    if (!canChangeStore.value) return
    currentStoreId.value = id
    // Persistir no localStorage para Admin
    if (id) {
      localStorage.setItem('currentStoreId', String(id))
    } else {
      localStorage.removeItem('currentStoreId')
    }
  }

  /**
   * Carrega lojas (apenas Admin precisa)
   */
  async function loadStores() {
    if (authStore.user?.role !== 'admin') {
      stores.value = []
      return
    }

    loading.value = true
    try {
      // Não enviar is_active se não for necessário - deixar o backend retornar todas
      const response = await getStores({ per_page: 100 })
      stores.value = response.data
    } catch (error) {
      console.error('Erro ao carregar lojas:', error)
      stores.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Inicializa o contexto de loja
   */
  function initialize() {
    if (authStore.user?.role === 'admin') {
      // Admin: carregar lojas e restaurar seleção do localStorage
      loadStores()
      const savedStoreId = localStorage.getItem('currentStoreId')
      if (savedStoreId) {
        currentStoreId.value = Number(savedStoreId)
      }
    } else {
      // Manager/Seller: usar store_id do usuário
      currentStoreId.value = authStore.user?.store_id ?? null
      stores.value = []
    }
  }

  // Observar mudanças no usuário
  watch(
    () => authStore.user,
    () => {
      initialize()
    },
    { immediate: true }
  )

  return {
    storeId,
    currentStoreId: storeId,
    canChangeStore,
    storeOptions,
    currentStoreName,
    stores,
    loading,
    setCurrentStoreId,
    loadStores,
    initialize,
  }
}
