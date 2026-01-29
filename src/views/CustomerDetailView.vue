<script setup lang="ts">
/**
 * Customer Detail View
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: name, phone, total_purchases. Opcional: sales history via ?include=sales
 */

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCustomer } from '@/api/endpoints/customers'
import type { Customer } from '@/api/types'

const route = useRoute()
const router = useRouter()

const customerId = Number(route.params.id)

// State
const customer = ref<Customer | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const includeSales = ref(true) // Por padrão, incluir histórico de vendas

// Load customer
async function loadCustomer() {
  loading.value = true
  error.value = null

  try {
    customer.value = await getCustomer(customerId, includeSales.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cliente'
    if (err instanceof Error && err.message.includes('404')) {
      router.push('/customers')
    }
  } finally {
    loading.value = false
  }
}

function goToEdit() {
  router.push(`/customers/${customerId}/edit`)
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

onMounted(() => {
  loadCustomer()
})
</script>

<template>
  <div class="customer-detail-view">
    <div class="page-header">
      <button @click="router.push('/customers')" class="btn-back">← Voltar</button>
      <h1>Detalhes do Cliente</h1>
      <button @click="goToEdit" class="btn-primary">Editar</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-message">Carregando...</div>

    <!-- Error -->
    <div v-else-if="error" class="error-message">{{ error }}</div>

    <!-- Customer Details -->
    <div v-else-if="customer" class="customer-details">
      <!-- Customer Info Card -->
      <div class="info-card">
        <h2>Informações do Cliente</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Nome</label>
            <p>{{ customer.name }}</p>
          </div>
          <div class="info-item">
            <label>Telefone</label>
            <p>{{ customer.phone }}</p>
          </div>
          <div class="info-item">
            <label>Total de Compras</label>
            <p class="total-purchases">{{ formatCurrency(customer.total_purchases) }}</p>
          </div>
          <div class="info-item">
            <label>Data de Cadastro</label>
            <p>{{ formatDate(customer.created_at) }}</p>
          </div>
        </div>
      </div>

      <!-- Sales History -->
      <div v-if="customer.sales && customer.sales.length > 0" class="sales-history-card">
        <h2>Histórico de Vendas</h2>
        <table class="sales-table">
          <thead>
            <tr>
              <th>Data da Venda</th>
              <th>Valor Total</th>
              <th>Data de Criação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in customer.sales" :key="sale.id">
              <td>{{ formatDate(sale.sale_date) }}</td>
              <td class="sale-amount">{{ formatCurrency(parseFloat(sale.total_amount)) }}</td>
              <td>{{ formatDate(sale.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="customer.sales && customer.sales.length === 0" class="no-sales">
        <p>Este cliente ainda não realizou nenhuma compra.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-detail-view {
  max-width: 1000px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.page-header h1 {
  font-size: 2rem;
  color: #1a202c;
  margin: 0;
  flex: 1;
}

.btn-back {
  background: #e2e8f0;
  color: #4a5568;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-back:hover {
  background: #cbd5e0;
}

.btn-primary {
  background: #667eea;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #5568d3;
}

.loading-message {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.customer-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card,
.sales-history-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 2rem;
}

.info-card h2,
.sales-history-card h2 {
  font-size: 1.5rem;
  color: #1a202c;
  margin: 0 0 1.5rem 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-item p {
  font-size: 1.125rem;
  color: #2d3748;
  margin: 0;
}

.total-purchases {
  font-weight: 600;
  color: #667eea;
  font-size: 1.25rem;
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
}

.sales-table thead {
  background: #f7fafc;
}

.sales-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  border-bottom: 2px solid #e2e8f0;
}

.sales-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #2d3748;
}

.sale-amount {
  font-weight: 600;
  color: #667eea;
}

.no-sales {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 2rem;
  text-align: center;
  color: #718096;
}
</style>
