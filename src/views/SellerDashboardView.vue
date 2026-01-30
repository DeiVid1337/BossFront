<script setup lang="ts">
/**
 * Seller Dashboard View
 * Dashboard específico para vendedores com estatísticas e acesso rápido
 * Seguindo Frontend.md: apenas orquestração, lógica no composable
 */

import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/composables/useStoreContext'
import { useSellerSales } from '@/composables/useSellerSales'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const storeContext = useStoreContext()

const storeId = computed(() => {
  const id = storeContext.storeId.value
  if (!id) {
    return null
  }
  return id
})

// Inicializar composable com storeId reativo (aceita number | null)
const sellerSales = useSellerSales(storeId)
const recentSales = computed(() => sellerSales.sales.value ?? [])
const todayRevenueFormatted = computed(() => formatCurrency(sellerSales.todayRevenue.value))
const monthRevenueFormatted = computed(() => formatCurrency(sellerSales.monthRevenue.value))

// Watch storeId para recarregar quando mudar
watch(storeId, async (newStoreId) => {
  if (!newStoreId) {
    router.push('/')
    return
  }
  
  // Recarregar dados quando storeId mudar
  await Promise.all([
    sellerSales.loadSales(),
    sellerSales.loadStats(),
  ])
})

// Carregar dados ao montar
onMounted(async () => {
  if (storeId.value) {
    await Promise.all([
      sellerSales.loadSales(),
      sellerSales.loadStats(),
    ])
  } else {
    router.push('/')
  }
})

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

function goToNewSale() {
  if (storeId.value) {
    router.push(`/stores/${storeId.value}/sales/new`)
  }
}

function goToSales() {
  if (storeId.value) {
    router.push(`/stores/${storeId.value}/sales`)
  }
}

function goToSale(saleId: number) {
  if (storeId.value) {
    router.push(`/stores/${storeId.value}/sales/${saleId}`)
  }
}
</script>

<template>
  <div class="seller-dashboard-page">
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
        <h1 class="page-title">Dashboard</h1>
        <button @click="goToNewSale" class="btn-new-sale">
          <span class="btn-icon">➕</span>
          <span>Nova Venda</span>
        </button>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <!-- Vendas de Hoje -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon">📊</span>
            <h3 class="stat-title">Vendas de Hoje</h3>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ sellerSales.todayCount }}</div>
            <div class="stat-label">vendas</div>
            <div class="stat-amount">{{ todayRevenueFormatted }}</div>
          </div>
        </div>

        <!-- Vendas do Mês -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon">📅</span>
            <h3 class="stat-title">Vendas do Mês</h3>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ sellerSales.monthCount }}</div>
            <div class="stat-label">vendas</div>
            <div class="stat-amount">{{ monthRevenueFormatted }}</div>
          </div>
        </div>

        <!-- Total de Vendas -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon">💰</span>
            <h3 class="stat-title">Total de Vendas</h3>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ sellerSales.total }}</div>
            <div class="stat-label">vendas registradas</div>
          </div>
        </div>
      </div>

      <!-- Recent Sales Card -->
      <div class="recent-sales-card">
        <div class="card-header">
          <h2 class="card-title">Últimas Vendas</h2>
          <button @click="goToSales" class="btn-view-all">
            Ver todas
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="sellerSales.loading" class="loading-state">
          <p class="loading-text">Carregando vendas...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="sellerSales.error" class="error-state">
          <p class="error-text">{{ sellerSales.error }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="recentSales.length === 0" class="empty-state">
          <p class="empty-text">Nenhuma venda registrada ainda.</p>
          <button @click="goToNewSale" class="btn-primary-empty">
            Criar Primeira Venda
          </button>
        </div>

        <!-- Sales List -->
        <div v-else class="sales-list">
          <!-- Mobile: Cards -->
          <div class="sales-grid-mobile">
            <div
              v-for="sale in recentSales.slice(0, 5)"
              :key="sale.id"
              @click="goToSale(sale.id)"
              class="sale-card"
            >
              <div class="sale-card-content">
                <div class="sale-header-row">
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
                  <div v-if="sale.notes" class="detail-row">
                    <span class="detail-label">Observações:</span>
                    <span class="detail-value detail-notes">{{ sale.notes }}</span>
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
                  <th>Data da Venda</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="sale in recentSales.slice(0, 5)"
                  :key="sale.id"
                  @click="goToSale(sale.id)"
                  class="table-row"
                >
                  <td class="table-date">{{ formatDate(sale.sale_date) }}</td>
                  <td class="table-customer">
                    <span v-if="sale.customer && sale.customer.name">
                      {{ sale.customer.name }}
                    </span>
                    <span v-else class="no-value">—</span>
                  </td>
                  <td class="table-total">{{ formatCurrency(parseFloat(sale.total_amount)) }}</td>
                  <td class="table-notes">{{ sale.notes || '—' }}</td>
                </tr>
              </tbody>
            </table>
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

.seller-dashboard-page {
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
  margin-bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: flex-start;
}

@media (min-width: 640px) {
  .page-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 48px;
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

.btn-new-sale {
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
}

@media (min-width: 640px) {
  .btn-new-sale {
    width: auto;
    padding: 18px 40px;
    font-size: 20px;
  }
}

.btn-new-sale:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35), 0 0 30px rgba(231, 0, 0, 0.15);
}

.btn-new-sale:active {
  transform: translateY(0);
}

.btn-new-sale:focus {
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
   STATISTICS GRID
   ============================================ */

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 40px;
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .stat-card {
    padding: 40px;
  }
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-icon {
  font-size: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stat-title {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

@media (min-width: 640px) {
  .stat-title {
    font-size: 20px;
  }
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-value {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 36px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.2;
}

@media (min-width: 640px) {
  .stat-value {
    font-size: 44px;
  }
}

.stat-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.stat-amount {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-top: 8px;
}

@media (min-width: 640px) {
  .stat-amount {
    font-size: 28px;
  }
}

/* ============================================
   RECENT SALES CARD
   ============================================ */

.recent-sales-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .recent-sales-card {
    padding: 40px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
}

@media (min-width: 640px) {
  .card-header {
    margin-bottom: 40px;
  }
}

.card-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #FFFFFF;
  margin: 0;
}

@media (min-width: 640px) {
  .card-title {
    font-size: 28px;
  }
}

.btn-view-all {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  padding: 10px 20px;
  min-height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-view-all:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-view-all:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
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
  margin: 0 0 24px 0;
}

.error-text {
  color: #FCA5A5;
}

.btn-primary-empty {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 700;
  border-radius: 16px;
  padding: 16px 32px;
  min-height: 48px;
  border: none;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25);
}

.btn-primary-empty:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35);
}

.btn-primary-empty:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

/* ============================================
   SALES LIST - MOBILE
   ============================================ */

.sales-grid-mobile {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 1024px) {
  .sales-grid-mobile {
    display: none;
  }
}

.sale-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sale-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.sale-card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sale-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sale-date {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.sale-total {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #FFD700;
  white-space: nowrap;
}

.sale-details {
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

.detail-value .no-value {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.detail-notes {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
}

/* ============================================
   SALES LIST - DESKTOP TABLE
   ============================================ */

.sales-table-desktop {
  display: none;
}

@media (min-width: 1024px) {
  .sales-table-desktop {
    display: block;
    overflow-x: auto;
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

.table-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.table-date {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.table-customer {
  font-weight: 500;
}

.table-total {
  font-weight: 700;
  color: #FFD700;
}

.table-notes {
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.no-value {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
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

button:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
