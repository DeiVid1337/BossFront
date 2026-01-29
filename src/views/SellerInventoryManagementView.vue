<script setup lang="ts">
/**
 * Seller Inventory Management View (Admin/Manager)
 * Ajuste em lote:
 * - Adicionar ao vendedor (loja → vendedor) respeitando available_quantity
 * - Retirar do vendedor (vendedor → loja) respeitando seller_quantity
 *
 * Seguindo Frontend.md: view só orquestra, lógica no composable.
 */

import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useSellerInventoryManagement } from '@/composables/useSellerInventoryManagement'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'

const route = useRoute()
const router = useRouter()

const sellerId = Number(route.params.sellerId)
const { effectiveStoreId, routeStoreId, syncUrlToStore } = useEffectiveStoreId()
const storeId = computed(() => effectiveStoreId.value ?? 0)

const inv = useSellerInventoryManagement(effectiveStoreId, sellerId)
// Importante: expor refs/computed como bindings top-level para o template
// (senão Vue não faz unwrapping automático em propriedades aninhadas)
const {
  seller,
  loading,
  error,
  success,
  search,
  storeMismatchMessage,
  filteredLines,
  totalSellerUnits,
  totalAvailableToAdd,
  addItemErrors,
  removeItemErrors,
  getProductLabel,
  getAddQuantity,
  getRemoveQuantity,
  setAddQuantity,
  setRemoveQuantity,
  clearSelections,
  canConfirmAdd,
  canConfirmRemove,
  confirmOpen,
  pendingAction,
  addSummary,
  removeSummary,
  openConfirm,
  closeConfirm,
  submitConfirmed,
  loadAll,
  loadSeller,
} = inv

const pageTitle = computed(() => {
  const name = seller.value?.name || 'Vendedor'
  return `Estoque de ${name}`
})

const pageSubtitle = computed(() => {
  const email = seller.value?.email
  return email ? `Loja #${storeId.value} • ${email}` : `Loja #${storeId.value}`
})

const confirmTitle = computed(() => {
  return pendingAction.value === 'add' ? 'Confirmar Adição ao Vendedor' : 'Confirmar Retirada do Vendedor'
})

const confirmMessage = computed(() => {
  const action = pendingAction.value
  const items = action === 'add' ? addSummary.value : removeSummary.value
  const verb = action === 'add' ? 'Adicionar' : 'Retirar'

  const lines = items.map(i => `- ${i.label}: ${i.qty} unidade(s)`).join('\n')
  return `${verb} os seguintes itens?\n\n${lines}`
})

function goBack() {
  router.push('/seller-stock-management')
}

onMounted(async () => {
  syncUrlToStore(id => ({ path: `/seller-stock-management/${sellerId}/stores/${id}/inventory` }))
  await Promise.all([loadSeller(), loadAll()])
})

watch(effectiveStoreId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  if (routeStoreId.value !== newId) {
    router.replace({ path: `/seller-stock-management/${sellerId}/stores/${newId}/inventory` })
  }
  loadAll(true)
})
</script>

<template>
  <div class="seller-inventory-management-page">
    <!-- Background orbs decorativos -->
    <div class="background-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="orb orb-4"></div>
    </div>

    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <button @click="goBack" class="btn-back">
          <span class="btn-back-icon">←</span>
          <span>Voltar</span>
        </button>

        <div class="header-content">
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-subtitle">{{ pageSubtitle }}</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total no Vendedor</div>
          <div class="stat-value">{{ totalSellerUnits }} un.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Disponível na Loja</div>
          <div class="stat-value">{{ totalAvailableToAdd }} un.</div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="success" class="success-message">
        <strong>✅ Sucesso</strong>
        <div class="msg-text">{{ success }}</div>
      </div>

      <div v-if="storeMismatchMessage || error" class="error-message">
        <strong>⚠️ Atenção</strong>
        <div class="msg-text">{{ storeMismatchMessage || error }}</div>
      </div>

      <!-- Filters -->
      <div class="filters-card">
        <div class="filters-content">
          <div class="filter-group">
            <label class="filter-label">Buscar produto</label>
            <input v-model="search" class="filter-input" placeholder="Buscar por nome..." />
          </div>
          <div class="filter-actions">
            <button class="btn-clear" @click="search = ''">Limpar</button>
            <button class="btn-refresh" :disabled="loading" @click="loadAll(true)">
              Recarregar
            </button>
          </div>
        </div>
      </div>

      <!-- Two sections: Add / Remove -->
      <div class="two-col">
        <!-- Add -->
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Adicionar ao Vendedor</h2>
              <p class="panel-subtitle">Loja → Vendedor (limite: disponível para retirar)</p>
            </div>
            <div class="panel-actions">
              <button class="btn-small" @click="inv.clearSelections('add')">Limpar seleção</button>
              <button class="btn-primary" :disabled="!canConfirmAdd || loading" @click="openConfirm('add')">
                Adicionar selecionados
              </button>
            </div>
          </div>

          <div v-if="loading" class="loading-state">Carregando...</div>

          <div v-else class="list">
            <div
              v-for="line in filteredLines"
              :key="line.storeProduct.id"
              class="row"
              :class="{ disabled: line.availableToAdd <= 0 }"
            >
              <div class="row-main">
                <div class="row-title">{{ getProductLabel(line.storeProduct) }}</div>
                <div class="row-meta">
                  <span class="badge">Disponível: {{ line.availableToAdd }}</span>
                </div>
                <div v-if="addItemErrors[line.storeProduct.id]?.length" class="row-error">
                  {{ addItemErrors[line.storeProduct.id].join(' • ') }}
                </div>
              </div>
              <div class="row-qty">
                <button
                  class="qty-btn"
                  :disabled="line.availableToAdd <= 0 || getAddQuantity(line.storeProduct.id) <= 0"
                  @click="setAddQuantity(line.storeProduct.id, getAddQuantity(line.storeProduct.id) - 1)"
                >
                  −
                </button>
                <input
                  class="qty-input"
                  type="number"
                  min="0"
                  :max="line.availableToAdd"
                  :disabled="line.availableToAdd <= 0"
                  :value="getAddQuantity(line.storeProduct.id)"
                  @input="
                    setAddQuantity(
                      line.storeProduct.id,
                      parseInt(($event.target as HTMLInputElement).value) || 0
                    )
                  "
                />
                <button
                  class="qty-btn"
                  :disabled="
                    line.availableToAdd <= 0 ||
                    getAddQuantity(line.storeProduct.id) >= line.availableToAdd
                  "
                  @click="setAddQuantity(line.storeProduct.id, getAddQuantity(line.storeProduct.id) + 1)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Remove -->
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Retirar do Vendedor</h2>
              <p class="panel-subtitle">Vendedor → Loja (limite: estoque do vendedor)</p>
            </div>
            <div class="panel-actions">
              <button class="btn-small" @click="clearSelections('remove')">Limpar seleção</button>
              <button
                class="btn-danger"
                :disabled="!canConfirmRemove || loading"
                @click="openConfirm('remove')"
              >
                Retirar selecionados
              </button>
            </div>
          </div>

          <div v-if="loading" class="loading-state">Carregando...</div>

          <div v-else class="list">
            <div
              v-for="line in filteredLines.filter(l => l.availableToRemove > 0)"
              :key="line.storeProduct.id"
              class="row"
            >
              <div class="row-main">
                <div class="row-title">{{ getProductLabel(line.storeProduct) }}</div>
                <div class="row-meta">
                  <span class="badge badge-warn">No vendedor: {{ line.availableToRemove }}</span>
                </div>
                <div v-if="removeItemErrors[line.storeProduct.id]?.length" class="row-error">
                  {{ removeItemErrors[line.storeProduct.id].join(' • ') }}
                </div>
              </div>
              <div class="row-qty">
                <button
                  class="qty-btn"
                  :disabled="getRemoveQuantity(line.storeProduct.id) <= 0"
                  @click="setRemoveQuantity(line.storeProduct.id, getRemoveQuantity(line.storeProduct.id) - 1)"
                >
                  −
                </button>
                <input
                  class="qty-input"
                  type="number"
                  min="0"
                  :max="line.availableToRemove"
                  :value="getRemoveQuantity(line.storeProduct.id)"
                  @input="
                    setRemoveQuantity(
                      line.storeProduct.id,
                      parseInt(($event.target as HTMLInputElement).value) || 0
                    )
                  "
                />
                <button
                  class="qty-btn"
                  :disabled="getRemoveQuantity(line.storeProduct.id) >= line.availableToRemove"
                  @click="setRemoveQuantity(line.storeProduct.id, getRemoveQuantity(line.storeProduct.id) + 1)"
                >
                  +
                </button>
              </div>
            </div>

            <div v-if="filteredLines.filter(l => l.availableToRemove > 0).length === 0" class="empty-state">
              Nenhum item no inventário do vendedor.
            </div>
          </div>
        </section>
      </div>
    </div>

    <ConfirmModal
      :show="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="pendingAction === 'add' ? 'Confirmar Adição' : 'Confirmar Retirada'"
      :cancel-text="'Cancelar'"
      :variant="pendingAction === 'remove' ? 'danger' : 'default'"
      @confirm="submitConfirmed"
      @cancel="closeConfirm"
    />
  </div>
</template>

<style scoped>
/* Base visual igual às páginas de gestão (paleta logo) */
.seller-inventory-management-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0000 0%, #1a0000 50%, #000000 100%);
  background-attachment: fixed;
  color: #ffffff;
  position: relative;
  overflow-x: hidden;
}

.background-orbs {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.orb-1 {
  top: 25%;
  left: 25%;
  width: 384px;
  height: 384px;
  background: rgba(231, 0, 0, 0.1);
}
.orb-2 {
  bottom: 25%;
  right: 25%;
  width: 384px;
  height: 384px;
  background: rgba(255, 127, 0, 0.1);
  animation-delay: 1s;
}
.orb-3 {
  top: 50%;
  right: 33%;
  width: 288px;
  height: 288px;
  background: rgba(255, 215, 0, 0.1);
  animation-delay: 2s;
}
.orb-4 {
  bottom: 33%;
  left: 33%;
  width: 320px;
  height: 320px;
  background: rgba(193, 127, 48, 0.1);
  animation-delay: 0.5s;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

.page-container {
  position: relative;
  z-index: 10;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 20px;
}
@media (min-width: 640px) {
  .page-container {
    padding: 32px 40px;
  }
}
@media (min-width: 1024px) {
  .page-container {
    padding: 40px 56px;
  }
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
}
.btn-back:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}
.btn-back-icon {
  font-size: 20px;
}

.header-content {
  flex: 1;
}
.page-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 6px 0;
}
.page-subtitle {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 16px 18px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.stat-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
}
.stat-value {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 22px;
  font-weight: 800;
  margin-top: 6px;
  background: linear-gradient(135deg, #e70000 0%, #ff7f00 50%, #ffd700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.success-message,
.error-message {
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.success-message {
  border-color: rgba(74, 222, 128, 0.35);
}
.error-message {
  border-color: rgba(239, 68, 68, 0.35);
}
.msg-text {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.4;
}

.filters-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 18px;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.filters-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
@media (min-width: 768px) {
  .filters-content {
    flex-direction: row;
    align-items: flex-end;
  }
}
.filter-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}
.filter-input {
  width: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #ffffff;
  min-height: 48px;
}
.filter-input:focus {
  outline: none;
  border-color: rgba(231, 0, 0, 0.5);
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.1);
}
.filter-actions {
  display: flex;
  gap: 10px;
}
.btn-clear,
.btn-refresh {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  white-space: nowrap;
}
.btn-clear:hover,
.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}
.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 1024px) {
  .two-col {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
}

.panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 18px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}
@media (min-width: 768px) {
  .panel-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.panel-title {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 800;
  margin: 0;
}
.panel-subtitle {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin: 6px 0 0 0;
}
.panel-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-small {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 700;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
}
.btn-small:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-primary,
.btn-danger {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 800;
  padding: 10px 14px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
}
.btn-primary {
  background: linear-gradient(135deg, #e70000 0%, #ff7f00 50%, #ffd700 100%);
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25);
}
.btn-danger {
  background: rgba(239, 68, 68, 0.25);
  border: 1px solid rgba(239, 68, 68, 0.35);
}
.btn-primary:disabled,
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.loading-state {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.row.disabled {
  opacity: 0.55;
}

.row-main {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-meta {
  margin-top: 6px;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.85);
}
.badge-warn {
  background: rgba(255, 215, 0, 0.12);
  border-color: rgba(255, 215, 0, 0.2);
}
.row-error {
  margin-top: 8px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #fca5a5;
}

.row-qty {
  display: flex;
  gap: 8px;
  align-items: center;
}
.qty-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}
.qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.qty-input {
  width: 72px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  text-align: center;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 800;
}

.empty-state {
  padding: 18px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

button:focus-visible,
input:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>

