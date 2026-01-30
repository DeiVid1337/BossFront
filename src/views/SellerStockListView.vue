<script setup lang="ts">
/**
 * Seller Stock List View
 * Lista de produtos do inventário para sellers editarem estoque
 * Seguindo Frontend.md: apenas orquestração, lógica no composable
 */

import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStoreContext } from '@/composables/useStoreContext'
import { useStoreProductList } from '@/composables/useStoreProductList'
import Pagination from '@/components/ui/Pagination.vue'

const route = useRoute()
const router = useRouter()
const storeContext = useStoreContext()

const storeId = computed(() => {
  const id = storeContext.storeId.value
  if (!id) {
    router.push('/seller/dashboard')
    return 0
  }
  return id
})

// Inicializar composable com storeId reativo
const storeProductList = useStoreProductList(storeId.value)

// Watch storeId para recarregar quando mudar
watch(storeId, (newStoreId) => {
  if (newStoreId && newStoreId !== 0) {
    storeProductList.loadStoreProducts()
  }
})

// Carregar inventário ao montar
onMounted(() => {
  if (storeId.value) {
    storeProductList.loadStoreProducts()
  }
})

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

function goToEditStock(storeProductId: number) {
  if (storeId.value) {
    router.push(`/seller/stores/${storeId.value}/products/${storeProductId}/edit-stock`)
  }
}

function goToAddProduct() {
  if (storeId.value) {
    router.push(`/seller/stores/${storeId.value}/products/new`)
  }
}

function getSortIcon(field: 'stock_quantity' | 'sale_price' | 'created_at' | 'product_name'): string {
  if (storeProductList.sortBy.value !== field) return '⇅'
  return storeProductList.sortOrder.value === 'asc' ? '↑' : '↓'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getProductLabel(storeProduct: any): string {
  if (storeProduct.product) {
    const product = storeProduct.product
    return `${product.brand} ${product.name}${product.flavor ? ` - ${product.flavor}` : ''}`
  }
  return `Produto #${storeProduct.product_id}`
}

function isLowStock(storeProduct: any): boolean {
  return storeProductList.isLowStock(storeProduct)
}
</script>

<template>
  <div class="seller-stock-page">
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
          <div>
            <h1 class="page-title">Editar Estoque</h1>
            <p class="page-subtitle">Ajuste as quantidades dos produtos do inventário</p>
          </div>
          <button @click="goToAddProduct" class="btn-add-product">
            <span class="btn-icon">➕</span>
            <span>Adicionar Produto</span>
          </button>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="filters-card">
        <div class="filters-content">
          <!-- Search -->
          <div class="filter-group">
            <label class="filter-label">Buscar</label>
            <input
              v-model="storeProductList.search.value"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Buscar por nome do produto..."
              class="filter-input"
            />
          </div>

          <!-- Active Filter -->
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select
              v-model="storeProductList.isActive.value"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option :value="undefined">Todos</option>
              <option :value="true">Ativos</option>
              <option :value="false">Inativos</option>
            </select>
          </div>

          <!-- Low Stock Filter -->
          <div class="filter-group">
            <label class="filter-label">Estoque</label>
            <select
              v-model="storeProductList.lowStock.value"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option :value="undefined">Todos</option>
              <option :value="true">Estoque Baixo</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button @click="handleSearch" class="btn-filter">
              🔍 Buscar
            </button>
            <button @click="storeProductList.clearFilters" class="btn-clear">
              Limpar
            </button>
          </div>
        </div>
      </div>

      <!-- Products List -->
      <div class="products-card">
        <!-- Loading State -->
        <div v-if="storeProductList.loading.value" class="loading-state">
          <p class="loading-text">Carregando produtos...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="storeProductList.error.value" class="error-state">
          <p class="error-text">{{ storeProductList.error.value }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="storeProductList.storeProducts.value.length === 0" class="empty-state">
          <p class="empty-text">Nenhum produto encontrado no inventário.</p>
        </div>

        <!-- Products List -->
        <div v-else class="products-list">
          <!-- Mobile: Cards -->
          <div class="products-grid-mobile">
            <div
              v-for="storeProduct in storeProductList.storeProducts.value"
              :key="storeProduct.id"
              @click="goToEditStock(storeProduct.id)"
              class="product-card"
            >
              <div class="product-card-content">
                <div class="product-header">
                  <h3 class="product-name">{{ getProductLabel(storeProduct) }}</h3>
                  <div
                    :class="[
                      'stock-badge',
                      isLowStock(storeProduct) ? 'stock-badge-low' : 'stock-badge-ok'
                    ]"
                  >
                    {{ storeProduct.stock_quantity || 0 }} unidades
                  </div>
                </div>
                <div class="product-details">
                  <div class="detail-row">
                    <span class="detail-label">Preço de Venda:</span>
                    <span class="detail-value">{{ formatCurrency(parseFloat(storeProduct.sale_price)) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Estoque Mínimo:</span>
                    <span class="detail-value">{{ storeProduct.min_stock_level || 0 }} unidades</span>
                  </div>
                  <div v-if="isLowStock(storeProduct)" class="detail-row warning">
                    <span class="detail-label">⚠️ Estoque Baixo</span>
                  </div>
                </div>
                <div class="product-action">
                  <button class="btn-edit-stock">
                    Editar Estoque →
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
                  <th @click="handleSort('product_name')" class="sortable">
                    Produto
                    <span class="sort-icon">{{ getSortIcon('product_name') }}</span>
                  </th>
                  <th @click="handleSort('sale_price')" class="sortable">
                    Preço de Venda
                    <span class="sort-icon">{{ getSortIcon('sale_price') }}</span>
                  </th>
                  <th @click="handleSort('stock_quantity')" class="sortable">
                    Estoque Atual
                    <span class="sort-icon">{{ getSortIcon('stock_quantity') }}</span>
                  </th>
                  <th>Estoque Mínimo</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="storeProduct in storeProductList.storeProducts.value"
                  :key="storeProduct.id"
                  :class="{ 'row-low-stock': isLowStock(storeProduct) }"
                >
                  <td class="table-product">
                    <div class="product-info">
                      <span class="product-name-text">{{ getProductLabel(storeProduct) }}</span>
                    </div>
                  </td>
                  <td class="table-price">
                    {{ formatCurrency(parseFloat(storeProduct.sale_price)) }}
                  </td>
                  <td class="table-stock">
                    <span
                      :class="[
                        'stock-value',
                        isLowStock(storeProduct) ? 'stock-value-low' : ''
                      ]"
                    >
                      {{ storeProduct.stock_quantity || 0 }}
                    </span>
                  </td>
                  <td class="table-min-stock">
                    {{ storeProduct.min_stock_level || 0 }}
                  </td>
                  <td class="table-status">
                    <span
                      :class="[
                        'status-badge',
                        storeProduct.is_active ? 'status-active' : 'status-inactive'
                      ]"
                    >
                      {{ storeProduct.is_active ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td class="table-action">
                    <button
                      @click.stop="goToEditStock(storeProduct.id)"
                      class="btn-edit-stock-small"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="storeProductList.lastPage.value > 1" class="pagination-wrapper">
            <Pagination
              :current-page="storeProductList.currentPage.value"
              :last-page="storeProductList.lastPage.value"
              :total="storeProductList.total.value"
              :per-page="storeProductList.perPage.value"
              @update:page="storeProductList.setPage"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.seller-stock-page {
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
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 640px) {
  .header-content {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
  }
}

.page-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  margin: 0;
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

.page-subtitle {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

@media (min-width: 640px) {
  .page-subtitle {
    font-size: 18px;
  }
}

.btn-add-product {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  border: none;
  border-radius: 16px;
  padding: 16px 32px;
  color: #FFFFFF;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 56px;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25), 0 0 20px rgba(231, 0, 0, 0.1);
  width: 100%;
  justify-content: center;
}

@media (min-width: 640px) {
  .btn-add-product {
    width: auto;
    padding: 18px 40px;
    font-size: 20px;
  }
}

.btn-add-product:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35), 0 0 30px rgba(231, 0, 0, 0.15);
}

.btn-add-product:active {
  transform: translateY(0);
}

.btn-add-product:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

.btn-icon {
  font-size: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .filters-card {
    padding: 32px;
  }
}

.filters-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: end;
}

@media (min-width: 768px) {
  .filters-content {
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: 16px;
  }
}

.filter-group {
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

.filter-input,
.filter-select {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #FFFFFF;
  transition: all 0.2s ease;
  min-height: 48px;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: rgba(231, 0, 0, 0.5);
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.1);
}

.filter-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.filter-actions {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.btn-filter,
.btn-clear {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  white-space: nowrap;
}

.btn-filter {
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25);
}

.btn-filter:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35);
}

.btn-clear {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

.btn-clear:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ============================================
   PRODUCTS CARD
   ============================================ */

.products-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .products-card {
    padding: 40px;
  }
}

/* ============================================
   LOADING & ERROR STATES
   ============================================ */

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.loading-text,
.error-text,
.empty-text {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.error-text {
  color: #FCA5A5;
}

/* ============================================
   PRODUCTS LIST - MOBILE
   ============================================ */

.products-grid-mobile {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 1024px) {
  .products-grid-mobile {
    display: none;
  }
}

.product-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.product-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.product-card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.product-name {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0;
  flex: 1;
}

.stock-badge {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 12px;
  white-space: nowrap;
}

.stock-badge-ok {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ADE80;
}

.stock-badge-low {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #FCA5A5;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.detail-row.warning {
  color: #FCA5A5;
}

.detail-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.detail-value {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  text-align: right;
}

.product-action {
  margin-top: 8px;
}

.btn-edit-stock {
  width: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 700;
  padding: 14px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25);
}

.btn-edit-stock:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35);
}

/* ============================================
   PRODUCTS LIST - DESKTOP TABLE
   ============================================ */

.products-table-desktop {
  display: none;
  overflow-x: auto;
}

@media (min-width: 1024px) {
  .products-table-desktop {
    display: block;
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: rgba(255, 255, 255, 0.05);
}

.data-table th {
  padding: 16px 20px;
  text-align: left;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.data-table th.sortable:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sort-icon {
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.7;
}

.data-table td {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  color: #FFFFFF;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr {
  transition: all 0.2s ease;
}

.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.data-table tbody tr.row-low-stock {
  background: rgba(239, 68, 68, 0.05);
}

.table-product {
  font-weight: 600;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name-text {
  color: #FFFFFF;
}

.table-price {
  font-weight: 600;
  color: #FFD700;
}

.table-stock {
  font-weight: 700;
}

.stock-value {
  color: #4ADE80;
}

.stock-value-low {
  color: #FCA5A5;
}

.table-min-stock {
  color: rgba(255, 255, 255, 0.7);
}

.table-status {
  font-size: 14px;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
}

.status-active {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ADE80;
}

.status-inactive {
  background: rgba(107, 114, 128, 0.2);
  border: 1px solid rgba(107, 114, 128, 0.3);
  color: #9CA3AF;
}

.table-action {
  text-align: right;
}

.btn-edit-stock-small {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(231, 0, 0, 0.25);
}

.btn-edit-stock-small:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 0, 0, 0.35);
}

/* ============================================
   PAGINATION
   ============================================ */

.pagination-wrapper {
  margin-top: 32px;
  display: flex;
  justify-content: center;
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

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
