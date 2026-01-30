<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/composables/useStoreContext'
import { getSales } from '@/api/endpoints/sales'
import FinancialDemoSection from '@/components/domain/FinancialDemoSection.vue'
import type { Sale } from '@/api/types'

const router = useRouter()
const authStore = useAuthStore()
const storeContext = useStoreContext()

// State
const recentSales = ref<Sale[]>([])
const loadingSales = ref(false)
const salesError = ref<string | null>(null)

// Load recent sales
async function loadRecentSales() {
  const storeId = storeContext.storeId.value
  if (!storeId) {
    recentSales.value = []
    return
  }

  loadingSales.value = true
  salesError.value = null

  try {
    const response = await getSales(storeId, {
      per_page: 5,
      sort_by: 'sale_date',
      sort_order: 'desc',
    })
    recentSales.value = response.data || []
  } catch (err) {
    console.error('Erro ao carregar últimas vendas:', err)
    salesError.value = err instanceof Error ? err.message : 'Erro ao carregar vendas'
    recentSales.value = []
  } finally {
    loadingSales.value = false
  }
}

// Watch storeId changes
watch(
  () => storeContext.storeId.value,
  () => {
    loadRecentSales()
  }
)

onMounted(() => {
  loadRecentSales()
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

function goToSale(saleId: number) {
  const storeId = storeContext.storeId.value
  if (storeId) {
    router.push(`/stores/${storeId}/sales/${saleId}`)
  }
}

function goToSales() {
  const storeId = storeContext.storeId.value
  if (storeId) {
    router.push(`/stores/${storeId}/sales`)
  }
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
  }
  return labels[role] || role
}
</script>

<template>
  <div class="home-page">
    <!-- Background orbs decorativos -->
    <div class="background-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="orb orb-4"></div>
    </div>

    <!-- Container principal -->
    <div class="page-container">
      <!-- Welcome Card -->
      <div class="welcome-card">
        <h1 class="welcome-title">
          Bem-vindo{{ authStore.user ? `, ${authStore.user.name}` : ' ao Boss Pods' }}
        </h1>
        <div v-if="authStore.user" class="user-info">
          <div class="info-row">
            <span class="info-label">Função:</span>
            <span class="info-value role-value">{{ getRoleLabel(authStore.user.role) }}</span>
          </div>
          <div v-if="storeContext.currentStoreName" class="info-row">
            <span class="info-label">Loja atual:</span>
            <span class="info-value store-value">{{ storeContext.currentStoreName }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Sales Card -->
      <div v-if="storeContext.storeId" class="sales-card">
        <div class="sales-header">
          <h2 class="sales-title">Últimas Vendas</h2>
          <button @click="goToSales" class="btn-view-all" v-if="recentSales.length > 0">
            Ver todas
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loadingSales" class="loading-state">
          <p class="loading-text">Carregando vendas...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="salesError" class="error-state">
          <p class="error-text">{{ salesError }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="recentSales.length === 0" class="empty-state">
          <p class="empty-text">Nenhuma venda registrada ainda.</p>
        </div>

        <!-- Sales List -->
        <div v-else class="sales-list">
          <!-- Mobile: Cards -->
          <div class="sales-grid-mobile">
            <div
              v-for="sale in recentSales"
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
                  <div class="detail-row">
                    <span class="detail-label">Vendedor:</span>
                    <span class="detail-value">
                      <span v-if="sale.user && sale.user.name">
                        {{ sale.user.name }}
                      </span>
                      <span v-else class="no-value">—</span>
                    </span>
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
                  <th>Vendedor</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="sale in recentSales"
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
                  <td class="table-seller">
                    <span v-if="sale.user && sale.user.name">
                      {{ sale.user.name }}
                    </span>
                    <span v-else class="no-value">—</span>
                  </td>
                  <td class="table-total">{{ formatCurrency(parseFloat(sale.total_amount)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- No Store Selected -->
      <div v-else class="no-store-card">
        <p class="no-store-text">Selecione uma loja para visualizar as últimas vendas.</p>
      </div>

      <!-- Demonstração Financeira (mock) -->
      <FinancialDemoSection />
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.home-page {
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
   WELCOME CARD
   ============================================ */

.welcome-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
  margin-bottom: 32px;
}

@media (min-width: 640px) {
  .welcome-card {
    padding: 40px;
    margin-bottom: 40px;
  }
}

.welcome-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  margin: 0 0 24px 0;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 640px) {
  .welcome-title {
    font-size: 36px;
    margin-bottom: 32px;
  }
}

@media (min-width: 1024px) {
  .welcome-title {
    font-size: 48px;
  }
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 640px) {
  .user-info {
    flex-direction: row;
    gap: 32px;
  }
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.info-value {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

@media (min-width: 640px) {
  .info-label,
  .info-value {
    font-size: 18px;
  }
}

.role-value {
  text-transform: capitalize;
  color: #FFD700;
}

.store-value {
  color: #FF7F00;
}

/* ============================================
   SALES CARD
   ============================================ */

.sales-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .sales-card {
    padding: 40px;
  }
}

.sales-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
}

@media (min-width: 640px) {
  .sales-header {
    margin-bottom: 40px;
  }
}

.sales-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #FFFFFF;
  margin: 0;
}

@media (min-width: 640px) {
  .sales-title {
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
  margin: 0;
}

.error-text {
  color: #FCA5A5;
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

.table-customer,
.table-seller {
  font-weight: 500;
}

.table-total {
  font-weight: 700;
  color: #FFD700;
}

.no-value {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* ============================================
   NO STORE CARD
   ============================================ */

.no-store-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 48px 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
  text-align: center;
}

@media (min-width: 640px) {
  .no-store-card {
    padding: 56px 40px;
  }
}

.no-store-text {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
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
