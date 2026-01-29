<script setup lang="ts">
/**
 * Sales List View
 * Seguindo Frontend.md: apenas orquestração, lógica no composable
 * Seguindo DevGuide.md: filtros (from, to, search), ordenação, paginação
 */

import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSaleList } from '@/composables/useSaleList'
import Pagination from '@/components/ui/Pagination.vue'
import { useAuthStore } from '@/stores/auth'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const { effectiveStoreId, routeStoreId, role, syncUrlToStore } = useEffectiveStoreId()

const saleList = useSaleList(effectiveStoreId)

// Carregar vendas ao montar
onMounted(() => {
  saleList.loadSales()
})

// Se trocar storeId (ex.: trocar loja no seletor), sincronizar URL e recarregar
watch(effectiveStoreId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  // Manter a URL alinhada ao contexto (principalmente para admin/manager)
  syncUrlToStore(id => ({ path: `/stores/${id}/sales` }))
  saleList.clearFilters()
  saleList.loadSales(true)
})

// Observar mudanças na página
watch(
  () => saleList.currentPage.value,
  (newPage, oldPage) => {
    if (newPage !== oldPage && oldPage !== undefined) {
      saleList.loadSales()
    }
  }
)

// Handlers
function handleSearch() {
  saleList.applyFilters()
}

function handleFilterChange() {
  saleList.applyFilters()
}

function handleSort(field: 'sale_date' | 'total_amount' | 'created_at') {
  saleList.setSort(field)
}

function goToSale(saleId: number) {
  router.push(`/stores/${effectiveStoreId.value}/sales/${saleId}`)
}

function goToNew() {
  router.push(`/stores/${effectiveStoreId.value}/sales/new`)
}

function getSortIcon(field: 'sale_date' | 'total_amount' | 'created_at'): string {
  if (saleList.sortBy.value !== field) return '⇅'
  return saleList.sortOrder.value === 'asc' ? '↑' : '↓'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goBack() {
  if (role.value === 'admin') {
    router.push('/stores')
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="sales-page">
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
          <button @click="goBack" class="btn-back">
            <span class="btn-back-icon">←</span>
            <span>Voltar</span>
          </button>
          <h1 class="page-title">Vendas</h1>
          <button
            @click="goToNew"
            class="btn-primary btn-new-sale"
          >
            <span class="btn-icon">+</span>
            <span>Nova Venda</span>
          </button>
        </div>

        <!-- Contexto atual -->
        <div class="store-hint">
          Listando vendas da <strong>Loja #{{ effectiveStoreId }}</strong>
        </div>

        <!-- Filtros -->
        <div class="filters-card">
          <!-- Busca -->
          <div class="filter-row">
            <input
              :value="saleList.search.value"
              @input="e => { saleList.search.value = (e.target as HTMLInputElement).value }"
              type="text"
              placeholder="Buscar por observações..."
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

          <!-- Filtros de Data -->
          <div class="filter-row">
            <input
              :value="saleList.from.value"
              @input="e => { saleList.from.value = (e.target as HTMLInputElement).value }"
              type="date"
              class="input-field filter-date"
              @change="handleFilterChange"
            />
            <input
              :value="saleList.to.value"
              @input="e => { saleList.to.value = (e.target as HTMLInputElement).value }"
              type="date"
              class="input-field filter-date"
              @change="handleFilterChange"
            />
            <button
              @click="saleList.clearFilters"
              class="btn-secondary"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="saleList.loading.value" class="loading-state">
        <div class="loading-card">
          <p class="loading-text">Carregando vendas...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="saleList.error.value"
        class="error-state"
      >
        <p class="error-text">{{ saleList.error.value }}</p>
      </div>

      <!-- Sales List -->
      <div v-else-if="saleList.sales.value.length > 0" class="sales-section">
        <!-- Mobile: Cards -->
        <div class="sales-grid-mobile">
          <div
            v-for="sale in saleList.sales.value"
            :key="sale.id"
            @click="goToSale(sale.id)"
            class="sale-card"
          >
            <div class="sale-card-content">
              <div class="sale-info">
                <div class="sale-header">
                  <div class="sale-date">{{ formatDate(sale.sale_date) }}</div>
                  <div class="sale-total">{{ formatCurrency(parseFloat(sale.total_amount)) }}</div>
                </div>

                <div class="sale-details">
                  <div class="detail-row">
                    <span class="detail-label">Cliente:</span>
                    <span class="detail-value">
                      <span v-if="sale.customer && sale.customer.name">
                        {{ sale.customer.name }}
                      </span>
                      <span v-else class="no-value">—</span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Vendedor:</span>
                    <span class="detail-value">
                      <span v-if="sale.user && sale.user.name">
                        {{ sale.user.name }}
                      </span>
                      <span v-else class="no-value">—</span>
                    </span>
                  </div>
                  <div v-if="sale.notes" class="detail-row">
                    <span class="detail-label">Observações:</span>
                    <span class="detail-value detail-notes">{{ sale.notes }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop: Table -->
        <div class="sales-table-desktop">
          <table class="data-table">
            <thead>
              <tr>
                <th
                  @click="handleSort('sale_date')"
                  class="sortable"
                >
                  Data da Venda {{ getSortIcon('sale_date') }}
                </th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th
                  @click="handleSort('total_amount')"
                  class="sortable"
                >
                  Total {{ getSortIcon('total_amount') }}
                </th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sale in saleList.sales.value"
                :key="sale.id"
                @click="goToSale(sale.id)"
                class="table-row"
              >
                <td class="table-date">{{ formatDate(sale.sale_date) }}</td>
                <td class="table-customer">
                  <span v-if="sale.customer && sale.customer.name">
                    {{ sale.customer.name }}
                  </span>
                  <span v-else-if="sale.customer_id" class="no-value">#{{ sale.customer_id }}</span>
                  <span v-else class="no-value">—</span>
                </td>
                <td class="table-seller">
                  <span v-if="sale.user && sale.user.name">
                    {{ sale.user.name }}
                  </span>
                  <span v-else class="no-value">#{{ sale.user_id }}</span>
                </td>
                <td class="table-total">{{ formatCurrency(parseFloat(sale.total_amount)) }}</td>
                <td class="table-notes">{{ sale.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrapper">
          <Pagination
            :current-page="saleList.currentPage.value"
            :last-page="saleList.lastPage.value"
            :total="saleList.total.value"
            :per-page="saleList.perPage.value"
            @update:page="saleList.setPage"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-card">
          <p class="empty-title">Nenhuma venda encontrada</p>
          <p class="empty-text">
            Tente ajustar os filtros de busca ou criar uma nova venda.
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

.sales-page {
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

.store-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: -24px 0 24px 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
}

.store-hint strong {
  color: #ffd700;
  font-weight: 800;
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

.filter-date {
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

input[type="date"].input-field {
  color-scheme: dark;
}

input[type="date"].input-field::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
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

.btn-new-sale {
  width: 100%;
}

@media (min-width: 640px) {
  .btn-new-sale {
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
   SALES GRID (MOBILE)
   ============================================ */

.sales-section {
  margin-bottom: 48px;
}

.sales-grid-mobile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .sales-grid-mobile {
    display: none;
  }
}

.sale-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

.sale-card:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3), 0 0 60px rgba(231, 0, 0, 0.1);
  transform: translateY(-2px);
}

.sale-card-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sale-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sale-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sale-date {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.sale-total {
  font-size: 24px;
  font-weight: 700;
  color: #FFD700;
  text-align: right;
}

.sale-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (min-width: 480px) {
  .detail-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.detail-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.detail-value {
  font-size: 16px;
  color: #FFFFFF;
  font-weight: 500;
  text-align: right;
}

@media (min-width: 480px) {
  .detail-value {
    text-align: left;
  }
}

.detail-notes {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.no-value {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* ============================================
   SALES TABLE (DESKTOP)
   ============================================ */

.sales-table-desktop {
  display: none;
}

@media (min-width: 768px) {
  .sales-table-desktop {
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
  cursor: pointer;
  transition: background 0.2s ease;
}

.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.data-table tbody tr:last-child {
  border-bottom: none;
}

.data-table td {
  padding: 24px 32px;
  font-size: 16px;
}

.table-date {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.table-customer,
.table-seller {
  color: #FFFFFF;
  font-weight: 500;
}

.table-total {
  font-weight: 700;
  color: #FFD700;
  font-size: 18px;
}

.table-notes {
  color: rgba(255, 255, 255, 0.7);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
input:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
