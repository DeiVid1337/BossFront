<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const hasPrevious = computed(() => props.currentPage > 1)
const hasNext = computed(() => props.currentPage < props.lastPage)

const startItem = computed(() => {
  if (props.total === 0) return 0
  return (props.currentPage - 1) * props.perPage + 1
})

const endItem = computed(() => {
  return Math.min(props.currentPage * props.perPage, props.total)
})

function goToPage(page: number) {
  if (page >= 1 && page <= props.lastPage && page !== props.currentPage) {
    emit('update:page', page)
  }
}

function previousPage() {
  if (hasPrevious.value) {
    goToPage(props.currentPage - 1)
  }
}

function nextPage() {
  if (hasNext.value) {
    goToPage(props.currentPage + 1)
  }
}

// Gera array de páginas para exibir
const pages = computed(() => {
  const pagesArray: (number | string)[] = []
  const maxPages = 7

  if (props.lastPage <= maxPages) {
    // Se há poucas páginas, mostrar todas
    for (let i = 1; i <= props.lastPage; i++) {
      pagesArray.push(i)
    }
  } else {
    // Lógica para mostrar páginas com ellipsis
    pagesArray.push(1)

    if (props.currentPage > 3) {
      pagesArray.push('...')
    }

    const start = Math.max(2, props.currentPage - 1)
    const end = Math.min(props.lastPage - 1, props.currentPage + 1)

    for (let i = start; i <= end; i++) {
      pagesArray.push(i)
    }

    if (props.currentPage < props.lastPage - 2) {
      pagesArray.push('...')
    }

    pagesArray.push(props.lastPage)
  }

  return pagesArray
})
</script>

<template>
  <div v-if="lastPage > 1" class="pagination">
    <div class="pagination-info">
      <span class="text-sm text-slate-200">Mostrando {{ startItem }} a {{ endItem }} de {{ total }} resultados</span>
    </div>
    <div class="pagination-controls">
      <button
        class="pagination-btn"
        :disabled="!hasPrevious"
        @click="previousPage"
        aria-label="Página anterior"
      >
        ‹
      </button>

      <template v-for="page in pages" :key="page">
        <button
          v-if="typeof page === 'number'"
          class="pagination-btn"
          :class="{ active: page === currentPage }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
        <span v-else class="pagination-ellipsis">{{ page }}</span>
      </template>

      <button
        class="pagination-btn"
        :disabled="!hasNext"
        @click="nextPage"
        aria-label="Próxima página"
      >
        ›
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-lg);
  padding: 1.5rem 2rem;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
}

@media (min-width: 640px) {
  .pagination {
    flex-direction: row;
  }
}

.pagination-info {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.pagination-btn {
  min-width: 3rem;
  min-height: 3rem;
  padding: 0 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 0.875rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  font-family: var(--font-body);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.2);
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(231, 0, 0, 0.5);
  color: #FFFFFF;
  transform: scale(1.05);
  box-shadow: 0 4px 20px 0 rgba(231, 0, 0, 0.2);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.3);
  transform: none;
}

.pagination-btn.active {
  background: linear-gradient(135deg, rgba(231, 0, 0, 0.4), rgba(255, 127, 0, 0.4), rgba(255, 215, 0, 0.4));
  color: #FFFFFF;
  border-color: rgba(231, 0, 0, 0.5);
  font-weight: 700;
  box-shadow: 0 4px 20px 0 rgba(231, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
}

.pagination-btn:focus {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}

.pagination-ellipsis {
  padding: 0 0.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}
</style>
