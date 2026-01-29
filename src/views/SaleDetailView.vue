<script setup lang="ts">
/**
 * Sale Detail View
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: items, customer, user, total_amount (read-only)
 */

import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSale } from '@/api/endpoints/sales'
import type { Sale } from '@/api/types'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'

const route = useRoute()
const router = useRouter()

const saleId = Number(route.params.id)
const { effectiveStoreId, routeStoreId } = useEffectiveStoreId()
const storeId = computed(() => effectiveStoreId.value ?? 0)

// State
const sale = ref<Sale | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Load sale
async function loadSale() {
  loading.value = true
  error.value = null

  try {
    if (!storeId.value) throw new Error('Loja inválida')
    sale.value = await getSale(storeId.value, saleId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar venda'
    if (err instanceof Error && err.message.includes('404')) {
      router.push(`/stores/${storeId.value}/sales`)
    }
  } finally {
    loading.value = false
  }
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

function getProductLabel(item: any): string {
  // Verificar se há dados do produto aninhados (pode variar conforme a API)
  if (item.store_product?.product) {
    const p = item.store_product.product
    return `${p.brand} ${p.name} - ${p.flavor}`
  }
  // Fallback: mostrar apenas o ID do produto
  return `Produto #${item.store_product_id}`
}

onMounted(() => {
  loadSale()
})

// Se mudar o store efetivo (admin via seletor), manter URL alinhada e recarregar
watch(effectiveStoreId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  if (routeStoreId.value !== newId) {
    router.replace({ path: `/stores/${newId}/sales/${saleId}` })
  }
  loadSale()
})
</script>

<template>
  <div class="sale-detail-page">
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
        <button @click="router.push(`/stores/${storeId}/sales`)" class="btn-back">
          <span class="btn-back-icon">←</span>
          <span>Voltar</span>
        </button>
        <h1 class="page-title">Detalhes da Venda</h1>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-card">
          <p class="loading-text">Carregando detalhes da venda...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <div class="error-card">
          <p class="error-text">{{ error }}</p>
        </div>
      </div>

      <!-- Sale Details -->
      <div v-else-if="sale" class="sale-details">
        <!-- Sale Info Card -->
        <div class="info-card">
          <h2 class="card-title">Informações da Venda</h2>
          <div class="info-grid">
            <div class="info-item">
              <label class="info-label">Data da Venda</label>
              <p class="info-value">{{ formatDate(sale.sale_date) }}</p>
            </div>
            <div class="info-item">
              <label class="info-label">Cliente</label>
              <p v-if="sale.customer" class="info-value">
                {{ sale.customer.name }} - {{ sale.customer.phone }}
              </p>
              <p v-else class="info-value no-value">—</p>
            </div>
            <div class="info-item">
              <label class="info-label">Vendedor</label>
              <p v-if="sale.user" class="info-value">{{ sale.user.name }}</p>
              <p v-else class="info-value no-value">—</p>
            </div>
            <div class="info-item">
              <label class="info-label">Total</label>
              <p class="info-value total-amount">{{ formatCurrency(parseFloat(sale.total_amount)) }}</p>
            </div>
            <div v-if="sale.notes" class="info-item full-width">
              <label class="info-label">Observações</label>
              <p class="info-value">{{ sale.notes }}</p>
            </div>
          </div>
        </div>

        <!-- Items Card -->
        <div v-if="sale.items && sale.items.length > 0" class="items-card">
          <h2 class="card-title">Itens da Venda</h2>
          
          <!-- Mobile: Cards -->
          <div class="items-grid-mobile">
            <div
              v-for="item in sale.items"
              :key="item.id"
              class="item-card"
            >
              <div class="item-header">
                <div class="item-product">{{ getProductLabel(item) }}</div>
                <div class="item-subtotal">{{ formatCurrency(parseFloat(item.subtotal)) }}</div>
              </div>
              <div class="item-details">
                <div class="item-detail-row">
                  <span class="item-detail-label">Quantidade:</span>
                  <span class="item-detail-value">{{ item.quantity }}</span>
                </div>
                <div class="item-detail-row">
                  <span class="item-detail-label">Preço Unitário:</span>
                  <span class="item-detail-value">{{ formatCurrency(parseFloat(item.unit_price)) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Table -->
          <div class="items-table-desktop">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Preço Unitário</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in sale.items" :key="item.id">
                  <td class="table-product">{{ getProductLabel(item) }}</td>
                  <td class="table-quantity">{{ item.quantity }}</td>
                  <td class="table-price">{{ formatCurrency(parseFloat(item.unit_price)) }}</td>
                  <td class="table-subtotal">{{ formatCurrency(parseFloat(item.subtotal)) }}</td>
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

.sale-detail-page {
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
  max-width: 1000px;
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
}

@media (min-width: 640px) {
  .page-header {
    flex-direction: row;
    align-items: center;
    gap: 24px;
    margin-bottom: 48px;
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
   LOADING & ERROR STATES
   ============================================ */

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 0;
}

.loading-card,
.error-card {
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
  .error-card {
    padding: 56px 64px;
  }
}

.loading-text {
  font-size: 18px;
  font-weight: 500;
  color: #FFFFFF;
  margin: 0;
}

.error-text {
  font-size: 18px;
  font-weight: 500;
  color: #FCA5A5;
  margin: 0;
}

/* ============================================
   SALE DETAILS
   ============================================ */

.sale-details {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

@media (min-width: 640px) {
  .sale-details {
    gap: 40px;
  }
}

/* ============================================
   INFO CARD
   ============================================ */

.info-card,
.items-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .info-card,
  .items-card {
    padding: 40px;
  }
}

.card-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #FFFFFF;
  margin: 0 0 32px 0;
}

@media (min-width: 640px) {
  .card-title {
    font-size: 28px;
    margin-bottom: 40px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 640px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: #FFFFFF;
  margin: 0;
}

@media (min-width: 640px) {
  .info-value {
    font-size: 20px;
  }
}

.info-value.no-value {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.info-value.total-amount {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 640px) {
  .info-value.total-amount {
    font-size: 28px;
  }
}

/* ============================================
   ITEMS CARD - MOBILE
   ============================================ */

.items-grid-mobile {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 1024px) {
  .items-grid-mobile {
    display: none;
  }
}

.item-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s ease;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.item-product {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  flex: 1;
}

.item-subtotal {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #FFD700;
  white-space: nowrap;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.item-detail-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.item-detail-value {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

/* ============================================
   ITEMS CARD - DESKTOP TABLE
   ============================================ */

.items-table-desktop {
  display: none;
}

@media (min-width: 1024px) {
  .items-table-desktop {
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

.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.table-product {
  font-weight: 600;
}

.table-quantity,
.table-price {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.table-subtotal {
  font-weight: 700;
  color: #FFD700;
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
