<script setup lang="ts">
/**
 * Customer Form View (Criar/Editar cliente)
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: name, phone. Validação: required, unique phone → 422
 */

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCustomer, createCustomer, updateCustomer } from '@/api/endpoints/customers'
import type { CreateCustomerRequest, UpdateCustomerRequest } from '@/api/types'
import { ValidationError } from '@/api/types'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'customer-edit')
const customerId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// Form state
const name = ref('')
const phone = ref('')

// UI state
const loading = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

// Load customer for edit
async function loadCustomer() {
  if (!customerId.value) return

  loading.value = true
  error.value = null

  try {
    const customer = await getCustomer(customerId.value)
    name.value = customer.name
    phone.value = customer.phone
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cliente'
    if (err instanceof Error && err.message.includes('404')) {
      router.push('/customers')
    }
  } finally {
    loading.value = false
  }
}

// Submit form
async function handleSubmit() {
  // Validação client-side
  const errors: Record<string, string[]> = {}

  if (!name.value || !name.value.trim()) {
    errors.name = ['O nome é obrigatório']
  }

  if (!phone.value || !phone.value.trim()) {
    errors.phone = ['O telefone é obrigatório']
  }

  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors
    return
  }

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    if (isEdit.value && customerId.value) {
      const data: UpdateCustomerRequest = {
        name: name.value.trim(),
        phone: phone.value.trim(),
      }
      await updateCustomer(customerId.value, data)
    } else {
      const data: CreateCustomerRequest = {
        name: name.value.trim(),
        phone: phone.value.trim(),
      }
      await createCustomer(data)
    }
    router.push('/customers')
  } catch (err) {
    if (err instanceof ValidationError && err.errors) {
      fieldErrors.value = err.errors
      // Mensagem especial para telefone duplicado
      if (err.message.includes('phone') || err.message.includes('telefone')) {
        error.value = 'Este telefone já está cadastrado para outro cliente.'
      }
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao salvar cliente'
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  router.push('/customers')
}

onMounted(() => {
  if (isEdit.value) {
    loadCustomer()
  }
})
</script>

<template>
  <div class="customer-form-view">
    <div class="page-header">
      <button @click="cancel" class="btn-back">← Voltar</button>
      <h1>{{ isEdit ? 'Editar Cliente' : 'Novo Cliente' }}</h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-message">Carregando...</div>

    <!-- Form -->
    <form v-else @submit.prevent="handleSubmit" class="customer-form">
      <!-- Error message -->
      <div v-if="error && !fieldErrors.name && !fieldErrors.phone" class="error-message">
        {{ error }}
      </div>

      <!-- Name -->
      <div class="form-group">
        <label for="name" class="form-label"> Nome <span class="required">*</span> </label>
        <input
          id="name"
          v-model="name"
          type="text"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.name }"
          :aria-invalid="!!fieldErrors.name"
          :aria-describedby="fieldErrors.name ? 'name-error' : undefined"
          placeholder="Nome do cliente"
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

      <!-- Phone -->
      <div class="form-group">
        <label for="phone" class="form-label"> Telefone <span class="required">*</span> </label>
        <input
          id="phone"
          v-model="phone"
          type="text"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.phone }"
          :aria-invalid="!!fieldErrors.phone"
          :aria-describedby="fieldErrors.phone ? 'phone-error' : undefined"
          placeholder="Telefone do cliente"
          required
        />
        <div
          v-if="fieldErrors.phone"
          id="phone-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.phone[0] }}
        </div>
      </div>

      <!-- Form actions -->
      <div class="form-actions">
        <button type="button" @click="cancel" class="btn-cancel">Cancelar</button>
        <button type="submit" class="btn-submit" :disabled="submitting">
          <span v-if="submitting">{{ isEdit ? 'Salvando...' : 'Criando...' }}</span>
          <span v-else>{{ isEdit ? 'Salvar' : 'Criar' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.customer-form-view {
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

.loading-message {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.customer-form {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 2rem;
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
