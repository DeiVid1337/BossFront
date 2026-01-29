<script setup lang="ts">
/**
 * Store Product Edit View
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: editar preços, estoque, min level, is_active
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getStoreProduct,
  updateStoreProduct,
  deleteStoreProduct,
} from '@/api/endpoints/storeProducts'
import type { StoreProduct, UpdateStoreProductRequest } from '@/api/types'
import { ApiError, ValidationError } from '@/api/types'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'
import { useStockSync } from '@/composables/useStockSync'

const route = useRoute()
const router = useRouter()

const storeProductId = Number(route.params.id)
const { effectiveStoreId, routeStoreId, syncUrlToStore } = useEffectiveStoreId()
const storeId = computed(() => effectiveStoreId.value ?? 0)
const stockSync = useStockSync(effectiveStoreId)

// Form state
const costPrice = ref('')
const salePrice = ref('')
const stockQuantity = ref(0)
const minStockLevel = ref(0)
const isActive = ref(true)

// Store product data
const storeProduct = ref<StoreProduct | null>(null)

// UI state
const loading = ref(false)
const submitting = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})
const showDeleteModal = ref(false)

const deleteMessage = computed(() => {
  if (!storeProduct.value || !storeProduct.value.product) return ''
  return `Tem certeza que deseja remover "${storeProduct.value.product.brand} ${storeProduct.value.product.name} - ${storeProduct.value.product.flavor}" do inventário? Esta ação não pode ser desfeita.`
})

// Load store product
async function loadStoreProduct() {
  loading.value = true
  error.value = null

  try {
    if (!storeId.value) throw new Error('Loja inválida')
    storeProduct.value = await getStoreProduct(storeId.value, storeProductId)
    costPrice.value = storeProduct.value.cost_price
    salePrice.value = storeProduct.value.sale_price
    stockQuantity.value = storeProduct.value.stock_quantity
    minStockLevel.value = storeProduct.value.min_stock_level
    isActive.value = storeProduct.value.is_active
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar produto do inventário'
    if (err instanceof Error && err.message.includes('404')) {
      router.push(`/stores/${storeId.value}/products`)
    }
  } finally {
    loading.value = false
  }
}

// Submit form
async function handleSubmit() {
  // Validação client-side
  const errors: Record<string, string[]> = {}

  if (!costPrice.value || parseFloat(costPrice.value) <= 0) {
    errors.cost_price = ['O preço de custo deve ser maior que zero']
  }

  if (!salePrice.value || parseFloat(salePrice.value) <= 0) {
    errors.sale_price = ['O preço de venda deve ser maior que zero']
  }

  if (parseFloat(salePrice.value) < parseFloat(costPrice.value)) {
    errors.sale_price = ['O preço de venda deve ser maior ou igual ao preço de custo']
  }

  if (stockQuantity.value < 0) {
    errors.stock_quantity = ['A quantidade em estoque não pode ser negativa']
  }

  if (minStockLevel.value < 0) {
    errors.min_stock_level = ['O estoque mínimo não pode ser negativo']
  }

  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors
    return
  }

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    const data: UpdateStoreProductRequest = {
      cost_price: parseFloat(costPrice.value),
      sale_price: parseFloat(salePrice.value),
      stock_quantity: stockQuantity.value,
      min_stock_level: minStockLevel.value || undefined,
      is_active: isActive.value,
    }

    await updateStoreProduct(storeId.value, storeProductId, data)
    stockSync.emitStockUpdated({ source: 'store-product-edit' })
    router.push(`/stores/${storeId.value}/products`)
  } catch (err) {
    if (err instanceof ValidationError && err.errors) {
      fieldErrors.value = err.errors
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao atualizar produto do inventário'
    }
  } finally {
    submitting.value = false
  }
}

function showDelete() {
  showDeleteModal.value = true
}

async function handleDelete() {
  deleting.value = true
  try {
    await deleteStoreProduct(storeId.value, storeProductId)
    stockSync.emitStockUpdated({ source: 'store-product-delete' })
    router.push(`/stores/${storeId.value}/products`)
  } catch (err) {
    // Tratar erro 409 (produto tem histórico de vendas)
    if (err instanceof ApiError && err.status === 409) {
      error.value =
        'Não é possível remover este produto pois ele tem histórico de vendas. O produto não pode ser removido do inventário.'
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao remover produto do inventário'
    }
    showDeleteModal.value = false
  } finally {
    deleting.value = false
  }
}

function cancelDelete() {
  showDeleteModal.value = false
}

function cancel() {
  router.push(`/stores/${storeId.value}/products`)
}

onMounted(() => {
  syncUrlToStore(id => ({ path: `/stores/${id}/products/${storeProductId}/edit` }))
  loadStoreProduct()
})

watch(effectiveStoreId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  if (routeStoreId.value !== newId) {
    router.replace({ path: `/stores/${newId}/products/${storeProductId}/edit` })
  }
  loadStoreProduct()
})
</script>

<template>
  <div class="store-product-edit-view">
    <div class="page-header">
      <button @click="cancel" class="btn-back">← Voltar</button>
      <h1>Editar Produto do Inventário</h1>
      <button @click="showDelete" class="btn-danger">Remover</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-message">Carregando...</div>

    <!-- Error -->
    <div v-else-if="error && !storeProduct" class="error-message">{{ error }}</div>

    <!-- Form -->
    <form v-else-if="storeProduct" @submit.prevent="handleSubmit" class="store-product-form">
      <!-- Product Info (read-only) -->
      <div v-if="storeProduct.product" class="product-info-card">
        <h3>Produto</h3>
        <p class="product-brand">{{ storeProduct.product.brand }}</p>
        <p class="product-name">{{ storeProduct.product.name }}</p>
        <p class="product-flavor">{{ storeProduct.product.flavor }}</p>
      </div>

      <!-- Error message -->
      <div v-if="error && !fieldErrors.cost_price && !fieldErrors.sale_price" class="error-message">
        {{ error }}
      </div>

      <!-- Cost Price -->
      <div class="form-group">
        <label for="cost_price" class="form-label">
          Preço de Custo <span class="required">*</span>
        </label>
        <input
          id="cost_price"
          v-model="costPrice"
          type="number"
          step="0.01"
          min="0"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.cost_price }"
          :aria-invalid="!!fieldErrors.cost_price"
          :aria-describedby="fieldErrors.cost_price ? 'cost_price-error' : undefined"
          placeholder="0.00"
          required
        />
        <div
          v-if="fieldErrors.cost_price"
          id="cost_price-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.cost_price[0] }}
        </div>
      </div>

      <!-- Sale Price -->
      <div class="form-group">
        <label for="sale_price" class="form-label">
          Preço de Venda <span class="required">*</span>
        </label>
        <input
          id="sale_price"
          v-model="salePrice"
          type="number"
          step="0.01"
          min="0"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.sale_price }"
          :aria-invalid="!!fieldErrors.sale_price"
          :aria-describedby="fieldErrors.sale_price ? 'sale_price-error' : undefined"
          placeholder="0.00"
          required
        />
        <div
          v-if="fieldErrors.sale_price"
          id="sale_price-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.sale_price[0] }}
        </div>
      </div>

      <!-- Stock Quantity -->
      <div class="form-group">
        <label for="stock_quantity" class="form-label">
          Quantidade em Estoque <span class="required">*</span>
        </label>
        <input
          id="stock_quantity"
          v-model.number="stockQuantity"
          type="number"
          min="0"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.stock_quantity }"
          :aria-invalid="!!fieldErrors.stock_quantity"
          :aria-describedby="fieldErrors.stock_quantity ? 'stock_quantity-error' : undefined"
          placeholder="0"
          required
        />
        <div
          v-if="fieldErrors.stock_quantity"
          id="stock_quantity-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.stock_quantity[0] }}
        </div>
      </div>

      <!-- Min Stock Level -->
      <div class="form-group">
        <label for="min_stock_level" class="form-label">Estoque Mínimo</label>
        <input
          id="min_stock_level"
          v-model.number="minStockLevel"
          type="number"
          min="0"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.min_stock_level }"
          :aria-invalid="!!fieldErrors.min_stock_level"
          :aria-describedby="fieldErrors.min_stock_level ? 'min_stock_level-error' : undefined"
          placeholder="0"
        />
        <div
          v-if="fieldErrors.min_stock_level"
          id="min_stock_level-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.min_stock_level[0] }}
        </div>
      </div>

      <!-- Is Active -->
      <div class="form-group">
        <label class="form-checkbox-label">
          <input v-model="isActive" type="checkbox" class="form-checkbox" />
          <span>Produto ativo</span>
        </label>
        <div v-if="fieldErrors.is_active" class="form-error">
          {{ fieldErrors.is_active[0] }}
        </div>
      </div>

      <!-- Form actions -->
      <div class="form-actions">
        <button type="button" @click="cancel" class="btn-cancel">Cancelar</button>
        <button type="submit" class="btn-submit" :disabled="submitting">
          <span v-if="submitting">Salvando...</span>
          <span v-else>Salvar</span>
        </button>
      </div>
    </form>

    <!-- Delete confirmation modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Remover Produto do Inventário"
      :message="deleteMessage"
      confirm-text="Remover"
      cancel-text="Cancelar"
      variant="danger"
      @confirm="handleDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.store-product-edit-view {
  max-width: 800px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
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

.btn-danger {
  background: #ef4444;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
}

.loading-message {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.store-product-form {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 2rem;
}

.product-info-card {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.product-info-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 0.75rem 0;
}

.product-brand {
  font-weight: 600;
  color: #667eea;
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.product-name {
  font-weight: 500;
  color: #2d3748;
  margin: 0.25rem 0;
}

.product-flavor {
  font-size: 0.875rem;
  color: #718096;
  margin: 0.25rem 0;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.9375rem;
}

.required {
  color: #ef4444;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9375rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input-error {
  border-color: #ef4444;
}

.form-error {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.form-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9375rem;
  color: #374151;
}

.form-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel {
  background: #e2e8f0;
  color: #4a5568;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: #cbd5e0;
}

.btn-submit {
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

.btn-submit:hover:not(:disabled) {
  background: #5568d3;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
