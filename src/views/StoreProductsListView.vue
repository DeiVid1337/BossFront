<script setup lang="ts">
/**
 * Store Products List View (Inventário)
 * Seguindo Frontend.md: apenas orquestração, lógica no composable
 * Seguindo DevGuide.md: lista com filtros (is_active, low_stock, search), ordenação, paginação
 */

import { computed, onMounted, onActivated, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStoreProductList } from '@/composables/useStoreProductList'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'
import { useStockSync } from '@/composables/useStockSync'
import Pagination from '@/components/ui/Pagination.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const { effectiveStoreId, routeStoreId, syncUrlToStore } = useEffectiveStoreId()
const storeId = computed(() => effectiveStoreId.value ?? 0)
const storeProductList = useStoreProductList(effectiveStoreId)
const stockSync = useStockSync(effectiveStoreId)

// Verificar permissões
const isAdmin = computed(() => authStore.user?.role === 'admin')
const isManager = computed(() => authStore.user?.role === 'manager')
const canEdit = computed(() => isAdmin.value || isManager.value)

// Flag para controlar se já foi montado
let hasMounted = false

// Carregar inventário ao montar
onMounted(() => {
  storeProductList.loadStoreProducts()
  hasMounted = true

  // manter URL alinhada ao store efetivo
  syncUrlToStore(id => ({ path: `/stores/${id}/products` }))

  stockSync.attachListeners(async () => {
    await storeProductList.loadStoreProducts(true)
  })
  stockSync.refreshIfPending(async () => {
    await storeProductList.loadStoreProducts(true)
  })
})

// Recarregar quando o componente for ativado (se estiver em keep-alive)
onActivated(() => {
  if (hasMounted) {
    storeProductList.loadStoreProducts()
    stockSync.refreshIfPending(async () => {
      await storeProductList.loadStoreProducts(true)
    })
  }
})

onUnmounted(() => {
  stockSync.detachListeners()
})

// Observar mudanças na rota para recarregar quando voltar da edição
watch(
  () => route.name,
  (newName, oldName) => {
    // Se voltou para a lista de inventário após estar em outra rota
    if (newName === 'store-products' && oldName && oldName !== 'store-products') {
      storeProductList.loadStoreProducts()
    }
  },
  { immediate: false }
)

// Se trocar o store efetivo (admin via seletor), sincronizar URL e recarregar
watch(effectiveStoreId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  if (routeStoreId.value !== newId) {
    router.replace({ path: `/stores/${newId}/products` })
  }
  storeProductList.clearFilters()
  storeProductList.loadStoreProducts(true)
})

// Observar mudanças na página
watch(
  () => storeProductList.currentPage.value,
  (newPage, oldPage) => {
    if (newPage !== oldPage && oldPage !== undefined) {
      storeProductList.loadStoreProducts()
    }
  }
)

// Handlers
function handleSearch() {
  storeProductList.applyFilters()
}

function handleFilterChange() {
  storeProductList.applyFilters()
}

function handleSort(field: 'stock_quantity' | 'sale_price' | 'created_at' | 'product_name') {
  storeProductList.setSort(field)
}

function goToAdd() {
  if (!storeId.value) return
  router.push(`/stores/${storeId.value}/products/new`)
}

function goToEdit(storeProductId: number) {
  if (!storeId.value) return
  router.push(`/stores/${storeId.value}/products/${storeProductId}/edit`)
}

function goToEditStock(storeProductId: number) {
  if (!storeId.value) return
  router.push(`/stores/${storeId.value}/products/${storeProductId}/edit-stock`)
}

function getSortIcon(
  field: 'stock_quantity' | 'sale_price' | 'created_at' | 'product_name'
): string {
  if (storeProductList.sortBy.value !== field) return '⇅'
  return storeProductList.sortOrder.value === 'asc' ? '↑' : '↓'
}

function formatPrice(price: string): string {
  return parseFloat(price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
</script>

<template>
  <div class="inventory-page">
    <!-- Background orbs decorativos -->
    <div class="background-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="orb orb-4"></div>
    </div>

    <!-- Container principal -->
    <div class="page-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <button @click="router.push('/stores')" class="btn-back">
            <span class="btn-back-icon">←</span>
            <span>Voltar</span>
          </button>
          <h1 class="page-title">Inventário</h1>
          <button
            v-if="canEdit"
            @click="goToAdd"
            class="btn-primary btn-new-product"
          >
            <span class="btn-icon">+</span>
            <span>Adicionar Produto</span>
          </button>
        </div>

        <!-- Filtros -->
        <div class="filters-card">
          <!-- Busca -->
          <div class="filter-row">
            <input
              :value="storeProductList.search.value"
              @input="e => { storeProductList.search.value = (e.target as HTMLInputElement).value }"
              type="text"
              placeholder="Buscar por nome..."
              class="input-field"
              @keyup.enter="handleSearch"
            />
            <button
              @click="handleSearch"
              class="btn-primary btn-search"
            >
              Buscar
            </button>
          </div>

          <!-- Filtros de Status e Estoque -->
          <div class="filter-row">
            <select
              :value="storeProductList.isActive.value === undefined ? '' : String(storeProductList.isActive.value)"
              @change="e => {
                const value = (e.target as HTMLSelectElement).value
                storeProductList.isActive.value = value === 'true' ? true : value === 'false' ? false : undefined
                handleFilterChange()
              }"
              class="input-field filter-select"
            >
              <option value="">Todos os status</option>
              <option value="true">Apenas ativos</option>
              <option value="false">Apenas inativos</option>
            </select>

            <select
              :value="storeProductList.lowStock.value ? 'true' : ''"
              @change="e => {
                const value = (e.target as HTMLSelectElement).value
                storeProductList.lowStock.value = value === 'true' ? true : undefined
                handleFilterChange()
              }"
              class="input-field filter-select"
            >
              <option value="">Todos os produtos</option>
              <option value="true">Estoque baixo</option>
            </select>

            <button
              @click="storeProductList.clearFilters"
              class="btn-secondary"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="storeProductList.loading.value" class="loading-state">
        <div class="loading-card">
          <p class="loading-text">Carregando inventário...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="storeProductList.error.value"
        class="error-state"
      >
        <p class="error-text">{{ storeProductList.error.value }}</p>
      </div>

      <!-- Products List -->
      <div v-else-if="storeProductList.storeProducts.value.length > 0" class="products-section">
        <!-- Mobile: Cards -->
        <div class="products-grid-mobile">
          <div
            v-for="storeProduct in storeProductList.storeProducts.value"
            :key="storeProduct.id"
            class="product-card"
            :class="{ 'low-stock-card': storeProductList.isLowStock(storeProduct) }"
          >
            <div class="product-card-content">
              <div class="product-info">
                <div v-if="storeProduct.product" class="product-details">
                  <div class="product-brand">{{ storeProduct.product.brand }}</div>
                  <div class="product-name">{{ storeProduct.product.name }}</div>
                  <div class="product-flavor">{{ storeProduct.product.flavor }}</div>
                </div>
                <div v-else class="product-unknown">Produto não encontrado</div>

                <div class="product-prices">
                  <div class="price-row">
                    <span class="price-label">Custo:</span>
                    <span class="price-value">{{ formatPrice(storeProduct.cost_price) }}</span>
                  </div>
                  <div class="price-row">
                    <span class="price-label">Venda:</span>
                    <span class="price-value price-sale">{{ formatPrice(storeProduct.sale_price) }}</span>
                  </div>
                </div>

                <div class="product-stock">
                  <div class="stock-row">
                    <span class="stock-label">Estoque:</span>
                    <span
                      class="stock-value"
                      :class="{ 'low-stock': storeProductList.isLowStock(storeProduct) }"
                    >
                      {{ storeProduct.stock_quantity }}
                    </span>
                  </div>
                  <div class="stock-row">
                    <span class="stock-label">Mínimo:</span>
                    <span class="stock-value">{{ storeProduct.min_stock_level }}</span>
                  </div>
                </div>

                <div class="product-status">
                  <span
                    class="status-badge"
                    :class="storeProduct.is_active ? 'active' : 'inactive'"
                  >
                    {{ storeProduct.is_active ? 'Ativo' : 'Inativo' }}
                  </span>
                </div>
              </div>
              <div v-if="canEdit" class="product-actions">
                <button
                  @click="goToEditStock(storeProduct.id)"
                  class="btn-edit-stock"
                >
                  📦 Editar Estoque
                </button>
                <button
                  @click="goToEdit(storeProduct.id)"
                  class="btn-edit"
                >
                  ✏️ Editar Completo
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop: Table -->
        <div class="products-table-desktop">
          <table class="data-table">
            <thead>
              <tr>
                <th
                  @click="handleSort('product_name')"
                  class="sortable"
                >
                  Produto {{ getSortIcon('product_name') }}
                </th>
                <th>Preço de Custo</th>
                <th>Preço de Venda</th>
                <th
                  @click="handleSort('stock_quantity')"
                  class="sortable"
                >
                  Estoque {{ getSortIcon('stock_quantity') }}
                </th>
                <th>Estoque Mínimo</th>
                <th>Status</th>
                <th v-if="canEdit">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="storeProduct in storeProductList.storeProducts.value"
                :key="storeProduct.id"
                class="table-row"
                :class="{ 'low-stock-row': storeProductList.isLowStock(storeProduct) }"
              >
                <td class="table-product-info">
                  <div v-if="storeProduct.product">
                    <div class="table-brand">{{ storeProduct.product.brand }}</div>
                    <div class="table-name">{{ storeProduct.product.name }}</div>
                    <div class="table-flavor">{{ storeProduct.product.flavor }}</div>
                  </div>
                  <div v-else class="table-unknown">Produto não encontrado</div>
                </td>
                <td class="table-price">{{ formatPrice(storeProduct.cost_price) }}</td>
                <td class="table-price table-price-sale">{{ formatPrice(storeProduct.sale_price) }}</td>
                <td
                  class="table-stock"
                  :class="{ 'low-stock': storeProductList.isLowStock(storeProduct) }"
                >
                  {{ storeProduct.stock_quantity }}
                </td>
                <td class="table-stock-min">{{ storeProduct.min_stock_level }}</td>
                <td>
                  <span
                    class="status-badge"
                    :class="storeProduct.is_active ? 'active' : 'inactive'"
                  >
                    {{ storeProduct.is_active ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td v-if="canEdit" @click.stop class="table-actions">
                  <div class="action-buttons">
                    <button
                      @click="goToEditStock(storeProduct.id)"
                      class="btn-edit-stock-small"
                      title="Editar Estoque"
                    >
                      📦 Estoque
                    </button>
                    <button
                      @click="goToEdit(storeProduct.id)"
                      class="btn-edit-small"
                      title="Editar Completo"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrapper">
          <Pagination
            :current-page="storeProductList.currentPage.value"
            :last-page="storeProductList.lastPage.value"
            :total="storeProductList.total.value"
            :per-page="storeProductList.perPage.value"
            @update:page="storeProductList.setPage"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-card">
          <p class="empty-title">Nenhum produto encontrado</p>
          <p class="empty-text">
            Tente ajustar os filtros de busca ou adicionar um novo produto ao inventário.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.inventory-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0A0000 0%, #1A0000 50%, #000000 100%);
  background-attachment: fixed;
  color: #FFFFFF;
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
  0%, 100% {
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
  max-width: 1280px;
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

/* ============================================
   HEADER SECTION
   ============================================ */

.page-header {
  margin-bottom: 48px;
}

@media (min-width: 640px) {
  .page-header {
    margin-bottom: 56px;
  }
}

@media (min-width: 1024px) {
  .page-header {
    margin-bottom: 64px;
  }
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 48px;
}

@media (min-width: 640px) {
  .header-content {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 12px 20px;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 500;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  align-self: flex-start;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
}

.btn-back:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

.btn-back-icon {
  font-size: 20px;
  font-weight: 700;
}

.page-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  margin: 0;
  flex: 1;
}

@media (min-width: 640px) {
  .page-title {
    font-size: 36px;
  }
}

@media (min-width: 1024px) {
  .page-title {
    font-size: 48px;
  }
}

/* ============================================
   FILTERS CARD
   ============================================ */

.filters-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 640px) {
  .filters-card {
    padding: 40px;
    gap: 32px;
  }
}

.filter-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 640px) {
  .filter-row {
    flex-direction: row;
    gap: 24px;
  }
}

.filter-select {
  min-width: 180px;
}

/* ============================================
   INPUTS
   ============================================ */

.input-field {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 16px 20px;
  color: #FFFFFF;
  font-size: 16px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: 48px;
  transition: all 0.2s ease;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input-field:focus {
  outline: none;
  border-color: rgba(231, 0, 0, 0.5);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.1);
}

select.input-field {
  cursor: pointer;
}

select.input-field option {
  background: #000000;
  color: #FFFFFF;
}

/* ============================================
   BUTTONS
   ============================================ */

.btn-primary,
.btn-secondary {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  border-radius: 16px;
  padding: 16px 32px;
  min-height: 48px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@media (min-width: 640px) {
  .btn-primary,
  .btn-secondary {
    padding: 16px 40px;
  }
}

.btn-primary {
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

.btn-new-product {
  width: 100%;
}

@media (min-width: 640px) {
  .btn-new-product {
    width: auto;
  }
}

.btn-icon {
  font-size: 20px;
  font-weight: 700;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-secondary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.2);
}

/* ============================================
   LOADING & ERROR STATES
   ============================================ */

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 0;
}

.loading-card,
.empty-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 48px 56px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  text-align: center;
}

@media (min-width: 640px) {
  .loading-card,
  .empty-card {
    padding: 56px 64px;
  }
}

.loading-text {
  font-size: 18px;
  font-weight: 500;
  color: #FFFFFF;
  margin: 0;
}

.error-state {
  background: rgba(239, 68, 68, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 24px;
  padding: 32px 40px;
  margin-bottom: 48px;
}

.error-text {
  color: #FCA5A5;
  font-weight: 500;
  margin: 0;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 12px 0;
}

.empty-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0;
}

/* ============================================
   PRODUCTS GRID (MOBILE)
   ============================================ */

.products-section {
  margin-bottom: 48px;
}

.products-grid-mobile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .products-grid-mobile {
    display: none;
  }
}

.product-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

.product-card:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3), 0 0 60px rgba(231, 0, 0, 0.1);
  transform: translateY(-2px);
}

.product-card.low-stock-card {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

.product-card-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-brand {
  font-size: 16px;
  font-weight: 700;
  color: #E70000;
  letter-spacing: 0.05em;
}

.product-name {
  font-size: 20px;
  font-weight: 600;
  color: #FFFFFF;
  line-height: 1.3;
}

.product-flavor {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

.product-unknown {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  font-size: 16px;
}

.product-prices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.price-value {
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

.price-sale {
  color: #FFD700;
  font-size: 18px;
}

.product-stock {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stock-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stock-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.stock-value {
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
}

.stock-value.low-stock {
  color: #FCA5A5;
}

.product-status {
  padding-top: 8px;
}

.status-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.status-badge.active {
  background: rgba(34, 197, 94, 0.2);
  color: #86EFAC;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-badge.inactive {
  background: rgba(239, 68, 68, 0.2);
  color: #FCA5A5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.product-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.btn-edit-stock {
  background: rgba(255, 215, 0, 0.2);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 16px;
  padding: 12px 24px;
  color: #FFD700;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  width: 100%;
  transition: all 0.2s ease;
}

.btn-edit-stock:hover {
  background: rgba(255, 215, 0, 0.3);
  border-color: rgba(255, 215, 0, 0.5);
  transform: scale(1.02);
}

.btn-edit-stock:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
}

.btn-edit {
  background: rgba(231, 0, 0, 0.3);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(231, 0, 0, 0.3);
  border-radius: 16px;
  padding: 12px 24px;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  width: 100%;
  transition: all 0.2s ease;
}

.btn-edit:hover {
  background: rgba(231, 0, 0, 0.5);
  transform: scale(1.02);
}

.btn-edit:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

/* ============================================
   PRODUCTS TABLE (DESKTOP)
   ============================================ */

.products-table-desktop {
  display: none;
}

@media (min-width: 768px) {
  .products-table-desktop {
    display: block;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.data-table th {
  padding: 24px 32px;
  text-align: left;
  font-size: 14px;
  font-weight: 700;
  color: #FFFFFF;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.data-table th.sortable:hover {
  background: rgba(255, 255, 255, 0.1);
}

.data-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.data-table tbody tr.low-stock-row {
  background: rgba(239, 68, 68, 0.05);
}

.data-table tbody tr.low-stock-row:hover {
  background: rgba(239, 68, 68, 0.1);
}

.data-table tbody tr:last-child {
  border-bottom: none;
}

.data-table td {
  padding: 24px 32px;
  font-size: 16px;
}

.table-product-info {
  min-width: 200px;
}

.table-brand {
  font-weight: 700;
  color: #E70000;
  font-size: 14px;
  margin-bottom: 4px;
}

.table-name {
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 4px;
}

.table-flavor {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.table-unknown {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.table-price {
  color: #FFFFFF;
  font-weight: 500;
}

.table-price-sale {
  color: #FFD700;
  font-weight: 600;
}

.table-stock {
  font-weight: 700;
  color: #FFFFFF;
}

.table-stock.low-stock {
  color: #FCA5A5;
}

.table-stock-min {
  color: rgba(255, 255, 255, 0.8);
}

.table-actions {
  padding: 16px 20px;
  min-width: 200px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.btn-edit-stock-small {
  background: rgba(255, 215, 0, 0.2);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 10px 16px;
  color: #FFD700;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-height: 40px;
}

.btn-edit-stock-small:hover {
  background: rgba(255, 215, 0, 0.3);
  border-color: rgba(255, 215, 0, 0.5);
  transform: scale(1.05);
}

.btn-edit-stock-small:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
}

.btn-edit-small {
  background: rgba(231, 0, 0, 0.3);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(231, 0, 0, 0.3);
  border-radius: 12px;
  padding: 10px 16px;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  min-height: 40px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-edit-small:hover {
  background: rgba(231, 0, 0, 0.5);
  transform: scale(1.05);
}

.btn-edit-small:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

/* ============================================
   PAGINATION
   ============================================ */

.pagination-wrapper {
  margin-top: 56px;
}

@media (min-width: 640px) {
  .pagination-wrapper {
    margin-top: 64px;
  }
}

/* ============================================
   ACCESSIBILITY
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus visible para melhor acessibilidade */
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
