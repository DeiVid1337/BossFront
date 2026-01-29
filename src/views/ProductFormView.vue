<script setup lang="ts">
/**
 * Product Form View (Create/Edit)
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: brand, name, flavor. Admin apenas. Tratar 422 (duplicata)
 */

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProduct, createProduct, updateProduct } from '@/api/endpoints/products'
import type { CreateProductRequest, UpdateProductRequest } from '@/api/types'
import { ValidationError } from '@/api/types'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'product-edit')
const productId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// Form state
const brand = ref('')
const name = ref('')
const flavor = ref('')

// UI state
const loading = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

// Load product for edit
async function loadProduct() {
  if (!isEdit.value || !productId.value) return

  loading.value = true
  error.value = null

  try {
    const product = await getProduct(productId.value)
    brand.value = product.brand
    name.value = product.name
    flavor.value = product.flavor
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar produto'
    if (err instanceof Error && err.message.includes('404')) {
      router.push('/products')
    }
  } finally {
    loading.value = false
  }
}

// Submit form
async function handleSubmit() {
  // Validação client-side
  const errors: Record<string, string[]> = {}
  if (!brand.value.trim()) {
    errors.brand = ['A marca é obrigatória']
  }
  if (!name.value.trim()) {
    errors.name = ['O nome é obrigatório']
  }
  if (!flavor.value.trim()) {
    errors.flavor = ['O sabor é obrigatório']
  }

  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors
    return
  }

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    if (isEdit.value && productId.value) {
      const data: UpdateProductRequest = {
        brand: brand.value.trim(),
        name: name.value.trim(),
        flavor: flavor.value.trim(),
      }
      await updateProduct(productId.value, data)
      router.push(`/products/${productId.value}`)
    } else {
      const data: CreateProductRequest = {
        brand: brand.value.trim(),
        name: name.value.trim(),
        flavor: flavor.value.trim(),
      }
      const newProduct = await createProduct(data)
      router.push(`/products/${newProduct.id}`)
    }
  } catch (err) {
    if (err instanceof ValidationError && err.errors) {
      fieldErrors.value = err.errors
      // Mensagem especial para duplicata
      if (err.errors.brand || err.errors.name || err.errors.flavor) {
        error.value =
          'Já existe um produto com esta combinação de marca, nome e sabor. Por favor, escolha valores diferentes.'
      }
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao salvar produto'
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  router.push('/products')
}

onMounted(() => {
  if (isEdit.value) {
    loadProduct()
  }
})
</script>

<template>
  <div class="product-form-page">
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
        <h1 class="page-title">{{ isEdit ? 'Editar Produto' : 'Novo Produto' }}</h1>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-card">
          <p class="loading-text">Carregando...</p>
        </div>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="product-form-card">
        <!-- Error message geral -->
        <div
          v-if="error && !fieldErrors.brand && !fieldErrors.name && !fieldErrors.flavor"
          class="error-message-general"
        >
          {{ error }}
        </div>

        <!-- Brand Field -->
        <div class="form-group">
          <label for="brand" class="form-label">
            Marca
            <span class="required-asterisk">*</span>
          </label>
          <input
            id="brand"
            v-model="brand"
            type="text"
            class="form-input"
            :class="{ 'form-input-error': fieldErrors.brand }"
            :aria-invalid="!!fieldErrors.brand"
            :aria-describedby="fieldErrors.brand ? 'brand-error' : undefined"
            placeholder="Marca do produto"
            required
          />
          <div
            v-if="fieldErrors.brand"
            id="brand-error"
            class="form-error"
            role="alert"
            aria-live="polite"
          >
            {{ fieldErrors.brand[0] }}
          </div>
        </div>

        <!-- Name Field -->
        <div class="form-group">
          <label for="name" class="form-label">
            Nome
            <span class="required-asterisk">*</span>
          </label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="form-input"
            :class="{ 'form-input-error': fieldErrors.name }"
            :aria-invalid="!!fieldErrors.name"
            :aria-describedby="fieldErrors.name ? 'name-error' : undefined"
            placeholder="Nome do produto"
            required
          />
          <div
            v-if="fieldErrors.name"
            id="name-error"
            class="form-error"
            role="alert"
            aria-live="polite"
          >
            {{ fieldErrors.name[0] }}
          </div>
        </div>

        <!-- Flavor Field -->
        <div class="form-group">
          <label for="flavor" class="form-label">
            Sabor
            <span class="required-asterisk">*</span>
          </label>
          <input
            id="flavor"
            v-model="flavor"
            type="text"
            class="form-input"
            :class="{ 'form-input-error': fieldErrors.flavor }"
            :aria-invalid="!!fieldErrors.flavor"
            :aria-describedby="fieldErrors.flavor ? 'flavor-error' : undefined"
            placeholder="Sabor do produto"
            required
          />
          <div
            v-if="fieldErrors.flavor"
            id="flavor-error"
            class="form-error"
            role="alert"
            aria-live="polite"
          >
            {{ fieldErrors.flavor[0] }}
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" @click="cancel" class="btn-cancel">
            Cancelar
          </button>
          <button type="submit" class="btn-submit" :disabled="submitting">
            <span v-if="submitting">Salvando...</span>
            <span v-else>{{ isEdit ? 'Salvar' : 'Criar' }}</span>
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

.product-form-page {
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(111, 61, 255, 0.05);
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
   ERROR MESSAGE
   ============================================ */

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
  border-color: rgba(111, 61, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 3px rgba(111, 61, 255, 0.1);
}

.form-input-error {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.05);
}

.form-input-error:focus {
  border-color: rgba(239, 68, 68, 0.7);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-error {
  color: #FCA5A5;
  font-size: 14px;
  font-weight: 500;
  margin-top: 4px;
  line-height: 1.4;
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
  box-shadow: 0 6px 24px rgba(111, 61, 255, 0.35);
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
input:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
