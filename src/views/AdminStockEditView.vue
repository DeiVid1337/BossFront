<script setup lang="ts">
/**
 * Admin/Manager Stock Edit View
 * Página para admins e gerentes editarem o estoque de um produto específico
 * Similar à SellerStockEditView, mas com acesso completo
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStoreProduct, updateStoreProduct } from '@/api/endpoints/storeProducts'
import type { StoreProduct, UpdateStoreProductRequest } from '@/api/types'
import { ValidationError } from '@/api/types'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'
import { useStockSync } from '@/composables/useStockSync'

const route = useRoute()
const router = useRouter()

const storeProductId = Number(route.params.id)
const { effectiveStoreId, routeStoreId, syncUrlToStore } = useEffectiveStoreId()
const storeId = computed(() => effectiveStoreId.value ?? 0)
const stockSync = useStockSync(effectiveStoreId)

// State
const storeProduct = ref<StoreProduct | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Form state
const adjustmentType = ref<'set' | 'add' | 'subtract'>('set')
const adjustmentAmount = ref(0)

// UI state
const submitting = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})

// Load store product
async function loadStoreProduct() {
  if (!storeId.value || !storeProductId) {
    error.value = 'Loja ou produto não encontrado'
    return
  }

  loading.value = true
  error.value = null

  try {
    const product = await getStoreProduct(storeId.value, storeProductId)
    storeProduct.value = product
    adjustmentAmount.value = 0
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar produto'
    if (err instanceof ValidationError && err.validationErrors) {
      fieldErrors.value = err.validationErrors
    }
  } finally {
    loading.value = false
  }
}

// Computed: new stock after adjustment
const newStock = computed(() => {
  if (adjustmentType.value === 'set') {
    return adjustmentAmount.value
  } else if (adjustmentType.value === 'add') {
    return (storeProduct.value?.stock_quantity || 0) + adjustmentAmount.value
  } else {
    return Math.max(0, (storeProduct.value?.stock_quantity || 0) - adjustmentAmount.value)
  }
})

// Computed: stock difference
const stockDifference = computed(() => {
  const current = storeProduct.value?.stock_quantity || 0
  return newStock.value - current
})

// Submit form
async function handleSubmit() {
  if (!storeProduct.value || !storeId.value) {
    return
  }

  // Validação
  const errors: Record<string, string[]> = {}

  if (adjustmentType.value === 'set' && adjustmentAmount.value < 0) {
    errors.stock_quantity = ['O estoque não pode ser negativo']
  }

  if (adjustmentType.value === 'add' && adjustmentAmount.value <= 0) {
    errors.adjustment_amount = ['A quantidade a adicionar deve ser maior que zero']
  }

  if (adjustmentType.value === 'subtract') {
    if (adjustmentAmount.value <= 0) {
      errors.adjustment_amount = ['A quantidade a subtrair deve ser maior que zero']
    } else if (newStock.value < 0) {
      errors.adjustment_amount = ['Não é possível subtrair mais do que o estoque atual']
    }
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
      stock_quantity: newStock.value,
    }

    await updateStoreProduct(storeId.value, storeProductId, data)
    stockSync.emitStockUpdated({ source: 'admin-stock-edit' })
    router.push({ path: `/stores/${storeId.value}/products` })
  } catch (err) {
    if (err instanceof ValidationError) {
      error.value = err.message || 'Erro de validação'
      if (err.validationErrors) {
        fieldErrors.value = err.validationErrors
      }
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao atualizar estoque'
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  router.push(`/stores/${storeId.value}/products`)
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getProductLabel(product: StoreProduct): string {
  if (product.product) {
    const p = product.product
    return `${p.brand} ${p.name}${p.flavor ? ` - ${p.flavor}` : ''}`
  }
  return `Produto #${product.product_id}`
}

// Load on mount
onMounted(() => {
  syncUrlToStore(id => ({ path: `/stores/${id}/products/${storeProductId}/edit-stock` }))
  loadStoreProduct()
})

watch(effectiveStoreId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  if (routeStoreId.value !== newId) {
    router.replace({ path: `/stores/${newId}/products/${storeProductId}/edit-stock` })
  }
  loadStoreProduct()
})
</script>

<template>
  <div class="admin-stock-edit-page">
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
        <button @click="cancel" class="btn-back">
          <span class="btn-back-icon">←</span>
          <span>Voltar</span>
        </button>
        <h1 class="page-title">Editar Estoque</h1>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <p class="loading-text">Carregando produto...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !storeProduct" class="error-state">
        <p class="error-text">{{ error }}</p>
        <button @click="cancel" class="btn-back-error">
          Voltar
        </button>
      </div>

      <!-- Form -->
      <div v-else-if="storeProduct" class="form-card">
        <!-- Product Info -->
        <div class="product-info-card">
          <h2 class="product-info-title">Informações do Produto</h2>
          <div class="product-info-grid">
            <div class="info-item">
              <label class="info-label">Produto</label>
              <div class="info-value">{{ getProductLabel(storeProduct) }}</div>
            </div>
            <div class="info-item">
              <label class="info-label">Preço de Custo</label>
              <div class="info-value price-cost">
                {{ formatCurrency(parseFloat(storeProduct.cost_price)) }}
              </div>
            </div>
            <div class="info-item">
              <label class="info-label">Preço de Venda</label>
              <div class="info-value price-value">
                {{ formatCurrency(parseFloat(storeProduct.sale_price)) }}
              </div>
            </div>
            <div class="info-item">
              <label class="info-label">Estoque Atual</label>
              <div class="info-value stock-current">
                {{ storeProduct.stock_quantity || 0 }} unidades
              </div>
            </div>
            <div class="info-item">
              <label class="info-label">Estoque Mínimo</label>
              <div class="info-value stock-min">
                {{ storeProduct.min_stock_level || 0 }} unidades
              </div>
            </div>
            <div class="info-item">
              <label class="info-label">Status</label>
              <div class="info-value">
                <span
                  :class="[
                    'status-badge',
                    storeProduct.is_active ? 'status-active' : 'status-inactive'
                  ]"
                >
                  {{ storeProduct.is_active ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stock Adjustment Form -->
        <div class="form-section">
          <h2 class="form-section-title">Ajustar Estoque</h2>

          <!-- Error Message -->
          <div v-if="error" class="error-message-general">
            {{ error }}
          </div>

          <!-- Adjustment Type -->
          <div class="form-group">
            <label class="form-label">Tipo de Ajuste</label>
            <div class="radio-group">
              <label class="radio-option">
                <input
                  v-model="adjustmentType"
                  type="radio"
                  value="set"
                  class="radio-input"
                />
                <span class="radio-label">Definir quantidade</span>
              </label>
              <label class="radio-option">
                <input
                  v-model="adjustmentType"
                  type="radio"
                  value="add"
                  class="radio-input"
                />
                <span class="radio-label">Adicionar</span>
              </label>
              <label class="radio-option">
                <input
                  v-model="adjustmentType"
                  type="radio"
                  value="subtract"
                  class="radio-input"
                />
                <span class="radio-label">Subtrair</span>
              </label>
            </div>
            <div v-if="fieldErrors.adjustment_type" class="form-error">
              {{ fieldErrors.adjustment_type[0] }}
            </div>
          </div>

          <!-- Adjustment Amount -->
          <div class="form-group">
            <label class="form-label">
              <span v-if="adjustmentType === 'set'">Nova Quantidade</span>
              <span v-else-if="adjustmentType === 'add'">Quantidade a Adicionar</span>
              <span v-else>Quantidade a Subtrair</span>
            </label>
            <input
              v-model.number="adjustmentAmount"
              type="number"
              min="0"
              step="1"
              class="form-input"
              :class="{ 'input-error': fieldErrors.stock_quantity || fieldErrors.adjustment_amount }"
              placeholder="0"
            />
            <div v-if="fieldErrors.stock_quantity" class="form-error">
              {{ fieldErrors.stock_quantity[0] }}
            </div>
            <div v-if="fieldErrors.adjustment_amount" class="form-error">
              {{ fieldErrors.adjustment_amount[0] }}
            </div>
          </div>

          <!-- Preview -->
          <div class="preview-card">
            <div class="preview-row">
              <span class="preview-label">Estoque Atual:</span>
              <span class="preview-value">{{ storeProduct.stock_quantity || 0 }} unidades</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Ajuste:</span>
              <span
                :class="[
                  'preview-value',
                  stockDifference > 0 ? 'preview-positive' : stockDifference < 0 ? 'preview-negative' : ''
                ]"
              >
                {{ stockDifference > 0 ? '+' : '' }}{{ stockDifference }} unidades
              </span>
            </div>
            <div class="preview-row preview-total">
              <span class="preview-label">Novo Estoque:</span>
              <span
                :class="[
                  'preview-value',
                  'preview-total-value',
                  newStock < (storeProduct.min_stock_level || 0) ? 'preview-low-stock' : ''
                ]"
              >
                {{ newStock }} unidades
              </span>
            </div>
            <div
              v-if="newStock < (storeProduct.min_stock_level || 0)"
              class="preview-warning"
            >
              ⚠️ O estoque ficará abaixo do mínimo
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button @click="cancel" class="btn-cancel">
              Cancelar
            </button>
            <button
              @click="handleSubmit"
              :disabled="submitting || adjustmentAmount <= 0"
              class="btn-submit"
            >
              <span v-if="submitting">Salvando...</span>
              <span v-else>Salvar Estoque</span>
            </button>
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

.admin-stock-edit-page {
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
  max-width: 800px;
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
  display: flex;
  align-items: center;
  gap: 24px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-back-icon {
  font-size: 20px;
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
   LOADING & ERROR STATES
   ============================================ */

.loading-state,
.error-state {
  text-align: center;
  padding: 48px 24px;
}

.loading-text,
.error-text {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 24px 0;
}

.error-text {
  color: #FCA5A5;
}

.btn-back-error {
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
}

.btn-back-error:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ============================================
   FORM CARD
   ============================================ */

.form-card {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.product-info-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .product-info-card {
    padding: 40px;
  }
}

.product-info-title {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 24px 0;
}

.product-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 640px) {
  .product-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .product-info-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.info-value {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
}

.price-cost {
  color: rgba(255, 255, 255, 0.8);
}

.price-value {
  color: #FFD700;
}

.stock-current {
  color: #4ADE80;
}

.stock-min {
  color: rgba(255, 255, 255, 0.7);
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

/* ============================================
   FORM SECTION
   ============================================ */

.form-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .form-section {
    padding: 40px;
  }
}

.form-section-title {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 32px 0;
}

.error-message-general {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: #FCA5A5;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 12px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (min-width: 640px) {
  .radio-group {
    flex-direction: row;
    gap: 24px;
  }
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.radio-option:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.radio-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #E70000;
}

.radio-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: #FFFFFF;
}

.form-input {
  width: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #FFFFFF;
  transition: all 0.2s ease;
  min-height: 56px;
}

.form-input:focus {
  outline: none;
  border-color: rgba(231, 0, 0, 0.5);
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.1);
}

.form-input.input-error {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-error {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #FCA5A5;
  margin-top: 8px;
}

/* ============================================
   PREVIEW CARD
   ============================================ */

.preview-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-row:last-child {
  border-bottom: none;
}

.preview-row.preview-total {
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  margin-top: 8px;
  padding-top: 16px;
  font-weight: 700;
}

.preview-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.preview-value {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
}

.preview-value.preview-positive {
  color: #4ADE80;
}

.preview-value.preview-negative {
  color: #FCA5A5;
}

.preview-value.preview-total-value {
  font-size: 24px;
  color: #FFD700;
}

.preview-value.preview-low-stock {
  color: #FCA5A5;
}

.preview-warning {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #FCA5A5;
  margin-top: 12px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* ============================================
   FORM ACTIONS
   ============================================ */

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
}

.btn-cancel {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  padding: 16px 32px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 56px;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-submit {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 700;
  padding: 16px 40px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 56px;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25), 0 0 20px rgba(231, 0, 0, 0.1);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35), 0 0 30px rgba(231, 0, 0, 0.15);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
input:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
