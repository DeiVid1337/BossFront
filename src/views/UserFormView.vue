<script setup lang="ts">
/**
 * User Form View (Criar/Editar usuário)
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: name, email, password (required on create), role, store_id, is_active
 * Admin only. Quando role = admin, store_id deve ser null
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUser, createUser, updateUser } from '@/api/endpoints/users'
import { getStores } from '@/api/endpoints/stores'
import type { CreateUserRequest, UpdateUserRequest, Store } from '@/api/types'
import { ValidationError } from '@/api/types'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'user-edit')
const userId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// Form state
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref<'admin' | 'manager' | 'seller'>('seller')
const storeId = ref<number | null>(null)
const isActive = ref(true)

// Stores list (para select)
const stores = ref<Store[]>([])

// UI state
const loading = ref(false)
const loadingStores = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

// Computed: mostrar select de loja apenas se role é manager ou seller
const showStoreSelect = computed(() => role.value === 'manager' || role.value === 'seller')

// Watch: quando role muda para admin, limpar store_id
watch(role, newRole => {
  if (newRole === 'admin') {
    storeId.value = null
  }
})

// Load stores
async function loadStores() {
  loadingStores.value = true
  try {
    const response = await getStores({ per_page: 100 })
    if (response && typeof response === 'object' && 'data' in response) {
      stores.value = Array.isArray(response.data) ? response.data : []
    }
  } catch (err) {
    console.error('Erro ao carregar lojas:', err)
  } finally {
    loadingStores.value = false
  }
}

// Load user for edit
async function loadUser() {
  if (!userId.value) return

  loading.value = true
  error.value = null

  try {
    const user = await getUser(userId.value)
    name.value = user.name
    email.value = user.email
    role.value = user.role
    storeId.value = user.store_id
    isActive.value = user.is_active
    // Password não é carregado (não vem da API)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar usuário'
    if (err instanceof Error && err.message.includes('404')) {
      router.push('/users')
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

  if (!email.value || !email.value.trim()) {
    errors.email = ['O email é obrigatório']
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.email = ['O email deve ser válido']
  }

  if (!isEdit.value && (!password.value || password.value.length < 8)) {
    errors.password = ['A senha é obrigatória e deve ter pelo menos 8 caracteres']
  }

  if (showStoreSelect.value && !storeId.value) {
    errors.store_id = ['A loja é obrigatória para gerentes e vendedores']
  }

  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors
    return
  }

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    if (isEdit.value && userId.value) {
      const data: UpdateUserRequest = {
        name: name.value.trim(),
        email: email.value.trim(),
        role: role.value,
        store_id: role.value === 'admin' ? null : storeId.value,
        is_active: isActive.value,
      }
      // Só incluir password se foi preenchido
      if (password.value && password.value.length >= 8) {
        data.password = password.value
      }
      await updateUser(userId.value, data)
    } else {
      const data: CreateUserRequest = {
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
        role: role.value,
        store_id: role.value === 'admin' ? null : storeId.value || null,
        is_active: isActive.value,
      }
      await createUser(data)
    }
    router.push('/users')
  } catch (err) {
    if (err instanceof ValidationError && err.errors) {
      fieldErrors.value = err.errors
      // Mensagem especial para email duplicado
      if (err.message.includes('email') || err.message.includes('Email')) {
        error.value = 'Este email já está cadastrado para outro usuário.'
      }
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao salvar usuário'
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  router.push('/users')
}

onMounted(async () => {
  await loadStores()
  if (isEdit.value) {
    await loadUser()
  }
})
</script>

<template>
  <div class="user-form-view">
    <div class="page-header">
      <button @click="cancel" class="btn-back">← Voltar</button>
      <h1>{{ isEdit ? 'Editar Usuário' : 'Novo Usuário' }}</h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-message">Carregando...</div>

    <!-- Form -->
    <form v-else @submit.prevent="handleSubmit" class="user-form">
      <!-- Error message -->
      <div
        v-if="
          error &&
          !fieldErrors.name &&
          !fieldErrors.email &&
          !fieldErrors.password &&
          !fieldErrors.store_id
        "
        class="error-message"
      >
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
          placeholder="Nome do usuário"
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

      <!-- Email -->
      <div class="form-group">
        <label for="email" class="form-label"> Email <span class="required">*</span> </label>
        <input
          id="email"
          v-model="email"
          type="email"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.email }"
          :aria-invalid="!!fieldErrors.email"
          :aria-describedby="fieldErrors.email ? 'email-error' : undefined"
          placeholder="email@exemplo.com"
          required
        />
        <div
          v-if="fieldErrors.email"
          id="email-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.email[0] }}
        </div>
      </div>

      <!-- Password -->
      <div class="form-group">
        <label for="password" class="form-label">
          Senha <span class="required" v-if="!isEdit">*</span>
          <span v-else class="optional">(opcional, deixe em branco para manter)</span>
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="form-input"
          :class="{ 'form-input-error': fieldErrors.password }"
          :aria-invalid="!!fieldErrors.password"
          :aria-describedby="fieldErrors.password ? 'password-error' : undefined"
          :placeholder="
            isEdit ? 'Deixe em branco para manter a senha atual' : 'Mínimo 8 caracteres'
          "
          :required="!isEdit"
          :minlength="isEdit ? undefined : 8"
        />
        <div
          v-if="fieldErrors.password"
          id="password-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.password[0] }}
        </div>
      </div>

      <!-- Role -->
      <div class="form-group">
        <label for="role" class="form-label"> Role <span class="required">*</span> </label>
        <select
          id="role"
          v-model="role"
          class="form-select"
          :class="{ 'form-input-error': fieldErrors.role }"
          :aria-invalid="!!fieldErrors.role"
          :aria-describedby="fieldErrors.role ? 'role-error' : undefined"
          required
        >
          <option value="admin">Administrador</option>
          <option value="manager">Gerente</option>
          <option value="seller">Vendedor</option>
        </select>
        <div
          v-if="fieldErrors.role"
          id="role-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.role[0] }}
        </div>
      </div>

      <!-- Store (apenas para manager/seller) -->
      <div v-if="showStoreSelect" class="form-group">
        <label for="store_id" class="form-label"> Loja <span class="required">*</span> </label>
        <select
          id="store_id"
          v-model="storeId"
          class="form-select"
          :class="{ 'form-input-error': fieldErrors.store_id }"
          :aria-invalid="!!fieldErrors.store_id"
          :aria-describedby="fieldErrors.store_id ? 'store_id-error' : undefined"
          :disabled="loadingStores"
          required
        >
          <option :value="null">Selecione uma loja...</option>
          <option v-for="store in stores" :key="store.id" :value="store.id">
            {{ store.name }}
          </option>
        </select>
        <div
          v-if="fieldErrors.store_id"
          id="store_id-error"
          class="form-error"
          role="alert"
          aria-live="polite"
        >
          {{ fieldErrors.store_id[0] }}
        </div>
      </div>

      <!-- Is Active -->
      <div class="form-group">
        <label class="form-checkbox-label">
          <input v-model="isActive" type="checkbox" class="form-checkbox" />
          <span>Usuário ativo</span>
        </label>
        <div v-if="fieldErrors.is_active" class="form-error">
          {{ fieldErrors.is_active[0] }}
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
.user-form-view {
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

.user-form {
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

.optional {
  color: #718096;
  font-size: 0.875rem;
  font-weight: normal;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9375rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
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
