<script setup lang="ts">
/**
 * Seller Add Product View
 * Página para sellers adicionarem produtos (pods) ao estoque
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStoreContext } from '@/composables/useStoreContext'
import { getProducts } from '@/api/endpoints/products'
import { createStoreProduct, getStoreProducts } from '@/api/endpoints/storeProducts'
import type { Product, CreateStoreProductRequest, StoreProduct } from '@/api/types'
import { ValidationError, ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const storeContext = useStoreContext()

const storeId = computed(() => {
  const id = storeContext.storeId.value
  if (!id) {
    router.push('/seller/dashboard')
    return 0
  }
  return id
})

// Form state
const productId = ref<number | null>(null)
const stockQuantity = ref(0)

// Products list for select
const products = ref<Product[]>([])
const loadingProducts = ref(false)
const productsError = ref<string | null>(null)
const productSearch = ref('')

// Store products cache (para verificar se já existe)
const storeProductsCache = ref<StoreProduct[]>([])
const existingStoreProduct = ref<StoreProduct | null>(null)
const loadingExisting = ref(false)

// UI state
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

// Load products for select
async function loadProducts() {
  loadingProducts.value = true
  productsError.value = null
  
  try {
    const params: { per_page: number; search?: string } = {
      per_page: 100,
    }

    if (productSearch.value && productSearch.value.trim().length >= 2) {
      params.search = productSearch.value.trim()
    }

    const response = await getProducts(params)
    if (response && typeof response === 'object' && 'data' in response) {
      products.value = Array.isArray(response.data) ? response.data : []
    } else {
      products.value = []
    }
  } catch (err) {
    // Se for 403, significa que seller não tem acesso ao catálogo
    if (err instanceof ApiError && err.status === 403) {
      productsError.value = 'Você não tem permissão para acessar o catálogo de produtos. Entre em contato com o administrador para adicionar produtos ao estoque.'
    } else if (err instanceof Error) {
      productsError.value = err.message.includes('403') 
        ? 'Você não tem permissão para acessar o catálogo de produtos. Entre em contato com o administrador para adicionar produtos ao estoque.'
        : err.message
    } else {
      productsError.value = 'Erro ao carregar produtos'
    }
    products.value = []
  } finally {
    loadingProducts.value = false
  }
}

// Carregar produtos do inventário para verificar se já existe
async function loadStoreProductsCache() {
  try {
    const response = await getStoreProducts(storeId.value, { per_page: 100 })
    if (response && typeof response === 'object' && 'data' in response) {
      storeProductsCache.value = Array.isArray(response.data) ? response.data : []
    }
  } catch (err) {
    console.error('Erro ao carregar produtos do inventário:', err)
  }
}

// Verificar se produto já existe no inventário
watch(productId, async (newProductId) => {
  if (!newProductId) {
    existingStoreProduct.value = null
    stockQuantity.value = 0
    return
  }

  loadingExisting.value = true
  try {
    await loadStoreProductsCache()
    const found = storeProductsCache.value.find(sp => sp.product_id === newProductId)
    
    if (found) {
      existingStoreProduct.value = found
      // Se já existe, mostrar mensagem informativa
    } else {
      existingStoreProduct.value = null
    }
  } catch (err) {
    console.error('Erro ao verificar produto:', err)
  } finally {
    loadingExisting.value = false
  }
})

// Search products (debounced)
let searchTimeout: ReturnType<typeof setTimeout> | null = null
function searchProducts() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    loadProducts()
  }, 500)
}

// Submit form
async function handleSubmit() {
  // Validação
  const errors: Record<string, string[]> = {}

  if (!productId.value) {
    errors.product_id = ['O produto é obrigatório']
  }

  if (stockQuantity.value <= 0) {
    errors.stock_quantity = ['A quantidade deve ser maior que zero']
  }

  if (existingStoreProduct.value) {
    errors.product_id = ['Este produto já está no inventário. Use a opção "Editar Estoque" para adicionar mais unidades.']
  }

  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors
    return
  }

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    // Para sellers, vamos tentar criar com valores padrão ou mínimos
    // O backend pode ter valores padrão ou pode retornar erro se precisar de preços
    const data: CreateStoreProductRequest = {
      product_id: productId.value!,
      cost_price: 0, // Valor padrão - pode ser ajustado pelo admin/manager depois
      sale_price: 0, // Valor padrão - pode ser ajustado pelo admin/manager depois
      stock_quantity: stockQuantity.value,
      min_stock_level: 0,
      is_active: true,
    }

    await createStoreProduct(storeId.value, data)
    
    // Redirecionar para lista com refresh
    router.push({
      path: `/seller/stores/${storeId.value}/products`,
      query: { refresh: Date.now().toString() },
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      error.value = err.message || 'Erro de validação'
      if (err.validationErrors) {
        fieldErrors.value = err.validationErrors
      }
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao adicionar produto ao estoque'
      
      // Tratar erro específico de produto já existente
      if (err instanceof Error && err.message.includes('already in store inventory')) {
        fieldErrors.value = {
          product_id: ['Este produto já está no inventário. Use a opção "Editar Estoque" para adicionar mais unidades.']
        }
      }
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  if (storeId.value) {
    router.push(`/seller/stores/${storeId.value}/products`)
  } else {
    router.push('/seller/dashboard')
  }
}

function getProductLabel(product: Product): string {
  return `${product.brand} ${product.name}${product.flavor ? ` - ${product.flavor}` : ''}`
}

// Load on mount
onMounted(async () => {
  await Promise.all([
    loadProducts(),
    loadStoreProductsCache(),
  ])
})
</script>

<template>
  <div class="seller-add-product-page">
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
        <h1 class="page-title">Adicionar Produto ao Estoque</h1>
      </div>

      <!-- Form Card -->
      <div class="form-card">
        <!-- Error Message -->
        <div v-if="error && !fieldErrors.product_id" class="error-message-general">
          {{ error }}
        </div>

        <!-- Product Selection -->
        <div class="form-section">
          <h2 class="form-section-title">Selecionar Produto</h2>

          <!-- Search -->
          <div class="form-group">
            <label class="form-label">Buscar Produto</label>
            <input
              v-model="productSearch"
              @input="searchProducts"
              type="text"
              placeholder="Digite para buscar produtos..."
              class="form-input"
            />
            <p class="form-hint">Busque por marca, nome ou sabor do produto</p>
          </div>

          <!-- Products Error -->
          <div v-if="productsError" class="error-message-general">
            <div class="error-content">
              <div class="error-icon">⚠️</div>
              <div>
                <p class="error-title">{{ productsError }}</p>
                <p class="error-hint">
                  Se você precisa adicionar produtos ao estoque, entre em contato com o administrador ou gerente.
                </p>
              </div>
            </div>
          </div>

          <!-- Products List -->
          <div v-if="!productsError && !loadingProducts" class="products-select-section">
            <label class="form-label">Produto</label>
            
            <!-- Loading Products -->
            <div v-if="loadingProducts" class="loading-products">
              <p class="loading-text">Carregando produtos...</p>
            </div>

            <!-- Products List -->
            <div v-else-if="products.length > 0" class="products-list">
              <div
                v-for="product in products"
                :key="product.id"
                @click="productId = product.id"
                :class="[
                  'product-option',
                  productId === product.id ? 'product-option-selected' : ''
                ]"
              >
                <div class="product-option-content">
                  <div class="product-option-info">
                    <div class="product-option-brand">{{ product.brand }}</div>
                    <div class="product-option-name">{{ product.name }}</div>
                    <div class="product-option-flavor">{{ product.flavor }}</div>
                  </div>
                  <div v-if="productId === product.id" class="product-option-check">
                    ✓
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty Products -->
            <div v-else class="empty-products">
              <p class="empty-text">
                <span v-if="productSearch">Nenhum produto encontrado com "{{ productSearch }}"</span>
                <span v-else>Nenhum produto disponível</span>
              </p>
            </div>
          </div>

          <!-- Product Already Exists Warning -->
          <div v-if="existingStoreProduct" class="warning-message">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <p class="warning-title">Este produto já está no inventário</p>
              <p class="warning-text">
                Estoque atual: <strong>{{ existingStoreProduct.stock_quantity }} unidades</strong>
              </p>
              <p class="warning-text">
                Para adicionar mais unidades, use a opção "Editar Estoque" na lista de produtos.
              </p>
            </div>
          </div>

          <div v-if="fieldErrors.product_id" class="form-error">
            {{ fieldErrors.product_id[0] }}
          </div>
        </div>

        <!-- Stock Quantity -->
        <div class="form-section">
          <h2 class="form-section-title">Quantidade Inicial</h2>

          <div class="form-group">
            <label class="form-label">Quantidade de Estoque</label>
            <input
              v-model.number="stockQuantity"
              type="number"
              min="1"
              step="1"
              class="form-input"
              :class="{ 'input-error': fieldErrors.stock_quantity }"
              placeholder="0"
            />
            <p class="form-hint">Informe a quantidade inicial de produtos a adicionar ao estoque</p>
            <div v-if="fieldErrors.stock_quantity" class="form-error">
              {{ fieldErrors.stock_quantity[0] }}
            </div>
          </div>

          <!-- Info Card -->
          <div class="info-card">
            <div class="info-icon">ℹ️</div>
            <div class="info-content">
              <p class="info-title">Informação Importante</p>
              <p class="info-text">
                Os preços (custo e venda) serão definidos pelo administrador ou gerente posteriormente.
                Você está apenas adicionando o produto ao estoque com a quantidade inicial.
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button @click="cancel" class="btn-cancel">
            Cancelar
          </button>
          <button
            @click="handleSubmit"
            :disabled="submitting || !productId || stockQuantity <= 0 || existingStoreProduct !== null"
            class="btn-submit"
          >
            <span v-if="submitting">Adicionando...</span>
            <span v-else>Adicionar ao Estoque</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.seller-add-product-page {
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
   FORM CARD
   ============================================ */

.form-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
}

@media (min-width: 640px) {
  .form-card {
    padding: 40px;
  }
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.form-section-title {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 24px 0;
}

.error-message-general {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.error-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-title {
  font-size: 16px;
  font-weight: 600;
  color: #FCA5A5;
  margin: 0 0 8px 0;
}

.error-hint {
  font-size: 14px;
  font-weight: 400;
  color: rgba(252, 165, 165, 0.8);
  margin: 0;
  line-height: 1.5;
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

.form-hint {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8px;
}

.form-error {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #FCA5A5;
  margin-top: 8px;
}

/* ============================================
   PRODUCTS SELECT SECTION
   ============================================ */

.products-select-section {
  margin-top: 16px;
}

.loading-products {
  text-align: center;
  padding: 32px;
}

.loading-text {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
  margin-top: 12px;
}

.product-option {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.product-option:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.product-option-selected {
  background: rgba(231, 0, 0, 0.2);
  border-color: rgba(231, 0, 0, 0.5);
  box-shadow: 0 0 20px rgba(231, 0, 0, 0.2);
}

.product-option-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.product-option-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.product-option-brand {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #E70000;
}

.product-option-name {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
}

.product-option-flavor {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
}

.product-option-check {
  font-size: 24px;
  color: #4ADE80;
  font-weight: 700;
}

.empty-products {
  text-align: center;
  padding: 32px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.empty-text {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

/* ============================================
   WARNING MESSAGE
   ============================================ */

.warning-message {
  display: flex;
  gap: 16px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.warning-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-title {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #FFD700;
  margin: 0 0 8px 0;
}

.warning-text {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
  margin: 4px 0;
}

.warning-text strong {
  color: #FFD700;
  font-weight: 700;
}

/* ============================================
   INFO CARD
   ============================================ */

.info-card {
  display: flex;
  gap: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.info-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-title {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 8px 0;
}

.info-text {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1.5;
}

/* ============================================
   FORM ACTIONS
   ============================================ */

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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

/* Scrollbar styling */
.products-list::-webkit-scrollbar {
  width: 8px;
}

.products-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.products-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.products-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
