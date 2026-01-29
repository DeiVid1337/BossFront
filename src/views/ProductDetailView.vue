<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getProduct, deleteProduct } from '@/api/endpoints/products'
import type { Product } from '@/api/types'
import { ApiError } from '@/api/types'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const product = ref<Product | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const showDeleteModal = ref(false)
const deleting = ref(false)

const productId = Number(route.params.id)
const isAdmin = computed(() => authStore.user?.role === 'admin')

const deleteMessage = computed(() => {
  if (!product.value) return ''
  return `Tem certeza que deseja deletar o produto "${product.value.brand} ${product.value.name} - ${product.value.flavor}"? Esta ação não pode ser desfeita.`
})

async function loadProduct() {
  loading.value = true
  error.value = null

  try {
    product.value = await getProduct(productId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar produto'
    if (err instanceof Error && err.message.includes('404')) {
      router.push('/products')
    }
  } finally {
    loading.value = false
  }
}

function goToEdit() {
  router.push(`/products/${productId}/edit`)
}

function showDelete() {
  showDeleteModal.value = true
}

async function handleDelete() {
  deleting.value = true
  try {
    await deleteProduct(productId)
    router.push('/products')
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      error.value =
        'Não é possível deletar este produto pois ele está sendo usado em uma ou mais lojas. Remova o produto das lojas antes de deletá-lo.'
    } else {
      error.value = err instanceof Error ? err.message : 'Erro ao deletar produto'
    }
    showDeleteModal.value = false
  } finally {
    deleting.value = false
  }
}

function cancelDelete() {
  showDeleteModal.value = false
}

onMounted(() => {
  loadProduct()
})
</script>

<template>
  <!-- Background com gradiente dark + orbs decorativos -->
  <div class="min-h-screen bg-gradient-to-br from-[#0A0000] via-[#1A0000] to-black text-white relative overflow-hidden">
    <!-- Efeitos de fundo decorativos (orbs) -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E70000]/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00A6FF]/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s"></div>
      <div class="absolute top-1/2 right-1/3 w-72 h-72 bg-[#FFD700]/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s"></div>
    </div>

    <div class="relative z-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 max-w-4xl mx-auto">
      <!-- Header com botão voltar e ações -->
      <div class="mb-6 sm:mb-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <button
            @click="router.push('/products')"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E70000] focus:ring-offset-2 focus:ring-offset-black"
          >
            <span>←</span>
            <span>Voltar</span>
          </button>
          
          <div v-if="isAdmin" class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              @click="goToEdit"
              class="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#E70000] via-[#FF7F00] to-[#FFD700] shadow-lg shadow-[#E70000]/25 hover:shadow-xl hover:shadow-[#E70000]/30 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#E70000] focus:ring-offset-2 focus:ring-offset-black"
            >
              Editar
            </button>
            <button
              @click="showDelete"
              class="px-6 py-3 rounded-xl font-semibold text-white bg-red-400/20 backdrop-blur-lg border border-red-400/30 hover:bg-red-400/30 hover:border-red-400/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-black"
            >
              Deletar
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-[#E70000]/5 p-8 sm:p-10">
          <p class="text-lg font-medium text-white">Carregando produto...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="rounded-2xl bg-red-400/10 backdrop-blur-xl border border-red-400/30 shadow-xl p-5 sm:p-6 mb-6"
      >
        <p class="text-red-400 font-medium">{{ error }}</p>
      </div>

      <!-- Product Details -->
      <div v-else-if="product" class="space-y-6 sm:space-y-8">
        <!-- Hero Section - Título do Produto -->
        <div class="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-[#E70000]/5 p-6 sm:p-8">
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
            {{ product.brand }} {{ product.name }}
          </h1>
          <p class="text-lg sm:text-xl text-slate-200 font-medium">
            {{ product.flavor }}
          </p>
        </div>

        <!-- Informações do Produto - Glass Card -->
        <div class="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-[#E70000]/5 p-6 sm:p-8">
          <h2 class="text-2xl sm:text-3xl font-bold text-white mb-6">Informações</h2>
          
          <div class="space-y-4 sm:space-y-5">
            <!-- Marca -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-4 sm:pb-5 border-b border-white/10">
              <span class="text-sm font-medium text-slate-200 sm:w-32 flex-shrink-0">Marca</span>
              <span class="text-base sm:text-lg font-semibold text-white">{{ product.brand }}</span>
            </div>

            <!-- Nome -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-4 sm:pb-5 border-b border-white/10">
              <span class="text-sm font-medium text-slate-200 sm:w-32 flex-shrink-0">Nome</span>
              <span class="text-base sm:text-lg font-semibold text-white">{{ product.name }}</span>
            </div>

            <!-- Sabor -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-4 sm:pb-5 border-b border-white/10">
              <span class="text-sm font-medium text-slate-200 sm:w-32 flex-shrink-0">Sabor</span>
              <span class="text-base sm:text-lg font-semibold text-[#E70000]">{{ product.flavor }}</span>
            </div>

            <!-- Criado em -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-4 sm:pb-5 border-b border-white/10">
              <span class="text-sm font-medium text-slate-200 sm:w-32 flex-shrink-0">Criado em</span>
              <span class="text-base text-slate-200">
                {{ new Date(product.created_at).toLocaleString('pt-BR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) }}
              </span>
            </div>

            <!-- Atualizado em -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span class="text-sm font-medium text-slate-200 sm:w-32 flex-shrink-0">Atualizado em</span>
              <span class="text-base text-slate-200">
                {{ new Date(product.updated_at).toLocaleString('pt-BR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Ações Rápidas (se admin) -->
        <div v-if="isAdmin" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            @click="goToEdit"
            class="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl hover:shadow-[#E70000]/10 transition-all duration-200 group"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-[#E70000] to-[#FF7F00] flex items-center justify-center text-2xl">
                ✏️
              </div>
              <div class="text-left">
                <div class="text-white font-semibold text-lg mb-1">Editar Produto</div>
                <div class="text-slate-400 text-sm">Modificar informações</div>
              </div>
            </div>
          </button>

          <button
            @click="showDelete"
            class="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 hover:bg-white/15 hover:border-red-400/30 hover:shadow-2xl hover:shadow-red-400/10 transition-all duration-200 group"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-red-400/20 flex items-center justify-center text-2xl">
                🗑️
              </div>
              <div class="text-left">
                <div class="text-white font-semibold text-lg mb-1">Deletar Produto</div>
                <div class="text-slate-400 text-sm">Remover permanentemente</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-if="isAdmin"
      :show="showDeleteModal"
      title="Deletar Produto"
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
/* Animações suaves para orbs */
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

.animate-pulse {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Melhorias de acessibilidade */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
