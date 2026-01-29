import { computed, isRef, ref, type ComputedRef, type Ref } from 'vue'

export type StockUpdateMeta = {
  source?: string
  saleId?: number
}

export type StockUpdateEvent = {
  storeId: number
  timestamp: number
  source?: string
  saleId?: number
}

const STORAGE_KEY = 'last-stock-update'
const EVENT_NAME = 'stock-updated'
const TTL_MS = 5 * 60 * 1000

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeStoreId(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  return i > 0 ? i : null
}

function readPendingRaw(): StockUpdateEvent | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const obj = safeParseJson(raw)
  if (!obj || typeof obj !== 'object') return null
  const rec = obj as Record<string, unknown>
  const storeId = normalizeStoreId(rec.storeId)
  const timestamp = typeof rec.timestamp === 'number' ? rec.timestamp : null
  if (!storeId || !timestamp) return null
  return {
    storeId,
    timestamp,
    source: typeof rec.source === 'string' ? rec.source : undefined,
    saleId: typeof rec.saleId === 'number' ? rec.saleId : undefined,
  }
}

function isExpired(ev: StockUpdateEvent): boolean {
  return Date.now() - ev.timestamp > TTL_MS
}

type StoreIdInput = number | Ref<number | null> | ComputedRef<number | null>

/**
 * Sincronização centralizada de estoque:
 * - Emite evento global + grava token no localStorage
 * - Escuta eventos/focus/visibility e dispara refresh do caller
 */
export function useStockSync(storeId: StoreIdInput) {
  const storeIdRef: Ref<number | null> =
    isRef(storeId) ? (storeId as Ref<number | null>) : ref(typeof storeId === 'number' ? storeId : null)

  const effectiveStoreId = computed(() => normalizeStoreId(storeIdRef.value))

  const attached = ref(false)
  let detachFn: (() => void) | null = null
  let isHandling = false

  function clearPending() {
    localStorage.removeItem(STORAGE_KEY)
  }

  function emitStockUpdated(meta?: StockUpdateMeta) {
    const id = effectiveStoreId.value
    if (!id) return

    const ev: StockUpdateEvent = {
      storeId: id,
      timestamp: Date.now(),
      source: meta?.source,
      saleId: meta?.saleId,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(ev))
    window.dispatchEvent(new CustomEvent<StockUpdateEvent>(EVENT_NAME, { detail: ev }))
  }

  function checkPendingUpdate(): StockUpdateEvent | null {
    const id = effectiveStoreId.value
    if (!id) return null

    const pending = readPendingRaw()
    if (!pending) return null

    // Se for de outra loja, limpa para evitar “travamento” entre contextos
    if (pending.storeId !== id) {
      clearPending()
      return null
    }

    if (isExpired(pending)) {
      clearPending()
      return null
    }

    return pending
  }

  async function refreshIfPending(onRefresh: () => Promise<void>) {
    const pending = checkPendingUpdate()
    if (!pending) return
    if (isHandling) return
    isHandling = true
    try {
      await onRefresh()
      clearPending()
    } finally {
      isHandling = false
    }
  }

  function attachListeners(onRefresh: () => Promise<void>) {
    if (attached.value) return

    const handleEvent = async (event: Event) => {
      const ev = (event as CustomEvent).detail as StockUpdateEvent | undefined
      const id = effectiveStoreId.value
      if (!id) return
      if (!ev || typeof ev !== 'object') return
      if (ev.storeId !== id) return
      if (isHandling) return
      isHandling = true
      try {
        clearPending()
        await onRefresh()
      } finally {
        isHandling = false
      }
    }

    const handleFocus = async () => {
      await refreshIfPending(onRefresh)
    }

    const handleVisibility = async () => {
      if (document.hidden) return
      await refreshIfPending(onRefresh)
    }

    window.addEventListener(EVENT_NAME, handleEvent as EventListener)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    attached.value = true
    detachFn = () => {
      window.removeEventListener(EVENT_NAME, handleEvent as EventListener)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      attached.value = false
      detachFn = null
    }
  }

  function detachListeners() {
    detachFn?.()
  }

  return {
    emitStockUpdated,
    checkPendingUpdate,
    refreshIfPending,
    attachListeners,
    detachListeners,
  }
}

