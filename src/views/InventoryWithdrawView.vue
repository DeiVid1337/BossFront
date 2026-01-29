<script setup lang="ts">
/**
 * Inventory Withdraw View
 * Tela para vendedores retirarem produtos do estoque da loja para seu inventário pessoal
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStoreProducts, withdrawInventory } from '@/api/endpoints/storeProducts'
import type { StoreProduct, WithdrawInventoryRequest } from '@/api/types'
import { ValidationError } from '@/api/types'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'
import { useStockSync } from '@/composables/useStockSync'

const route = useRoute()
const router = useRouter()

const { effectiveStoreId, routeStoreId, syncUrlToStore } = useEffectiveStoreId()
const storeId = computed(() => effectiveStoreId.value ?? 0)
const stockSync = useStockSync(effectiveStoreId)

// Store products
const storeProducts = ref<StoreProduct[]>([])
const loadingProducts = ref(false)
const productsError = ref<string | null>(null)
const productSearch = ref('')

// Selected items for withdraw
const selectedItems = ref<Map<number, number>>(new Map()) // store_product_id -> quantity

// UI state
const submitting = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// Load store products
async function loadStoreProducts() {
  loadingProducts.value = true
  productsError.value = null
  try {
    if (!storeId.value) {
      storeProducts.value = []
      productsError.value = 'Loja inválida'
      return
    }

    const response = await getStoreProducts(storeId.value, {
      per_page: 100,
      is_active: true,
    })

    if (response && typeof response === 'object' && 'data' in response) {
      const products = Array.isArray(response.data) ? response.data : []
      // Filtrar apenas produtos com available_quantity > 0
      storeProducts.value = products.filter(p => (p.available_quantity ?? 0) > 0)
    } else {
      productsError.value = 'Resposta da API em formato inesperado'
      storeProducts.value = []
    }
  } catch (err) {
    productsError.value = err instanceof Error ? err.message : 'Erro ao carregar produtos'
    storeProducts.value = []
  } finally {
    loadingProducts.value = false
  }
}

// Filtered products
const filteredProducts = computed(() => {
  if (!productSearch.value || !productSearch.value.trim()) {
    return storeProducts.value
  }
  const searchLower = productSearch.value.toLowerCase()
  return storeProducts.value.filter(
    p =>
      p.product?.name?.toLowerCase().includes(searchLower) ||
      p.product?.brand?.toLowerCase().includes(searchLower) ||
      p.product?.flavor?.toLowerCase().includes(searchLower)
  )
})

// Update quantity for a product
function updateQuantity(storeProductId: number, quantity: number) {
  if (quantity <= 0) {
    selectedItems.value.delete(storeProductId)
  } else {
    selectedItems.value.set(storeProductId, quantity)
  }
}

// Get selected quantity for a product
function getSelectedQuantity(storeProductId: number): number {
  return selectedItems.value.get(storeProductId) || 0
}

// Get total items selected
const totalItemsSelected = computed(() => {
  return Array.from(selectedItems.value.values()).reduce((sum, qty) => sum + qty, 0)
})

// Check if can submit
const canSubmit = computed(() => {
  return selectedItems.value.size > 0 && totalItemsSelected.value > 0
})

// Submit withdraw
async function handleSubmit() {
  if (!canSubmit.value) {
    error.value = 'Selecione pelo menos um produto para retirar.'
    return
  }

  submitting.value = true
  error.value = null
  success.value = null

  try {
    // Validar quantidades
    const invalidItems: string[] = []
    const items = Array.from(selectedItems.value.entries()).map(([storeProductId, quantity]) => {
      const product = storeProducts.value.find(p => p.id === storeProductId)
      if (!product) {
        invalidItems.push(`Produto #${storeProductId} não encontrado`)
        return null
      }

      const available = product.available_quantity ?? 0
      if (quantity > available) {
        invalidItems.push(
          `${getProductLabel(product)}: Quantidade solicitada (${quantity}) excede disponível (${available})`
        )
        return null
      }

      if (quantity <= 0) {
        invalidItems.push(`${getProductLabel(product)}: Quantidade deve ser maior que zero`)
        return null
      }

      return {
        store_product_id: storeProductId,
        quantity: quantity,
      }
    }).filter(item => item !== null) as Array<{ store_product_id: number; quantity: number }>

    if (invalidItems.length > 0) {
      error.value = `Erros de validação:\n${invalidItems.join('\n')}`
      submitting.value = false
      return
    }

    if (items.length === 0) {
      error.value = 'Nenhum item válido para retirar.'
      submitting.value = false
      return
    }

    const data: WithdrawInventoryRequest = {
      items: items,
    }

    await withdrawInventory(storeId.value, data)
    
    success.value = 'Produtos retirados com sucesso!'
    selectedItems.value.clear()

    stockSync.emitStockUpdated({ source: 'withdraw' })
    router.push(`/stores/${storeId.value}/sales/new`)
  } catch (err) {
    console.error('❌ Erro ao retirar produtos:', err)
    
    if (err instanceof ValidationError) {
      const validationErrors = err.validationErrors || err.errors || {}
      const errorMessages = Object.values(validationErrors).flat()
      error.value = errorMessages.join('. ') || err.message || 'Erro ao retirar produtos'
    } else if (err instanceof Error) {
      error.value = err.message || 'Erro ao retirar produtos'
    } else {
      error.value = 'Erro desconhecido ao retirar produtos'
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  router.push(`/stores/${storeId.value}/sales/new`)
}

function getProductLabel(storeProduct: StoreProduct): string {
  if (storeProduct.product) {
    return `${storeProduct.product.brand} ${storeProduct.product.name} - ${storeProduct.product.flavor}`
  }
  return 'Produto não encontrado'
}

function formatPrice(price: string): string {
  return parseFloat(price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

onMounted(() => {
  syncUrlToStore(id => ({ path: `/stores/${id}/inventory/withdraw` }))
  loadStoreProducts()
})

watch(effectiveStoreId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  if (routeStoreId.value !== newId) {
    router.replace({ path: `/stores/${newId}/inventory/withdraw` })
  }
  loadStoreProducts()
})
</script>

<template>
  <div class="inventory-withdraw-view">
    <div class="page-header">
      <button @click="cancel" class="btn-back">← Voltar</button>
      <h1>Retirar Produtos do Estoque</h1>
    </div>

    <div class="withdraw-section">
      <div class="section-header">
        <h2>Produtos Disponíveis</h2>
        <p class="section-description">
          Selecione os produtos que deseja retirar do estoque da loja para seu inventário pessoal.
        </p>
      </div>

      <div class="product-search">
        <input
          v-model="productSearch"
          type="text"
          placeholder="Buscar produtos..."
          class="search-input"
        />
      </div>

      <!-- Loading -->
      <div v-if="loadingProducts" class="loading-message">Carregando produtos...</div>

      <!-- Error -->
      <div v-else-if="productsError" class="error-message">
        {{ productsError }}
      </div>

      <!-- Products Grid -->
      <div v-else-if="filteredProducts.length > 0" class="products-grid">
        <div
          v-for="storeProduct in filteredProducts"
          :key="storeProduct.id"
          class="product-card"
        >
          <div v-if="storeProduct.product" class="product-info">
            <div class="product-brand">{{ storeProduct.product.brand }}</div>
            <div class="product-name">{{ storeProduct.product.name }}</div>
            <div class="product-flavor">{{ storeProduct.product.flavor }}</div>
          </div>
          <div class="product-price">{{ formatPrice(storeProduct.sale_price) }}</div>
          <div class="product-stock-info">
            <div class="stock-item">
              <span class="stock-label">Estoque da Loja:</span>
              <span class="stock-value">{{ storeProduct.stock_quantity }}</span>
            </div>
            <div class="stock-item">
              <span class="stock-label">Disponível para Retirar:</span>
              <span class="stock-value available">{{ storeProduct.available_quantity ?? 0 }}</span>
            </div>
            <div v-if="storeProduct.seller_quantity !== undefined" class="stock-item">
              <span class="stock-label">Seu Estoque:</span>
              <span class="stock-value">{{ storeProduct.seller_quantity }}</span>
            </div>
          </div>
          
          <div class="quantity-selector">
            <label class="quantity-label">Quantidade a Retirar:</label>
            <div class="quantity-controls">
              <button
                @click="updateQuantity(storeProduct.id, getSelectedQuantity(storeProduct.id) - 1)"
                class="btn-quantity"
                :disabled="getSelectedQuantity(storeProduct.id) <= 0"
              >
                −
              </button>
              <input
                type="number"
                :value="getSelectedQuantity(storeProduct.id)"
                @input="updateQuantity(storeProduct.id, parseInt(($event.target as HTMLInputElement).value) || 0)"
                :max="storeProduct.available_quantity ?? 0"
                min="0"
                class="quantity-input"
              />
              <button
                @click="updateQuantity(storeProduct.id, getSelectedQuantity(storeProduct.id) + 1)"
                class="btn-quantity"
                :disabled="getSelectedQuantity(storeProduct.id) >= (storeProduct.available_quantity ?? 0)"
              >
                +
              </button>
            </div>
            <div v-if="getSelectedQuantity(storeProduct.id) > 0" class="selected-quantity">
              Selecionado: {{ getSelectedQuantity(storeProduct.id) }} unidade(s)
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-products">
        <p>Nenhum produto disponível para retirada no momento.</p>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="selectedItems.size > 0" class="summary-section">
      <h3>Resumo da Retirada</h3>
      <div class="summary-items">
        <div
          v-for="[storeProductId, quantity] in selectedItems.entries()"
          :key="storeProductId"
          class="summary-item"
        >
          <span class="summary-product">
            {{ getProductLabel(storeProducts.find(p => p.id === storeProductId)!) }}
          </span>
          <span class="summary-quantity">{{ quantity }} unidade(s)</span>
        </div>
      </div>
      <div class="summary-total">
        <span class="total-label">Total de Itens:</span>
        <span class="total-value">{{ totalItemsSelected }} unidade(s)</span>
      </div>
    </div>

    <!-- Success -->
    <div v-if="success" class="success-message">
      <div class="success-title">✅ Sucesso!</div>
      <div class="success-content">{{ success }}</div>
      <div class="success-note">Redirecionando para tela de vendas...</div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      <div class="error-title">⚠️ Erro</div>
      <div class="error-content" v-html="error.replace(/\n/g, '<br>')"></div>
    </div>

    <!-- Submit -->
    <div class="actions">
      <button @click="cancel" class="btn-cancel">Cancelar</button>
      <button
        @click="handleSubmit"
        class="btn-submit"
        :disabled="!canSubmit || submitting"
      >
        <span v-if="submitting">Processando...</span>
        <span v-else>Retirar Produtos</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.inventory-withdraw-view {
  max-width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  font-size: 2rem;
  color: var(--color-text-primary);
  margin: 0;
  font-family: var(--font-display);
}

.btn-back {
  background: transparent;
  color: var(--color-orange);
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-orange);
  border-radius: 8px;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background var(--transition-fast);
  font-family: var(--font-body);
}

.btn-back:hover {
  background: var(--color-medium-gray);
}

.withdraw-section {
  background: var(--color-dark-gray);
  border-radius: 12px;
  border: 1px solid var(--color-medium-gray);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.section-header {
  margin-bottom: var(--spacing-md);
}

.section-header h2 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  font-family: var(--font-display);
}

.section-description {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  margin: 0;
}

.product-search {
  margin-bottom: var(--spacing-md);
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-medium-gray);
  border-radius: 8px;
  font-size: 0.9375rem;
  background: var(--color-dark-gray);
  color: var(--color-text-primary);
  font-family: var(--font-body);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-orange);
  box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.product-card {
  border: 2px solid var(--color-medium-gray);
  border-radius: 8px;
  padding: var(--spacing-md);
  background: var(--color-dark-gray);
  transition: all var(--transition-fast);
}

.product-card:hover {
  border-color: var(--color-orange);
  box-shadow: var(--shadow-medium);
}

.product-info {
  margin-bottom: var(--spacing-sm);
}

.product-brand {
  font-weight: 600;
  color: var(--color-orange);
  font-size: 0.875rem;
}

.product-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.product-flavor {
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
}

.product-price {
  font-weight: 600;
  color: var(--color-gold);
  font-size: 1.125rem;
  margin: var(--spacing-sm) 0;
}

.product-stock-info {
  margin: var(--spacing-sm) 0;
  padding: var(--spacing-sm);
  background: var(--color-medium-gray);
  border-radius: 6px;
}

.stock-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.stock-item:last-child {
  margin-bottom: 0;
}

.stock-label {
  color: var(--color-text-secondary);
}

.stock-value {
  color: var(--color-text-primary);
  font-weight: 600;
}

.stock-value.available {
  color: var(--color-gold);
}

.quantity-selector {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-medium-gray);
}

.quantity-label {
  display: block;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  font-size: 0.9375rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-quantity {
  background: var(--color-medium-gray);
  color: var(--color-text-primary);
  border: 1px solid var(--color-medium-gray);
  border-radius: 6px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 1.125rem;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  font-family: var(--font-body);
}

.btn-quantity:hover:not(:disabled) {
  background: var(--color-dark-gray);
  border-color: var(--color-orange);
}

.btn-quantity:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-medium-gray);
  border-radius: 6px;
  font-size: 1rem;
  text-align: center;
  background: var(--color-dark-gray);
  color: var(--color-text-primary);
  font-family: var(--font-body);
}

.quantity-input:focus {
  outline: none;
  border-color: var(--color-orange);
  box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
}

.selected-quantity {
  margin-top: var(--spacing-sm);
  font-size: 0.875rem;
  color: var(--color-gold);
  font-weight: 500;
}

.summary-section {
  background: var(--color-dark-gray);
  border-radius: 12px;
  border: 1px solid var(--color-medium-gray);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.summary-section h3 {
  font-size: 1.25rem;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-md) 0;
  font-family: var(--font-display);
}

.summary-items {
  margin-bottom: var(--spacing-md);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-medium-gray);
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-product {
  color: var(--color-text-primary);
  font-size: 0.9375rem;
}

.summary-quantity {
  color: var(--color-gold);
  font-weight: 600;
  font-size: 0.9375rem;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  padding-top: var(--spacing-md);
  border-top: 2px solid var(--color-medium-gray);
  font-size: 1.125rem;
}

.total-label {
  color: var(--color-text-primary);
  font-weight: 600;
}

.total-value {
  color: var(--color-gold);
  font-weight: 700;
}

.success-message {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid #22c55e;
  padding: var(--spacing-md);
  border-radius: 8px;
  margin-bottom: var(--spacing-md);
}

.success-title {
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  font-size: 1rem;
}

.success-content {
  margin-bottom: var(--spacing-sm);
}

.success-note {
  font-size: 0.875rem;
  opacity: 0.8;
}

.error-message {
  background: rgba(255, 69, 0, 0.1);
  color: var(--color-error);
  border: 1px solid var(--color-error);
  padding: var(--spacing-md);
  border-radius: 8px;
  margin-bottom: var(--spacing-md);
}

.error-title {
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  font-size: 1rem;
}

.error-content {
  margin-bottom: var(--spacing-sm);
}

.loading-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.empty-products {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
}

.actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

.btn-cancel {
  background: transparent;
  color: var(--color-text-primary);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-medium-gray);
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  font-family: var(--font-body);
}

.btn-cancel:hover {
  background: var(--color-medium-gray);
  border-color: var(--color-orange);
}

.btn-submit {
  background: var(--gradient-boss);
  color: var(--color-white);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast), filter var(--transition-fast);
  font-family: var(--font-body);
}

.btn-submit:hover:not(:disabled) {
  transform: scale(1.02);
  filter: brightness(1.1);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
