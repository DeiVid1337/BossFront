<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStore, deleteStore } from '@/api/endpoints/stores'
import type { Store } from '@/api/types'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()

const store = ref<Store | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const showDeleteModal = ref(false)
const deleting = ref(false)

const storeId = Number(route.params.id)

const deleteMessage = computed(() => {
  return `Tem certeza que deseja deletar a loja "${store.value?.name}"? Esta ação não pode ser desfeita.`
})

async function loadStore() {
  loading.value = true
  error.value = null

  try {
    store.value = await getStore(storeId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar loja'
    if (err instanceof Error && err.message.includes('404')) {
      router.push('/stores')
    }
  } finally {
    loading.value = false
  }
}

function goToEdit() {
  router.push(`/stores/${storeId}/edit`)
}

function showDelete() {
  showDeleteModal.value = true
}

async function handleDelete() {
  deleting.value = true
  try {
    await deleteStore(storeId)
    router.push('/stores')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao deletar loja'
    showDeleteModal.value = false
  } finally {
    deleting.value = false
  }
}

function cancelDelete() {
  showDeleteModal.value = false
}

onMounted(() => {
  loadStore()
})
</script>

<template>
  <div class="store-detail-view">
    <div class="page-header">
      <button @click="router.push('/stores')" class="btn-back">← Voltar</button>
      <div class="header-actions">
        <button @click="goToEdit" class="btn-primary">Editar</button>
        <button @click="showDelete" class="btn-danger">Deletar</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-message">Carregando...</div>

    <!-- Error -->
    <div v-else-if="error" class="error-message">{{ error }}</div>

    <!-- Store details -->
    <div v-else-if="store" class="store-details">
      <h1>{{ store.name }}</h1>

      <div class="detail-card">
        <div class="detail-row">
          <span class="detail-label">Nome:</span>
          <span class="detail-value">{{ store.name }}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Endereço:</span>
          <span class="detail-value">{{ store.address || '-' }}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Telefone:</span>
          <span class="detail-value">{{ store.phone || '-' }}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="status-badge" :class="store.is_active ? 'active' : 'inactive'">
            {{ store.is_active ? 'Ativa' : 'Inativa' }}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Criado em:</span>
          <span class="detail-value">
            {{ new Date(store.created_at).toLocaleString('pt-BR') }}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Atualizado em:</span>
          <span class="detail-value">
            {{ new Date(store.updated_at).toLocaleString('pt-BR') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Deletar Loja"
      :message="deleteMessage"
      confirm-text="Deletar"
      cancel-text="Cancelar"
      variant="danger"
      @confirm="handleDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.store-detail-view {
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
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

.header-actions {
  display: flex;
  gap: 0.75rem;
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

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.store-details h1 {
  font-size: 2rem;
  color: #1a202c;
  margin: 0 0 2rem 0;
}

.detail-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 2rem;
}

.detail-row {
  display: flex;
  padding: 1rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  color: #4a5568;
  width: 150px;
  flex-shrink: 0;
}

.detail-value {
  color: #2d3748;
  flex: 1;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}
</style>
