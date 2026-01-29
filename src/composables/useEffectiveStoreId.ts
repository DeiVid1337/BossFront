import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/composables/useStoreContext'

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  return i > 0 ? i : null
}

/**
 * Resolve o storeId efetivo (fonte única) considerando:
 * - admin: store selector (`useStoreContext`)
 * - manager/seller: store_id do usuário autenticado
 * - fallback: storeId presente na rota
 *
 * Também oferece helper para sincronizar a URL quando o store efetivo diverge do storeId da rota.
 */
export function useEffectiveStoreId() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const storeContext = useStoreContext()

  const role = computed(() => authStore.user?.role)

  const routeStoreId = computed<number | null>(() => {
    return toPositiveInt(route.params.storeId)
  })

  const userStoreId = computed<number | null>(() => {
    const id = authStore.user?.store_id
    return typeof id === 'number' && id > 0 ? id : null
  })

  const effectiveStoreId = computed<number | null>(() => {
    if (role.value === 'admin') {
      return storeContext.storeId.value ?? routeStoreId.value
    }
    // manager/seller: sempre a loja do usuário (se existir)
    return userStoreId.value ?? routeStoreId.value
  })

  function syncUrlToStore(buildLocation: (storeId: number) => RouteLocationRaw) {
    const eff = effectiveStoreId.value
    const r = routeStoreId.value
    if (!eff || eff === r) return
    router.replace(buildLocation(eff))
  }

  return {
    role,
    routeStoreId,
    effectiveStoreId,
    syncUrlToStore,
  }
}

