<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getStoreProducts } from '@/api/endpoints/storeProducts'
import { useStoreContext } from '@/composables/useStoreContext'
import type { StoreProduct } from '@/api/types'

interface GroupedProduct {
  brand: string
  name: string
  salePrice: string
  flavors: string[]
}

const storeContext = useStoreContext()
const storeId = computed(() => {
  const id = storeContext.storeId.value
  return typeof id === 'number' ? id : null
})

const loading = ref(false)
const error = ref<string | null>(null)
const storeProducts = ref<StoreProduct[]>([])
const copySuccess = ref(false)

// Agrupar produtos por marca, nome e preço
const groupedProducts = computed(() => {
  const grouped: Record<string, Record<string, GroupedProduct>> = {}

  storeProducts.value.forEach(sp => {
    // Remover produtos sem product relacionado, inativos ou com estoque menor que 1
    if (!sp.product || !sp.is_active || sp.stock_quantity < 1) {
      return
    }

    const brand = sp.product.brand
    const name = sp.product.name
    const salePrice = sp.sale_price
    const flavor = sp.product.flavor

    // Criar chave única: marca + nome + preço
    const key = `${brand}|${name}|${salePrice}`

    if (!grouped[brand]) {
      grouped[brand] = {}
    }

    if (!grouped[brand][key]) {
      grouped[brand][key] = {
        brand,
        name,
        salePrice,
        flavors: [],
      }
    }

    // Adicionar sabor se ainda não estiver na lista
    if (!grouped[brand][key].flavors.includes(flavor)) {
      grouped[brand][key].flavors.push(flavor)
    }
  })

  // Converter para array e ordenar
  const result: Record<string, GroupedProduct[]> = {}
  Object.keys(grouped)
    .sort()
    .forEach(brand => {
      const brandProducts = grouped[brand]
      if (brandProducts) {
        result[brand] = Object.values(brandProducts).sort((a, b) => {
          // Ordenar por nome, depois por preço
          if (a.name !== b.name) {
            return a.name.localeCompare(b.name)
          }
          return parseFloat(a.salePrice) - parseFloat(b.salePrice)
        })
      }
    })

  return result
})

// Gerar markdown
const markdownContent = computed(() => {
  const lines: string[] = []
  const grouped = groupedProducts.value

  // Título com emojis
  lines.push('🔥 *BOSS PODS PMW* 🔥')
  lines.push('')
  lines.push('')

  // Informações promocionais
  lines.push('⚫️ *Boss Fidelidade* - Junte 10 selos e troque por um *IGNITE V80*')
  lines.push('')

  // Frete grátis (usar nome da loja se disponível)
  const storeName = storeContext.currentStoreName.value || 'Palmas'
  lines.push(`⚫️ *Frete Grátis* para toda região central de ${storeName}`)
  lines.push('')
  lines.push('')

  // Produtos agrupados por marca
  Object.keys(grouped).forEach(brand => {
    const brandProducts = grouped[brand]
    if (brandProducts) {
      brandProducts.forEach(product => {
        const price = parseFloat(product.salePrice).toFixed(2).replace('.', ',')
        // Formato: 🔴 NOME - R$PRECO (sem negrito, apenas emoji)
        lines.push(`🔴 *${product.name} - R$${price}*`)

        // Sabores com asterisco
        product.flavors.sort().forEach(flavor => {
          lines.push(`- ${flavor}`)
        })

        lines.push('')
      })
    }
  })

  return lines.join('\n')
})

async function loadProducts() {
  if (!storeId.value) {
    error.value = 'Nenhuma loja selecionada'
    return
  }

  loading.value = true
  error.value = null

  try {
    // Buscar todos os produtos ativos com estoque (máximo 100 por página)
    const allProducts: StoreProduct[] = []
    let currentPage = 1
    let hasMore = true

    while (hasMore) {
      // Não enviar is_active como parâmetro, pois pode causar erro de validação
      // O filtro será feito no frontend após receber os dados
      const response = await getStoreProducts(storeId.value, {
        per_page: 100, // Limite máximo da API
        page: currentPage,
      })

      if (response && typeof response === 'object' && 'data' in response) {
        const products = Array.isArray(response.data) ? response.data : []
        // Filtrar apenas produtos ativos com estoque >= 1 e que tenham product relacionado
        const filtered = products.filter(sp => sp.stock_quantity >= 1 && sp.product && sp.is_active)
        allProducts.push(...filtered)

        // Verificar se há mais páginas
        const meta = response.meta
        if (meta && meta.current_page && meta.last_page) {
          hasMore = meta.current_page < meta.last_page
          currentPage++
        } else {
          hasMore = false
        }
      } else {
        error.value = 'Resposta da API em formato inesperado'
        storeProducts.value = []
        return
      }
    }

    storeProducts.value = allProducts
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar produtos'
    storeProducts.value = []
  } finally {
    loading.value = false
  }
}

function copyToClipboard() {
  try {
    navigator.clipboard.writeText(markdownContent.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (err) {
    console.error('Erro ao copiar:', err)
    error.value = 'Erro ao copiar lista'
  }
}

onMounted(() => {
  loadProducts()
})
</script>

<template>
  <div class="lista-page">
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
        <div class="header-content">
          <h1 class="page-title">Lista de Produtos</h1>
          <button
            @click="loadProducts"
            class="btn-primary"
            :disabled="loading"
            type="button"
          >
            <span v-if="loading">Carregando...</span>
            <span v-else>Atualizar</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-card">
          <p class="loading-text">Carregando produtos...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="error-state"
      >
        <p class="error-text">{{ error }}</p>
      </div>

      <!-- No Store Selected -->
      <div
        v-else-if="!storeId"
        class="info-state"
      >
        <div class="info-card">
          <p class="info-text">Selecione uma loja para visualizar a lista de produtos.</p>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="Object.keys(groupedProducts).length === 0"
        class="empty-state"
      >
        <div class="empty-card">
          <p class="empty-title">Nenhum produto encontrado</p>
          <p class="empty-text">
            Não há produtos ativos com estoque disponível no momento.
          </p>
        </div>
      </div>

      <!-- Markdown Content -->
      <div
        v-else
        class="lista-content-wrapper"
      >
        <div class="lista-card">
          <div class="lista-header">
            <h2 class="lista-subtitle">Lista Formatada</h2>
            <button
              @click="copyToClipboard"
              class="btn-copy"
              type="button"
              :class="{ 'copied': copySuccess }"
              aria-label="Copiar lista para área de transferência"
            >
              <span v-if="copySuccess" class="copy-icon">✓</span>
              <span v-else class="copy-icon">📋</span>
              <span>{{ copySuccess ? 'Copiado!' : 'Copiar Lista' }}</span>
            </button>
          </div>
          <div class="lista-content">
            <pre class="markdown-text">{{ markdownContent }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.lista-page {
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
  max-width: 1280px;
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
  margin-bottom: 48px;
}

@media (min-width: 640px) {
  .page-header {
    margin-bottom: 56px;
  }
}

@media (min-width: 1024px) {
  .page-header {
    margin-bottom: 64px;
  }
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

@media (min-width: 640px) {
  .header-content {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }
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
   BUTTONS
   ============================================ */

.btn-primary {
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
  gap: 8px;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25);
  width: 100%;
}

@media (min-width: 640px) {
  .btn-primary {
    width: auto;
    padding: 16px 40px;
  }
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

/* ============================================
   LOADING & ERROR STATES
   ============================================ */

.loading-state,
.empty-state,
.info-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 0;
}

.loading-card,
.empty-card,
.info-card {
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
  .loading-card,
  .empty-card,
  .info-card {
    padding: 56px 64px;
  }
}

.loading-text {
  font-size: 18px;
  font-weight: 500;
  color: #FFFFFF;
  margin: 0;
}

.error-state {
  background: rgba(239, 68, 68, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 24px;
  padding: 32px 40px;
  margin-bottom: 48px;
}

.error-text {
  color: #FCA5A5;
  font-weight: 500;
  margin: 0;
}

.info-card {
  background: rgba(255, 140, 0, 0.1);
  border-color: rgba(255, 140, 0, 0.3);
}

.info-text {
  font-size: 18px;
  font-weight: 500;
  color: #FED7AA;
  margin: 0;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 12px 0;
}

.empty-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0;
}

/* ============================================
   LISTA CONTENT
   ============================================ */

.lista-content-wrapper {
  margin-bottom: 48px;
}

@media (min-width: 640px) {
  .lista-content-wrapper {
    margin-bottom: 64px;
  }
}

.lista-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
  overflow: hidden;
}

@media (min-width: 640px) {
  .lista-card {
    padding: 40px;
  }
}

@media (min-width: 1024px) {
  .lista-card {
    padding: 48px 56px;
  }
}

.lista-header {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

@media (min-width: 640px) {
  .lista-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }
}

.lista-subtitle {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0;
}

@media (min-width: 640px) {
  .lista-subtitle {
    font-size: 28px;
  }
}

.btn-copy {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  border-radius: 16px;
  padding: 12px 24px;
  min-height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  color: #FFFFFF;
  width: 100%;
}

@media (min-width: 640px) {
  .btn-copy {
    width: auto;
  }
}

.btn-copy:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.btn-copy.copied {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
  color: #86EFAC;
}

.btn-copy:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

.copy-icon {
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lista-content {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  overflow-x: auto;
}

@media (min-width: 640px) {
  .lista-content {
    padding: 40px;
  }
}

@media (min-width: 1024px) {
  .lista-content {
    padding: 48px;
  }
}

.markdown-text {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #FFFFFF;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

@media (min-width: 640px) {
  .markdown-text {
    font-size: 15px;
  }
}

@media (min-width: 1024px) {
  .markdown-text {
    font-size: 16px;
  }
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
button:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
