<script setup lang="ts">
/**
 * Store Product Form View (Adicionar produto ao inventário)
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: selecionar produto master, definir preços, estoque, min level, is_active
 */

import { ref, computed, watch, onMounted, onActivated, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProducts } from '@/api/endpoints/products'
import { createStoreProduct, getStoreProducts, updateStoreProduct } from '@/api/endpoints/storeProducts'
import type { Product, CreateStoreProductRequest, StoreProduct, UpdateStoreProductRequest } from '@/api/types'
import { ValidationError } from '@/api/types'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'
import { useStockSync } from '@/composables/useStockSync'

const route = useRoute()
const router = useRouter()

const { effectiveStoreId, routeStoreId, syncUrlToStore } = useEffectiveStoreId()
const storeId = computed(() => effectiveStoreId.value ?? 0)
const stockSync = useStockSync(effectiveStoreId)

// Form state
const productId = ref<number | null>(null)
const costPrice = ref('')
const salePrice = ref('')
const stockQuantity = ref(0) // Para produtos novos: estoque total. Para existentes: unidades a adicionar
const minStockLevel = ref(0)
const isActive = ref(true)

// Estado do produto existente
const existingStoreProduct = ref<StoreProduct | null>(null)
const loadingExisting = ref(false)
const isExistingProduct = computed(() => existingStoreProduct.value !== null)
const currentStock = computed(() => existingStoreProduct.value?.stock_quantity || 0)

// Products list for select
const products = ref<Product[]>([])
const loadingProducts = ref(false)

// UI state
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

// Carregar produtos do inventário para verificar se já existe
const storeProductsCache = ref<StoreProduct[]>([])

// Load products for select
async function loadProducts() {
  loadingProducts.value = true
  try {
    const response = await getProducts({ per_page: 100 })
    if (response && typeof response === 'object' && 'data' in response) {
      products.value = Array.isArray(response.data) ? response.data : []
    }
  } catch (err) {
    console.error('Erro ao carregar produtos:', err)
  } finally {
    loadingProducts.value = false
  }
}

// Carregar produtos do inventário para cache
async function loadStoreProductsCache() {
  try {
    // Sempre buscar dados atualizados (sem cache)
    if (!storeId.value) return
    const response = await getStoreProducts(storeId.value, { per_page: 100 })
    if (response && typeof response === 'object' && 'data' in response) {
      const newData = Array.isArray(response.data) ? response.data : []
      storeProductsCache.value = newData
      console.log('Cache de produtos atualizado:', newData.length, 'produtos')
    }
  } catch (err) {
    console.error('Erro ao carregar produtos do inventário:', err)
  }
}

// Função para recarregar dados do produto selecionado
async function refreshSelectedProduct() {
  if (!productId.value) return
  
  loadingExisting.value = true
  try {
    // Sempre recarregar o cache para garantir dados atualizados
    await loadStoreProductsCache()
    
    // Buscar o produto atualizado
    const found = storeProductsCache.value.find(sp => sp.product_id === productId.value)
    
    if (found) {
      console.log('Produto encontrado no cache:', found.product?.name, 'Estoque:', found.stock_quantity)
      // Atualizar dados do produto
      existingStoreProduct.value = found
      costPrice.value = found.cost_price
      salePrice.value = found.sale_price
      // Manter o valor de stockQuantity se o usuário já digitou algo
      const currentQuantity = stockQuantity.value
      minStockLevel.value = found.min_stock_level || 0
      isActive.value = found.is_active
      // Só resetar se estava vazio
      if (currentQuantity === 0) {
        stockQuantity.value = 0
      }
    } else {
      console.log('Produto não encontrado no inventário')
      // Produto não existe mais no inventário
      existingStoreProduct.value = null
      costPrice.value = ''
      salePrice.value = ''
      stockQuantity.value = 0
      minStockLevel.value = 0
      isActive.value = true
    }
  } catch (err) {
    console.error('Erro ao recarregar produto:', err)
  } finally {
    loadingExisting.value = false
  }
}

// Verificar se produto já existe no inventário quando selecionado
watch(productId, async (newProductId, oldProductId) => {
  if (!newProductId) {
    // Limpar dados quando produto é desmarcado
    existingStoreProduct.value = null
    costPrice.value = ''
    salePrice.value = ''
    stockQuantity.value = 0
    minStockLevel.value = 0
    isActive.value = true
    return
  }

  // Se o produto mudou ou é a primeira seleção, recarregar
  if (newProductId !== oldProductId || !existingStoreProduct.value) {
    // Sempre recarregar cache para garantir dados atualizados
    await loadStoreProductsCache()
    await refreshSelectedProduct()
  }
})

// Submit form
async function handleSubmit() {
  // Validação client-side
  const errors: Record<string, string[]> = {}

  if (!productId.value) {
    errors.product_id = ['O produto é obrigatório']
  }

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
    if (isExistingProduct.value) {
      errors.stock_quantity = ['As unidades a adicionar não podem ser negativas']
    } else {
      errors.stock_quantity = ['A quantidade em estoque não pode ser negativa']
    }
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
    if (isExistingProduct.value && existingStoreProduct.value) {
      // Produto já existe - atualizar com estoque somado
      const newStockQuantity = currentStock.value + stockQuantity.value
      
      const data: UpdateStoreProductRequest = {
        cost_price: parseFloat(costPrice.value),
        sale_price: parseFloat(salePrice.value),
        stock_quantity: newStockQuantity,
        min_stock_level: minStockLevel.value || undefined,
        is_active: isActive.value,
      }

      await updateStoreProduct(storeId.value, existingStoreProduct.value.id, data)
      stockSync.emitStockUpdated({ source: 'store-product-update' })
      router.push({
        path: `/stores/${storeId.value}/products`,
      })
    } else {
      // Produto novo - criar
      const data: CreateStoreProductRequest = {
        product_id: productId.value!,
        cost_price: parseFloat(costPrice.value),
        sale_price: parseFloat(salePrice.value),
        stock_quantity: stockQuantity.value,
        min_stock_level: minStockLevel.value || undefined,
        is_active: isActive.value,
      }

      await createStoreProduct(storeId.value, data)
      stockSync.emitStockUpdated({ source: 'store-product-create' })
      router.push({
        path: `/stores/${storeId.value}/products`,
      })
    }
  } catch (err) {
    if (err instanceof ValidationError && err.errors) {
      fieldErrors.value = err.errors
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao salvar produto no inventário'
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  router.push(`/stores/${storeId.value}/products`)
}

function getProductLabel(product: Product): string {
  return `${product.brand} ${product.name} - ${product.flavor}`
}

// Flag para controlar se já foi montado
let hasMounted = false

async function refreshAll() {
  await loadStoreProductsCache()
  if (productId.value) {
    await refreshSelectedProduct()
  }
}

// Recarregar quando o select de produto recebe foco
async function handleProductSelectFocus() {
  if (!hasMounted || !productId.value) return
  await refreshAll()
}

onMounted(async () => {
  // manter URL alinhada ao store efetivo
  syncUrlToStore(id => ({ path: `/stores/${id}/products/new` }))

  await Promise.all([loadProducts(), loadStoreProductsCache()])
  hasMounted = true

  stockSync.attachListeners(async () => {
    await refreshAll()
  })
  await stockSync.refreshIfPending(async () => {
    await refreshAll()
  })
})

onUnmounted(() => {
  stockSync.detachListeners()
})

onActivated(async () => {
  if (!hasMounted) return
  await stockSync.refreshIfPending(async () => {
    await refreshAll()
  })
})

watch(effectiveStoreId, (newId, oldId) => {
  if (!hasMounted || !newId || newId === oldId) return
  if (routeStoreId.value !== newId) {
    router.replace({ path: `/stores/${newId}/products/new` })
  }
  refreshAll()
})
</script>

<template>
  <div class="store-product-form-page">
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
        <h1 class="page-title">Adicionar Produto ao Inventário</h1>
      </div>

      <!-- Loading State (carregando produtos) -->
      <div v-if="loadingProducts" class="loading-state">
        <div class="loading-card">
          <p class="loading-text">Carregando produtos...</p>
        </div>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="product-form-card">
        <!-- Error message geral -->
        <div
          v-if="error && !fieldErrors.product_id && !fieldErrors.cost_price && !fieldErrors.sale_price && !fieldErrors.stock_quantity"
          class="error-message-general"
        >
          {{ error }}
        </div>

        <!-- Info sobre produto existente -->
        <div
          v-if="isExistingProduct && existingStoreProduct"
          class="info-message-existing"
        >
          <span class="info-icon">ℹ️</span>
          <span>Este produto já está no inventário. Os campos foram preenchidos automaticamente. Você pode adicionar mais unidades ao estoque.</span>
        </div>

        <!-- Product Select -->
        <div class="form-group">
          <label for="product_id" class="form-label">
            Produto
            <span class="required-asterisk">*</span>
          </label>
          <select
            id="product_id"
            v-model="productId"
            class="form-input"
            :class="{ 'form-input-error': fieldErrors.product_id }"
            :aria-invalid="!!fieldErrors.product_id"
            :aria-describedby="fieldErrors.product_id ? 'product_id-error' : undefined"
            :disabled="loadingExisting"
            @focus="handleProductSelectFocus"
            required
          >
            <option :value="null">Selecione um produto...</option>
            <option v-for="product in products" :key="product.id" :value="product.id">
              {{ getProductLabel(product) }}
            </option>
          </select>
          <div
            v-if="loadingExisting"
            class="loading-indicator"
          >
            Verificando se produto já existe no inventário...
          </div>
          <div
            v-if="fieldErrors.product_id"
            id="product_id-error"
            class="form-error"
            role="alert"
            aria-live="polite"
          >
            {{ fieldErrors.product_id[0] }}
          </div>
        </div>

        <!-- Cost Price -->
        <div class="form-group">
          <label for="cost_price" class="form-label">
            Preço de Custo
            <span class="required-asterisk">*</span>
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
            Preço de Venda
            <span class="required-asterisk">*</span>
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

        <!-- Stock Quantity / Unidades a adicionar -->
        <div class="form-group">
          <label for="stock_quantity" class="form-label">
            <span v-if="isExistingProduct">Unidades a Adicionar</span>
            <span v-else>Quantidade em Estoque</span>
            <span class="required-asterisk">*</span>
          </label>
          <div v-if="isExistingProduct" class="current-stock-info">
            <div class="stock-info-row">
              <div>
                <span class="current-stock-label">Estoque atual:</span>
                <span class="current-stock-value">{{ currentStock }} unidades</span>
              </div>
              <button
                type="button"
                @click="refreshSelectedProduct"
                class="btn-refresh-stock"
                :disabled="loadingExisting"
                title="Atualizar estoque atual"
              >
                <span v-if="loadingExisting">⟳</span>
                <span v-else>🔄</span>
              </button>
            </div>
          </div>
          <input
            id="stock_quantity"
            v-model.number="stockQuantity"
            type="number"
            min="0"
            class="form-input"
            :class="{ 'form-input-error': fieldErrors.stock_quantity }"
            :aria-invalid="!!fieldErrors.stock_quantity"
            :aria-describedby="fieldErrors.stock_quantity ? 'stock_quantity-error' : undefined"
            :placeholder="isExistingProduct ? '0' : '0'"
            required
          />
          <div
            v-if="isExistingProduct && stockQuantity > 0"
            class="stock-preview"
          >
            Novo estoque: <strong>{{ currentStock + stockQuantity }} unidades</strong>
          </div>
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
          <label for="min_stock_level" class="form-label">
            Estoque Mínimo
          </label>
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
            <input
              v-model="isActive"
              type="checkbox"
              class="form-checkbox"
            />
            <span>Produto ativo</span>
          </label>
          <div v-if="fieldErrors.is_active" class="form-error">
            {{ fieldErrors.is_active[0] }}
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" @click="cancel" class="btn-cancel">
            Cancelar
          </button>
          <button type="submit" class="btn-submit" :disabled="submitting || loadingExisting">
            <span v-if="submitting">
              <span v-if="isExistingProduct">Atualizando...</span>
              <span v-else>Adicionando...</span>
            </span>
            <span v-else>
              <span v-if="isExistingProduct">Atualizar Estoque</span>
              <span v-else>Adicionar</span>
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.store-product-form-page {
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
   FORM CARD
   ============================================ */

.product-form-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 32px;
}

@media (min-width: 640px) {
  .product-form-card {
    padding: 40px;
    gap: 40px;
  }
}

/* ============================================
   INFO MESSAGES
   ============================================ */

.info-message-existing {
  background: rgba(59, 130, 246, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 16px 20px;
  color: #93C5FD;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.error-message-general {
  background: rgba(239, 68, 68, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  padding: 16px 20px;
  color: #FCA5A5;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.loading-indicator {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-style: italic;
  margin-top: 4px;
}

/* ============================================
   FORM GROUPS
   ============================================ */

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 4px;
}

.required-asterisk {
  color: #FCA5A5;
  font-weight: 700;
}

.current-stock-info {
  padding: 12px 16px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  font-size: 14px;
}

.stock-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.current-stock-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  margin-right: 8px;
}

.current-stock-value {
  color: #FFD700;
  font-weight: 700;
}

.btn-refresh-stock {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #FFFFFF;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-refresh-stock:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: rotate(180deg);
}

.btn-refresh-stock:active:not(:disabled) {
  transform: rotate(360deg);
}

.btn-refresh-stock:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-refresh-stock:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
}

.stock-preview {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-top: 4px;
  padding: 8px 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 12px;
}

.stock-preview strong {
  color: #86EFAC;
  font-weight: 700;
}

/* ============================================
   FORM INPUTS
   ============================================ */

.form-input {
  width: 100%;
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

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-input:focus {
  outline: none;
  border-color: rgba(231, 0, 0, 0.5);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.1);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input-error {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.05);
}

.form-input-error:focus {
  border-color: rgba(239, 68, 68, 0.7);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

select.form-input {
  cursor: pointer;
}

select.form-input:disabled {
  cursor: not-allowed;
}

select.form-input option {
  background: #000000;
  color: #FFFFFF;
}

.form-error {
  color: #FCA5A5;
  font-size: 14px;
  font-weight: 500;
  margin-top: 4px;
  line-height: 1.4;
}

/* ============================================
   CHECKBOX
   ============================================ */

.form-checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #FFFFFF;
  user-select: none;
}

.form-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #E70000;
  border-radius: 4px;
}

.form-checkbox:focus {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}

/* ============================================
   FORM ACTIONS
   ============================================ */

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

@media (min-width: 640px) {
  .form-actions {
    flex-direction: row;
    justify-content: flex-end;
    gap: 16px;
  }
}

.btn-cancel,
.btn-submit {
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
  width: 100%;
}

@media (min-width: 640px) {
  .btn-cancel,
  .btn-submit {
    width: auto;
    padding: 16px 40px;
  }
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-cancel:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
}

.btn-submit {
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(0);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-submit:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

/* ============================================
   LOADING STATE
   ============================================ */

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 0;
}

.loading-card {
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
  .loading-card {
    padding: 56px 64px;
  }
}

.loading-text {
  font-size: 18px;
  font-weight: 500;
  color: #FFFFFF;
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

/* Focus visible para melhor acessibilidade */
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
