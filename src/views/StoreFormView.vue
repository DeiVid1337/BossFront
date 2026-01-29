<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStore, createStore, updateStore } from '@/api/endpoints/stores'
import type { CreateStoreRequest, UpdateStoreRequest } from '@/api/types'
import { ValidationError } from '@/api/types'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'store-edit')
const storeId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// Form state
const name = ref('')
const address = ref('')
const phone = ref('')
const isActive = ref(true)

// UI state
const loading = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

// Load store for edit
async function loadStore() {
  if (!isEdit.value || !storeId.value) return

  loading.value = true
  error.value = null

  try {
    const store = await getStore(storeId.value)
    name.value = store.name
    address.value = store.address || ''
    phone.value = store.phone || ''
    isActive.value = store.is_active
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar loja'
    if (err instanceof Error && err.message.includes('404')) {
      router.push('/stores')
    }
  } finally {
    loading.value = false
  }
}

// Submit form
async function handleSubmit() {
  if (!name.value.trim()) {
    fieldErrors.value = { name: ['O nome é obrigatório'] }
    return
  }

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    if (isEdit.value && storeId.value) {
      const data: UpdateStoreRequest = {
        name: name.value.trim(),
        address: address.value.trim() || null,
        phone: phone.value.trim() || null,
        is_active: isActive.value,
      }
      await updateStore(storeId.value, data)
    } else {
      const data: CreateStoreRequest = {
        name: name.value.trim(),
        address: address.value.trim() || null,
        phone: phone.value.trim() || null,
        is_active: isActive.value,
      }
      const newStore = await createStore(data)
      router.push(`/stores/${newStore.id}`)
      return
    }

    // Edit success - redirect to detail
    router.push(`/stores/${storeId.value}`)
  } catch (err) {
    if (err instanceof ValidationError && err.errors) {
      fieldErrors.value = err.errors
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao salvar loja'
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  if (isEdit.value && storeId.value) {
    router.push(`/stores/${storeId.value}`)
  } else {
    router.push('/stores')
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadStore()
  }
})
</script>

<template>
  <div class="store-form-view">
    <div class="page-header">
      <button @click="cancel" class="btn-back">← Voltar</button>
      <h1>{{ isEdit ? 'Editar Loja' : 'Nova Loja' }}</h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-message">Carregando...</div>

    <!-- Form -->
    <form v-else @submit.prevent="handleSubmit" class="store-form">
      <!-- Error message -->
      <div v-if="error && !fieldErrors.name" class="error-message">
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
          placeholder="Nome da loja"
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

      <!-- Address -->
      <div class="form-group">
        <label for="address" class="form-label">Endereço</label>
        <input
          id="address"
          v-model="address"
          type="text"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.address }"
          :aria-invalid="!!fieldErrors.address"
          :aria-describedby="fieldErrors.address ? 'address-error' : undefined"
          placeholder="Endereço da loja"
        />
        <div
          v-if="fieldErrors.address"
          id="address-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.address[0] }}
        </div>
      </div>

      <!-- Phone -->
      <div class="form-group">
        <label for="phone" class="form-label">Telefone</label>
        <input
          id="phone"
          v-model="phone"
          type="text"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.phone }"
          :aria-invalid="!!fieldErrors.phone"
          :aria-describedby="fieldErrors.phone ? 'phone-error' : undefined"
          placeholder="Telefone da loja"
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

      <!-- Is Active -->
      <div class="form-group">
        <label class="form-checkbox-label">
          <input v-model="isActive" type="checkbox" class="form-checkbox" />
          <span>Loja ativa</span>
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
          <span v-else>{{ isEdit ? 'Salvar' : 'Criar' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.store-form-view {
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

.store-form {
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
