<script setup lang="ts">
/**
 * Customers List View
 * Seguindo Frontend.md: apenas orquestração, lógica no composable
 * Seguindo DevGuide.md: busca, filtro por telefone, ordenação, paginação
 */

import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCustomerList } from '@/composables/useCustomerList'
import Pagination from '@/components/ui/Pagination.vue'

const router = useRouter()
const authStore = useAuthStore()
const customerList = useCustomerList()

const isAdmin = computed(() => authStore.user?.role === 'admin')
const isManager = computed(() => authStore.user?.role === 'manager')
const canEdit = computed(() => isAdmin.value || isManager.value)

// Carregar clientes ao montar
onMounted(() => {
  customerList.loadCustomers()
})

// Observar mudanças na página
watch(
  () => customerList.currentPage.value,
  (newPage, oldPage) => {
    if (newPage !== oldPage && oldPage !== undefined) {
      customerList.loadCustomers()
    }
  }
)

// Handlers
function handleSearch() {
  customerList.applyFilters()
}

function handleFilterChange() {
  customerList.applyFilters()
}

function handleSort(field: 'name' | 'phone' | 'total_purchases' | 'created_at') {
  customerList.setSort(field)
}

function goToCustomer(id: number) {
  router.push(`/customers/${id}`)
}

function goToCreate() {
  router.push('/customers/new')
}

function goToEdit(id: number) {
  router.push(`/customers/${id}/edit`)
}

function getSortIcon(field: 'name' | 'phone' | 'total_purchases' | 'created_at'): string {
  if (customerList.sortBy.value !== field) return '⇅'
  return customerList.sortOrder.value === 'asc' ? '↑' : '↓'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
</script>

<template>
  <div class="customers-page">
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
          <h1 class="page-title">Clientes</h1>
          <button
            @click="goToCreate"
            class="btn-primary btn-new-customer"
          >
            <span class="btn-icon">+</span>
            <span>Novo Cliente</span>
          </button>
        </div>

        <!-- Filtros -->
        <div class="filters-card">
          <!-- Busca -->
          <div class="filter-row">
            <input
              :value="customerList.search.value"
              @input="e => { customerList.search.value = (e.target as HTMLInputElement).value }"
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

          <!-- Filtro por telefone -->
          <div class="filter-row">
            <input
              :value="customerList.phone.value"
              @input="e => { customerList.phone.value = (e.target as HTMLInputElement).value }"
              type="text"
              placeholder="Filtrar por telefone..."
              class="input-field"
              @keyup.enter="handleFilterChange"
            />
            <button
              @click="customerList.clearFilters"
              class="btn-secondary"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="customerList.loading.value" class="loading-state">
        <div class="loading-card">
          <p class="loading-text">Carregando clientes...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="customerList.error.value"
        class="error-state"
      >
        <p class="error-text">{{ customerList.error.value }}</p>
      </div>

      <!-- Customers List -->
      <div v-else-if="customerList.customers.value.length > 0" class="customers-section">
        <!-- Mobile: Cards -->
        <div class="customers-grid-mobile">
          <div
            v-for="customer in customerList.customers.value"
            :key="customer.id"
            @click="goToCustomer(customer.id)"
            class="customer-card"
          >
            <div class="customer-card-content">
              <div class="customer-info">
                <div class="customer-name">{{ customer.name }}</div>
                <div class="customer-phone">{{ customer.phone }}</div>
                <div class="customer-stats">
                  <div class="stat-row">
                    <span class="stat-label">Total de Compras:</span>
                    <span class="stat-value">{{ formatCurrency(customer.total_purchases) }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Cadastrado em:</span>
                    <span class="stat-value">{{ new Date(customer.created_at).toLocaleDateString('pt-BR') }}</span>
                  </div>
                </div>
              </div>
              <button
                v-if="canEdit"
                @click.stop="goToEdit(customer.id)"
                class="btn-edit"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        <!-- Desktop: Table -->
        <div class="customers-table-desktop">
          <table class="data-table">
            <thead>
              <tr>
                <th
                  @click="handleSort('name')"
                  class="sortable"
                >
                  Nome {{ getSortIcon('name') }}
                </th>
                <th
                  @click="handleSort('phone')"
                  class="sortable"
                >
                  Telefone {{ getSortIcon('phone') }}
                </th>
                <th
                  @click="handleSort('total_purchases')"
                  class="sortable"
                >
                  Total de Compras {{ getSortIcon('total_purchases') }}
                </th>
                <th
                  @click="handleSort('created_at')"
                  class="sortable"
                >
                  Data de Cadastro {{ getSortIcon('created_at') }}
                </th>
                <th v-if="canEdit">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="customer in customerList.customers.value"
                :key="customer.id"
                @click="goToCustomer(customer.id)"
                class="table-row"
              >
                <td class="table-name">{{ customer.name }}</td>
                <td class="table-phone">{{ customer.phone }}</td>
                <td class="table-total">{{ formatCurrency(customer.total_purchases) }}</td>
                <td class="table-date">
                  {{ new Date(customer.created_at).toLocaleDateString('pt-BR') }}
                </td>
                <td v-if="canEdit" @click.stop class="table-actions">
                  <button
                    @click="goToEdit(customer.id)"
                    class="btn-edit-small"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrapper">
          <Pagination
            :current-page="customerList.currentPage.value"
            :last-page="customerList.lastPage.value"
            :total="customerList.total.value"
            :per-page="customerList.perPage.value"
            @update:page="customerList.setPage"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-card">
          <p class="empty-title">Nenhum cliente encontrado</p>
          <p class="empty-text">
            Tente ajustar os filtros de busca ou criar um novo cliente.
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

.customers-page {
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
  gap: 32px;
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

.btn-new-customer {
  width: 100%;
}

@media (min-width: 640px) {
  .btn-new-customer {
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
   CUSTOMERS GRID (MOBILE)
   ============================================ */

.customers-section {
  margin-bottom: 48px;
}

.customers-grid-mobile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .customers-grid-mobile {
    display: none;
  }
}

.customer-card {
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

.customer-card:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3), 0 0 60px rgba(231, 0, 0, 0.1);
  transform: translateY(-2px);
}

.customer-card-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.customer-name {
  font-size: 22px;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.3;
}

.customer-phone {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

.customer-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.stat-value {
  font-size: 16px;
  color: #FFFFFF;
  font-weight: 600;
}

.stat-value:first-of-type {
  color: #FFD700;
  font-weight: 700;
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
   CUSTOMERS TABLE (DESKTOP)
   ============================================ */

.customers-table-desktop {
  display: none;
}

@media (min-width: 768px) {
  .customers-table-desktop {
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

.table-name {
  font-weight: 600;
  color: #FFFFFF;
}

.table-phone {
  color: rgba(255, 255, 255, 0.8);
}

.table-total {
  font-weight: 700;
  color: #FFD700;
  font-size: 18px;
}

.table-date {
  color: rgba(255, 255, 255, 0.8);
}

.table-actions {
  padding: 24px 32px;
}

.btn-edit-small {
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
  transition: all 0.2s ease;
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
input:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
