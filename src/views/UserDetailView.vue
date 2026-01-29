<script setup lang="ts">
/**
 * User Detail View
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: mostrar campos do usuário. Edit/Delete apenas Admin
 */

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUser, deleteUser } from '@/api/endpoints/users'
import type { User } from '@/api/types'
import { ApiError } from '@/api/types'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userId = Number(route.params.id)

// State
const user = ref<User | null>(null)
const loading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)
const showDeleteModal = ref(false)

// Verificar permissões
const isAdmin = computed(() => authStore.user?.role === 'admin')
const isCurrentUser = computed(() => authStore.user?.id === userId)

const deleteMessage = computed(() => {
  if (!user.value) return ''
  return `Tem certeza que deseja deletar o usuário "${user.value.name}" (${user.value.email})? Esta ação não pode ser desfeita.`
})

// Load user
async function loadUser() {
  loading.value = true
  error.value = null

  try {
    user.value = await getUser(userId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar usuário'
    if (err instanceof Error && err.message.includes('404')) {
      router.push('/users')
    }
  } finally {
    loading.value = false
  }
}

function goToEdit() {
  router.push(`/users/${userId}/edit`)
}

function showDelete() {
  showDeleteModal.value = true
}

async function handleDelete() {
  deleting.value = true
  try {
    await deleteUser(userId)
    router.push('/users')
  } catch (err) {
    // Tratar erro 403 (não pode deletar próprio usuário)
    if (err instanceof ApiError && err.status === 403) {
      error.value = 'Você não pode deletar sua própria conta.'
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao deletar usuário'
    }
    showDeleteModal.value = false
  } finally {
    deleting.value = false
  }
}

function cancelDelete() {
  showDeleteModal.value = false
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
  }
  return labels[role] || role
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadUser()
})
</script>

<template>
  <div class="user-detail-view">
    <div class="page-header">
      <button @click="router.push('/users')" class="btn-back">← Voltar</button>
      <h1>Detalhes do Usuário</h1>
      <div v-if="isAdmin" class="header-actions">
        <button @click="goToEdit" class="btn-primary">Editar</button>
        <button @click="showDelete" class="btn-danger" :disabled="isCurrentUser">Deletar</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-message">Carregando...</div>

    <!-- Error -->
    <div v-else-if="error && !user" class="error-message">{{ error }}</div>

    <!-- User Details -->
    <div v-else-if="user" class="user-details">
      <!-- User Info Card -->
      <div class="info-card">
        <h2>Informações do Usuário</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Nome</label>
            <p>{{ user.name }}</p>
          </div>
          <div class="info-item">
            <label>Email</label>
            <p>{{ user.email }}</p>
          </div>
          <div class="info-item">
            <label>Role</label>
            <p>
              <span class="role-badge" :class="user.role">{{ getRoleLabel(user.role) }}</span>
            </p>
          </div>
          <div class="info-item">
            <label>Loja</label>
            <p v-if="user.store">{{ user.store.name }}</p>
            <p v-else class="no-store">—</p>
          </div>
          <div class="info-item">
            <label>Status</label>
            <p>
              <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                {{ user.is_active ? 'Ativo' : 'Inativo' }}
              </span>
            </p>
          </div>
          <div class="info-item">
            <label>Data de Criação</label>
            <p>{{ formatDate(user.created_at) }}</p>
          </div>
          <div class="info-item">
            <label>Última Atualização</label>
            <p>{{ formatDate(user.updated_at) }}</p>
          </div>
        </div>
      </div>

      <!-- Warning if current user -->
      <div v-if="isCurrentUser && isAdmin" class="warning-message">
        <strong>Atenção:</strong> Você está visualizando seu próprio perfil. Você não pode deletar
        sua própria conta.
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <ConfirmModal
      v-if="isAdmin"
      :show="showDeleteModal"
      title="Deletar Usuário"
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
.user-detail-view {
  max-width: 1000px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
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

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.user-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 2rem;
}

.info-card h2 {
  font-size: 1.5rem;
  color: #1a202c;
  margin: 0 0 1.5rem 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-item p {
  font-size: 1.125rem;
  color: #2d3748;
  margin: 0;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.role-badge.admin {
  background: #dbeafe;
  color: #1e40af;
}

.role-badge.manager {
  background: #d1fae5;
  color: #065f46;
}

.role-badge.seller {
  background: #fef3c7;
  color: #92400e;
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

.no-store {
  color: #a0aec0;
  font-style: italic;
}

.warning-message {
  background: #fef3c7;
  color: #92400e;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #fde68a;
}
</style>
