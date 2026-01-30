<script setup lang="ts">
/**
 * Seller Stock Management View
 * Lista de vendedores com opção de modificar estoque/inventário
 * Seguindo Frontend.md: apenas orquestração, lógica no composable
 */

import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserList } from '@/composables/useUserList'
import Pagination from '@/components/ui/Pagination.vue'

const router = useRouter()
const authStore = useAuthStore()
const userList = useUserList()

// Filtrar apenas vendedores
const isAdmin = computed(() => authStore.user?.role === 'admin')

// Configurar filtros para mostrar apenas sellers
onMounted(async () => {
  userList.role.value = 'seller'
  await userList.loadUsers()
})

// Observar mudanças na página
watch(
  () => userList.currentPage.value,
  (newPage, oldPage) => {
    if (newPage !== oldPage && oldPage !== undefined) {
      userList.loadUsers()
    }
  }
)

// Handlers
function handleSearch() {
  userList.applyFilters()
}

function handleFilterChange() {
  userList.applyFilters()
}

function goToSellerStock(sellerId: number, storeId: number | null) {
  if (storeId) {
    router.push(`/seller-stock-management/${sellerId}/stores/${storeId}/inventory`)
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
  <div class="seller-stock-management-page">
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
          <h1 class="page-title">Estoque Vendedor</h1>
          <p class="page-subtitle">Gerencie o estoque e inventário de cada vendedor</p>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="filters-card">
        <div class="filters-content">
          <!-- Search -->
          <div class="filter-group">
            <label class="filter-label">Buscar</label>
            <input
              v-model="userList.search.value"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Buscar por nome ou email..."
              class="filter-input"
            />
          </div>

          <!-- Status Filter -->
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select
              v-model="userList.isActive.value"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option :value="undefined">Todos</option>
              <option :value="true">Ativos</option>
              <option :value="false">Inativos</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button @click="handleSearch" class="btn-filter">
              🔍 Buscar
            </button>
            <button @click="userList.clearFilters" class="btn-clear">
              Limpar
            </button>
          </div>
        </div>
      </div>

      <!-- Sellers List -->
      <div class="sellers-card">
        <!-- Loading State -->
        <div v-if="userList.loading.value" class="loading-state">
          <p class="loading-text">Carregando vendedores...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="userList.error.value" class="error-state">
          <p class="error-text">{{ userList.error.value }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="userList.users.value.length === 0" class="empty-state">
          <p class="empty-text">Nenhum vendedor encontrado.</p>
        </div>

        <!-- Sellers List -->
        <div v-else class="sellers-list">
          <!-- Mobile: Cards -->
          <div class="sellers-grid-mobile">
            <div
              v-for="seller in userList.users.value"
              :key="seller.id"
              class="seller-card"
            >
              <div class="seller-card-content">
                <div class="seller-header">
                  <div class="seller-info">
                    <h3 class="seller-name">{{ seller.name }}</h3>
                    <p class="seller-email">{{ seller.email }}</p>
                  </div>
                  <div
                    :class="[
                      'status-badge',
                      seller.is_active ? 'status-badge-active' : 'status-badge-inactive'
                    ]"
                  >
                    {{ seller.is_active ? 'Ativo' : 'Inativo' }}
                  </div>
                </div>
                <div class="seller-details">
                  <div class="detail-row">
                    <span class="detail-label">Loja:</span>
                    <span class="detail-value">
                      {{ seller.store_id ? `Loja #${seller.store_id}` : 'Sem loja atribuída' }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Role:</span>
                    <span class="detail-value">{{ getRoleLabel(seller.role) }}</span>
                  </div>
                </div>
                <div class="seller-action">
                  <button
                    @click="goToSellerStock(seller.id, seller.store_id)"
                    :disabled="!seller.store_id || !seller.is_active"
                    class="btn-manage-stock"
                  >
                    <span class="btn-icon">📦</span>
                    <span>Gerenciar Estoque</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Table -->
          <div class="sellers-table-desktop">
            <table class="sellers-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Loja</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="seller in userList.users.value"
                  :key="seller.id"
                  class="seller-row"
                >
                  <td class="seller-name-cell">
                    <div class="seller-name">{{ seller.name }}</div>
                  </td>
                  <td class="seller-email-cell">
                    <div class="seller-email">{{ seller.email }}</div>
                  </td>
                  <td class="seller-store-cell">
                    <div class="seller-store">
                      {{ seller.store_id ? `Loja #${seller.store_id}` : 'Sem loja' }}
                    </div>
                  </td>
                  <td class="seller-status-cell">
                    <div
                      :class="[
                        'status-badge',
                        seller.is_active ? 'status-badge-active' : 'status-badge-inactive'
                      ]"
                    >
                      {{ seller.is_active ? 'Ativo' : 'Inativo' }}
                    </div>
                  </td>
                  <td class="seller-actions-cell">
                    <button
                      @click="goToSellerStock(seller.id, seller.store_id)"
                      :disabled="!seller.store_id || !seller.is_active"
                      class="btn-manage-stock-table"
                    >
                      <span class="btn-icon">📦</span>
                      <span>Gerenciar Estoque</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="userList.users.value.length > 0" class="pagination-section">
          <Pagination
            :current-page="userList.currentPage.value"
            :last-page="userList.lastPage.value"
            :total="userList.total.value"
            :per-page="userList.perPage.value"
            @update:page="(page: number) => { userList.setPage(page); userList.loadUsers() }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.seller-stock-management-page {
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

/* ============================================
   HEADER SECTION
   ============================================ */

.page-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .filters-content {
    flex-direction: row;
    align-items: flex-end;
    gap: 16px;
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

.filter-input,
.filter-select {
  width: 100%;
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
}

.btn-filter,
.btn-clear {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  white-space: nowrap;
}

.btn-filter {
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25), 0 0 20px rgba(231, 0, 0, 0.1);
}

.btn-filter:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35), 0 0 30px rgba(231, 0, 0, 0.15);
}

.btn-clear:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

/* ============================================
   SELLERS CARD
   ============================================ */

.sellers-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .sellers-card {
    padding: 32px;
  }
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 64px 32px;
}

.loading-text,
.error-text,
.empty-text {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.error-text {
  color: #FCA5A5;
}

/* ============================================
   SELLERS LIST - MOBILE CARDS
   ============================================ */

.sellers-grid-mobile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 1024px) {
  .sellers-grid-mobile {
    display: none;
  }
}

.seller-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s ease;
}

.seller-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.seller-card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.seller-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.seller-info {
  flex: 1;
}

.seller-name {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 4px 0;
}

.seller-email {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.status-badge {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  white-space: nowrap;
}

.status-badge-active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ADE80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.status-badge-inactive {
  background: rgba(239, 68, 68, 0.2);
  color: #FCA5A5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.seller-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.detail-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.detail-value {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
}

.seller-action {
  margin-top: 8px;
}

.btn-manage-stock {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 700;
  padding: 16px 24px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 56px;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25), 0 0 20px rgba(231, 0, 0, 0.1);
}

.btn-manage-stock:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35), 0 0 30px rgba(231, 0, 0, 0.15);
}

.btn-manage-stock:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 20px;
}

/* ============================================
   SELLERS LIST - DESKTOP TABLE
   ============================================ */

.sellers-table-desktop {
  display: none;
}

@media (min-width: 1024px) {
  .sellers-table-desktop {
    display: block;
    overflow-x: auto;
  }
}

.sellers-table {
  width: 100%;
  border-collapse: collapse;
}

.sellers-table thead {
  background: rgba(255, 255, 255, 0.05);
}

.sellers-table th {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-align: left;
  padding: 16px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.seller-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s ease;
}

.seller-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.seller-row td {
  padding: 20px 16px;
}

.seller-name-cell,
.seller-email-cell,
.seller-store-cell {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  color: #FFFFFF;
}

.seller-name {
  font-weight: 700;
  margin: 0;
}

.seller-email {
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.seller-store {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.seller-status-cell {
  text-align: center;
}

.seller-actions-cell {
  text-align: right;
}

.btn-manage-stock-table {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(231, 0, 0, 0.25);
}

.btn-manage-stock-table:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 0, 0, 0.35);
}

.btn-manage-stock-table:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============================================
   PAGINATION
   ============================================ */

.pagination-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
