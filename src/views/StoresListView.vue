<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStoreList } from '@/composables/useStoreList'
import Pagination from '@/components/ui/Pagination.vue'

const router = useRouter()
const storeList = useStoreList()

// Carregar stores ao montar
onMounted(() => {
  storeList.loadStores()
})

// Observar mudanças na página (evitar loop infinito)
watch(
  () => storeList.currentPage.value,
  (newPage, oldPage) => {
    // Só recarregar se a página realmente mudou
    // O composable já tem proteção contra chamadas duplicadas
    if (newPage !== oldPage && oldPage !== undefined) {
      storeList.loadStores()
    }
  }
)

async function handleSearch() {
  await storeList.applyFilters()
}

async function handleFilterChange() {
  await storeList.applyFilters()
}

function handleSort(field: 'name' | 'is_active' | 'created_at') {
  storeList.setSort(field)
}

function goToStore(id: number) {
  router.push(`/stores/${id}`)
}

function goToCreate() {
  router.push('/stores/new')
}

function getSortIcon(field: 'name' | 'is_active' | 'created_at'): string {
  if (storeList.sortBy.value !== field) return '⇅'
  return storeList.sortOrder.value === 'asc' ? '↑' : '↓'
}
</script>

<template>
  <div class="stores-list-view">
    <div class="page-header">
      <h1>Lojas</h1>
      <button @click="goToCreate" class="btn-primary">Nova Loja</button>
    </div>

    <!-- Filtros e busca -->
    <div class="filters-section">
      <div class="search-box">
        <input
          :value="typeof storeList.search.value === 'string' ? storeList.search.value : ''"
          @input="
            e => {
              storeList.search.value = (e.target as HTMLInputElement).value
            }
          "
          type="text"
          placeholder="Buscar por nome..."
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <button @click="handleSearch" class="btn-search">Buscar</button>
      </div>

      <div class="filters">
        <select v-model="storeList.isActive" @change="handleFilterChange" class="filter-select">
          <option :value="undefined">Todas as lojas</option>
          <option :value="true">Apenas ativas</option>
          <option :value="false">Apenas inativas</option>
        </select>

        <button @click="storeList.clearFilters" class="btn-clear">Limpar</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="storeList.loading" class="loading-message">Carregando...</div>

    <!-- Erro -->
    <div v-else-if="storeList.error" class="error-message">
      {{ storeList.error }}
    </div>

    <!-- Tabela -->
    <div v-else-if="storeList.stores.value.length > 0" class="table-container">
      <table class="stores-table">
        <thead>
          <tr>
            <th @click="handleSort('name')" class="sortable">Nome {{ getSortIcon('name') }}</th>
            <th>Endereço</th>
            <th>Telefone</th>
            <th @click="handleSort('is_active')" class="sortable">
              Status {{ getSortIcon('is_active') }}
            </th>
            <th @click="handleSort('created_at')" class="sortable">
              Criado em {{ getSortIcon('created_at') }}
            </th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="store in storeList.stores.value"
            :key="store.id"
            @click="goToStore(store.id)"
            class="table-row"
          >
            <td class="store-name">{{ store.name }}</td>
            <td>{{ store.address || '-' }}</td>
            <td>{{ store.phone || '-' }}</td>
            <td>
              <span class="status-badge" :class="store.is_active ? 'active' : 'inactive'">
                {{ store.is_active ? 'Ativa' : 'Inativa' }}
              </span>
            </td>
            <td>{{ new Date(store.created_at).toLocaleDateString('pt-BR') }}</td>
            <td @click.stop>
              <button @click="router.push(`/stores/${store.id}/edit`)" class="btn-edit">
                Editar
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginação -->
      <Pagination
        :current-page="storeList.currentPage.value"
        :last-page="storeList.lastPage.value"
        :total="storeList.total.value"
        :per-page="storeList.perPage.value"
        @update:page="storeList.setPage"
      />
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <p>Nenhuma loja encontrada.</p>
    </div>
  </div>
</template>

<style scoped>
.stores-list-view {
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  color: #1a202c;
  margin: 0;
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

.filters-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.search-box {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  min-width: 300px;
}

.search-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.9375rem;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-search {
  background: #667eea;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  cursor: pointer;
}

.btn-search:hover {
  background: #5568d3;
}

.filters {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-select {
  padding: 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.9375rem;
  background: white;
  cursor: pointer;
}

.btn-clear {
  background: #e2e8f0;
  color: #4a5568;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  cursor: pointer;
}

.btn-clear:hover {
  background: #cbd5e0;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.loading-message {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.table-container {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.stores-table {
  width: 100%;
  border-collapse: collapse;
}

.stores-table thead {
  background: #f7fafc;
  border-bottom: 2px solid #e2e8f0;
}

.stores-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stores-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.stores-table th.sortable:hover {
  background: #edf2f7;
}

.stores-table tbody tr {
  border-bottom: 1px solid #e2e8f0;
  transition: background 0.2s;
}

.stores-table tbody tr:hover {
  background: #f7fafc;
}

.stores-table tbody tr.table-row {
  cursor: pointer;
}

.stores-table td {
  padding: 1rem;
  color: #2d3748;
  font-size: 0.9375rem;
}

.store-name {
  font-weight: 500;
  color: #1a202c;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
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

.btn-edit {
  background: #667eea;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-edit:hover {
  background: #5568d3;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  color: #718096;
}
</style>
