<script setup lang="ts">
/**
 * New Sale View (POS)
 * Seguindo Frontend.md: apenas orquestração, lógica no composable/API
 * Seguindo DevGuide.md: carrinho, seleção de cliente, notas, validação de estoque
 */

import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStoreProducts } from '@/api/endpoints/storeProducts'
import { getCustomers } from '@/api/endpoints/customers'
import { createSale } from '@/api/endpoints/sales'
import { useCart } from '@/composables/useCart'
import { useAuthStore } from '@/stores/auth'
import { useEffectiveStoreId } from '@/composables/useEffectiveStoreId'
import { useStockSync } from '@/composables/useStockSync'
import type { StoreProduct, Customer, CreateSaleRequest } from '@/api/types'
import { ValidationError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const { effectiveStoreId, routeStoreId, syncUrlToStore } = useEffectiveStoreId()
const storeId = computed(() => effectiveStoreId.value ?? 0)
const stockSync = useStockSync(effectiveStoreId)

// Verificar se é seller
const isSeller = computed(() => authStore.user?.role === 'seller')

// Cart
const cart = useCart()

// Store products
const storeProducts = ref<StoreProduct[]>([])
const loadingProducts = ref(false)
const productsError = ref<string | null>(null)
const productSearch = ref('')

// Customers
const customers = ref<Customer[]>([])
const loadingCustomers = ref(false)
const customerSearch = ref('')
const selectedCustomerId = ref<number | null>(null)

// Form
const notes = ref('')

// UI state
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})

// Load store products
async function loadStoreProducts() {
  loadingProducts.value = true
  productsError.value = null
  try {
    // Não enviar is_active como true, pois queremos apenas produtos ativos
    // O filtro será feito no frontend após receber os dados
    if (!storeId.value) {
      storeProducts.value = []
      productsError.value = 'Loja inválida'
      return
    }

    const response = await getStoreProducts(storeId.value, {
      per_page: 100,
    })

    // Verificar estrutura da resposta paginada
    if (response && typeof response === 'object' && 'data' in response) {
      const products = Array.isArray(response.data) ? response.data : []
      storeProducts.value = products
    } else {
      productsError.value = 'Resposta da API em formato inesperado'
      storeProducts.value = []
    }
  } catch (err) {
    productsError.value = err instanceof Error ? err.message : 'Erro ao carregar produtos'
    storeProducts.value = []
  } finally {
    loadingProducts.value = false
  }
}

// Load customers (initial list or search)
async function loadCustomers() {
  loadingCustomers.value = true
  try {
    const params: { per_page: number; search?: string } = {
      per_page: 50, // Carregar mais clientes para a lista
    }

    // Se houver busca, adicionar ao parâmetro
    if (customerSearch.value && customerSearch.value.trim().length >= 2) {
      params.search = customerSearch.value.trim()
    }

    const response = await getCustomers(params)
    if (response && typeof response === 'object' && 'data' in response) {
      customers.value = Array.isArray(response.data) ? response.data : []
    }
  } catch (err) {
    console.error('Erro ao carregar clientes:', err)
  } finally {
    loadingCustomers.value = false
  }
}

// Search customers (debounced)
let searchTimeout: ReturnType<typeof setTimeout> | null = null
function searchCustomers() {
  // Limpar timeout anterior
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // Se a busca estiver vazia ou muito curta, carregar lista completa
  if (!customerSearch.value || customerSearch.value.trim().length < 2) {
    loadCustomers()
    return
  }

  // Debounce: aguardar 300ms antes de buscar
  searchTimeout = setTimeout(() => {
    loadCustomers()
  }, 300)
}

// Helper para obter estoque disponível baseado no role
function getAvailableStock(product: StoreProduct): number {
  if (isSeller.value) {
    // Para sellers, usar seller_quantity
    return product.seller_quantity ?? 0
  }
  // Para admin/manager, usar stock_quantity
  return product.stock_quantity
}

// Filtered products
const filteredProducts = computed(() => {
  // Filtrar produtos baseado no estoque correto
  const allProducts = storeProducts.value.filter(p => {
    if (!p.is_active) return false
    const availableStock = getAvailableStock(p)
    return availableStock > 0
  })

  if (!productSearch.value || !productSearch.value.trim()) {
    return allProducts
  }
  const searchLower = productSearch.value.toLowerCase()
  return allProducts.filter(
    p =>
      p.product?.name?.toLowerCase().includes(searchLower) ||
      p.product?.brand?.toLowerCase().includes(searchLower) ||
      p.product?.flavor?.toLowerCase().includes(searchLower)
  )
})

// Add product to cart
function addToCart(storeProduct: StoreProduct) {
  // Validar se produto pertence à loja atual antes de adicionar
  if (storeProduct.store_id !== storeId.value) {
    error.value = `Este produto pertence à loja ${storeProduct.store_id}, mas você está vendendo na loja ${storeId.value}.`
    return
  }
  
  // Validar se produto está ativo
  if (!storeProduct.is_active) {
    error.value = 'Este produto está inativo e não pode ser vendido.'
    return
  }
  
  // Validar estoque baseado no role
  const availableStock = getAvailableStock(storeProduct)
  if (availableStock <= 0) {
    if (isSeller.value) {
      error.value = 'Você não tem estoque deste produto. Retire produtos do estoque da loja primeiro.'
    } else {
      error.value = 'Este produto não tem estoque disponível.'
    }
    return
  }
  
  cart.addItem(storeProduct, 1)
}

// Submit sale
async function handleSubmit() {
  // Validação client-side
  if (cart.isEmpty.value) {
    error.value = 'O carrinho está vazio. Adicione pelo menos um produto.'
    return
  }

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    // RECARREGAR produtos antes de validar para garantir dados atualizados
    console.log('🔄 Recarregando produtos para validar estoque antes de criar venda...')
    await loadStoreProducts()
    
    // LIMPAR carrinho de produtos inválidos ANTES de validar
    const removedProducts: string[] = []
    const validCartItems = cart.items.value.filter(item => {
      const updatedProduct = storeProducts.value.find(p => p.id === item.storeProduct.id)
      
      // Remover produtos que:
      // 1. Não existem mais no inventário
      if (!updatedProduct) {
        const productName = getProductLabel(item.storeProduct)
        removedProducts.push(`${productName} (não encontrado no inventário)`)
        console.warn(`⚠️ Removendo produto ${item.storeProduct.id} do carrinho: não encontrado no inventário`)
        return false
      }
      
      // 2. Não pertencem à loja atual
      if (updatedProduct.store_id !== storeId.value) {
        const productName = getProductLabel(updatedProduct)
        removedProducts.push(`${productName} (pertence à loja ${updatedProduct.store_id})`)
        console.warn(
          `⚠️ Removendo produto ${item.storeProduct.id} do carrinho: pertence à loja ${updatedProduct.store_id}, não à ${storeId.value}`
        )
        return false
      }
      
      // 3. Estão inativos
      if (!updatedProduct.is_active) {
        const productName = getProductLabel(updatedProduct)
        removedProducts.push(`${productName} (inativo)`)
        console.warn(`⚠️ Removendo produto ${item.storeProduct.id} do carrinho: está inativo`)
        return false
      }
      
      // 4. Não têm estoque suficiente (usar seller_quantity para sellers)
      const availableStock = getAvailableStock(updatedProduct)
      if (availableStock < item.quantity) {
        const productName = getProductLabel(updatedProduct)
        if (isSeller.value) {
          removedProducts.push(`${productName} (seu estoque: ${availableStock}, solicitado: ${item.quantity})`)
        } else {
          removedProducts.push(`${productName} (estoque: ${availableStock}, solicitado: ${item.quantity})`)
        }
        console.warn(`⚠️ Removendo produto ${item.storeProduct.id} do carrinho: estoque insuficiente (${availableStock} < ${item.quantity})`)
        return false
      }
      
      return true
    })
    
    // Se houver produtos removidos, atualizar carrinho e mostrar aviso
    if (validCartItems.length < cart.items.value.length) {
      const removedCount = cart.items.value.length - validCartItems.length
      cart.items.value = validCartItems
      error.value = `${removedCount} produto(s) foram removidos do carrinho:\n${removedProducts.join('\n')}\n\nPor favor, verifique os produtos disponíveis e adicione novamente ao carrinho.`
      submitting.value = false
      return
    }
    
    // Validar carrinho após limpar produtos inválidos
    if (cart.items.value.length === 0) {
      error.value = 'O carrinho está vazio. Adicione pelo menos um produto.'
      submitting.value = false
      return
    }

    // Validar cada item do carrinho com dados atualizados
    const invalidItems: string[] = []
    const items = cart.items.value.map((item, index) => {
      if (!item.storeProduct || !item.storeProduct.id) {
        invalidItems.push(`Item ${index + 1}: Produto inválido`)
        throw new Error(`Produto inválido no carrinho: ${JSON.stringify(item)}`)
      }
      
      // Buscar produto atualizado na lista recarregada
      const updatedProduct = storeProducts.value.find(p => p.id === item.storeProduct.id)
      
      console.log(`🔍 Validando item ${index + 1}:`, {
        cartItem: {
          id: item.storeProduct.id,
          store_id: item.storeProduct.store_id,
          stock: item.storeProduct.stock_quantity,
          is_active: item.storeProduct.is_active,
          name: getProductLabel(item.storeProduct),
        },
        updatedProduct: updatedProduct ? {
          id: updatedProduct.id,
          store_id: updatedProduct.store_id,
          stock: updatedProduct.stock_quantity,
          is_active: updatedProduct.is_active,
          name: getProductLabel(updatedProduct),
        } : null,
        requestedQuantity: item.quantity,
        currentStoreId: storeId.value,
      })
      
      if (!updatedProduct) {
        invalidItems.push(`Item ${index + 1}: Produto não encontrado no inventário`)
        throw new Error(`Produto ${item.storeProduct.id} não encontrado no inventário da loja ${storeId}`)
      }
      
      // Validar se produto pertence à loja correta
      if (updatedProduct.store_id !== storeId.value) {
        invalidItems.push(
          `Item ${index + 1}: Produto pertence a outra loja (Loja ${updatedProduct.store_id}, esperado: ${storeId.value})`
        )
        throw new Error(
          `Produto ${getProductLabel(updatedProduct)} pertence à loja ${updatedProduct.store_id}, mas você está tentando vender na loja ${storeId.value}`
        )
      }
      
      if (!updatedProduct.is_active) {
        invalidItems.push(`Item ${index + 1}: Produto está inativo`)
        throw new Error(`Produto "${getProductLabel(updatedProduct)}" está inativo e não pode ser vendido`)
      }
      
      // Validar estoque baseado no role
      const availableStock = getAvailableStock(updatedProduct)
      if (availableStock < item.quantity) {
        if (isSeller.value) {
          invalidItems.push(
            `Item ${index + 1}: Estoque insuficiente no seu inventário (Disponível: ${availableStock}, Solicitado: ${item.quantity})`
          )
          throw new Error(
            `Estoque insuficiente no seu inventário para "${getProductLabel(updatedProduct)}". Disponível: ${availableStock}, Solicitado: ${item.quantity}. Retire produtos do estoque da loja primeiro.`
          )
        } else {
          invalidItems.push(
            `Item ${index + 1}: Estoque insuficiente (Disponível: ${availableStock}, Solicitado: ${item.quantity})`
          )
          throw new Error(
            `Estoque insuficiente para "${getProductLabel(updatedProduct)}". Disponível: ${availableStock}, Solicitado: ${item.quantity}`
          )
        }
      }
      
      if (!item.quantity || item.quantity <= 0) {
        invalidItems.push(`Item ${index + 1}: Quantidade inválida (${item.quantity})`)
        throw new Error(`Quantidade inválida para produto ${item.storeProduct.id}: ${item.quantity}`)
      }
      
      return {
        store_product_id: item.storeProduct.id,
        quantity: item.quantity,
      }
    })
    
    if (invalidItems.length > 0) {
      error.value = `Erros de validação:\n${invalidItems.join('\n')}`
      submitting.value = false
      return
    }

    const data: CreateSaleRequest = {
      customer_id: selectedCustomerId.value || null,
      items: items,
      notes: notes.value.trim() || null,
    }

    // Log para debug (remover em produção)
    console.log('📤 Enviando venda:', {
      storeId: storeId.value,
      data: JSON.stringify(data, null, 2),
      cartItems: cart.items.value.map(item => ({
        id: item.storeProduct.id,
        store_id: item.storeProduct.store_id,
        name: getProductLabel(item.storeProduct),
        quantity: item.quantity,
        stock: item.storeProduct.stock_quantity,
        is_active: item.storeProduct.is_active,
      })),
      payloadItems: items.map((item, index) => ({
        index,
        store_product_id: item.store_product_id,
        quantity: item.quantity,
        productInfo: (() => {
          const cartItem = cart.items.value[index]
          if (cartItem) {
            const updated = storeProducts.value.find(p => p.id === cartItem.storeProduct.id)
            return updated ? {
              name: getProductLabel(updated),
              store_id: updated.store_id,
              stock: updated.stock_quantity,
              is_active: updated.is_active,
            } : null
          }
          return null
        })(),
      })),
    })

    const sale = await createSale(storeId.value, data)
    cart.clear()
    selectedCustomerId.value = null
    customerSearch.value = ''
    notes.value = ''

    stockSync.emitStockUpdated({ source: 'sale', saleId: sale.id })
    router.push(`/stores/${storeId.value}/sales/${sale.id}`)
  } catch (err) {
    console.error('❌ Erro ao criar venda:', err)
    
    if (err instanceof ValidationError) {
      // ValidationError tem validationErrors (que é o mesmo que errors)
      const validationErrors = err.validationErrors || err.errors || {}
      fieldErrors.value = validationErrors
      
      // Log detalhado dos erros de validação
      console.error('📋 Erros de validação COMPLETOS:', {
        message: err.message,
        errors: err.errors,
        validationErrors: err.validationErrors,
        status: err.status,
        fullError: err,
      })
      
      // Expandir e mostrar cada erro individualmente
      if (validationErrors && typeof validationErrors === 'object') {
        console.error('📋 Detalhamento dos erros por campo:')
        Object.entries(validationErrors).forEach(([field, messages]) => {
          console.error(`  - ${field}:`, messages)
        })
      }
      
      // Mostrar informações dos produtos que causaram erro
      console.error('📋 Produtos no carrinho que causaram erro:')
      cart.items.value.forEach((item, index) => {
        const updatedProduct = storeProducts.value.find(p => p.id === item.storeProduct.id)
        const errorField = `items.${index}.quantity`
        const hasError = validationErrors[errorField]
        
        console.error(`  Item ${index} (${errorField}):`, {
          store_product_id: item.storeProduct.id,
          product_name: getProductLabel(item.storeProduct),
          quantity_requested: item.quantity,
          store_id_cart: item.storeProduct.store_id,
          store_id_updated: updatedProduct?.store_id,
          stock_cart: item.storeProduct.stock_quantity,
          stock_updated: updatedProduct?.stock_quantity,
          is_active_cart: item.storeProduct.is_active,
          is_active_updated: updatedProduct?.is_active,
          current_store_id: storeId,
          has_validation_error: !!hasError,
          error_messages: hasError || [],
          product_found_in_updated_list: !!updatedProduct,
          store_id_matches: updatedProduct?.store_id === storeId,
        })
      })
      
      // Expandir e mostrar cada erro individualmente
      if (validationErrors && typeof validationErrors === 'object') {
        console.error('📋 Detalhamento dos erros por campo:')
        Object.entries(validationErrors).forEach(([field, messages]) => {
          console.error(`  - ${field}:`, messages)
        })
      }
      
      // Mostrar informações dos produtos que causaram erro
      console.error('📋 Produtos no carrinho que causaram erro:')
      cart.items.value.forEach((item, index) => {
        const updatedProduct = storeProducts.value.find(p => p.id === item.storeProduct.id)
        console.error(`  Item ${index}:`, {
          store_product_id: item.storeProduct.id,
          product_name: getProductLabel(item.storeProduct),
          quantity_requested: item.quantity,
          store_id_cart: item.storeProduct.store_id,
          store_id_updated: updatedProduct?.store_id,
          stock_cart: item.storeProduct.stock_quantity,
          stock_updated: updatedProduct?.stock_quantity,
          is_active_cart: item.storeProduct.is_active,
          is_active_updated: updatedProduct?.is_active,
          current_store_id: storeId,
          error_field: `items.${index}.quantity`,
        })
      })
      
      // Construir mensagem de erro mais detalhada
      const errorMessages = Object.values(validationErrors).flat()
      
      // Construir mensagem detalhada por campo
      const errorDetails: string[] = []
      Object.entries(validationErrors).forEach(([field, messages]) => {
        if (Array.isArray(messages) && messages.length > 0) {
          const fieldLabel = field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/Items\.(\d+)\./g, 'Item $1: ')
          errorDetails.push(`${fieldLabel}: ${messages.join(', ')}`)
        }
      })
      
      if (errorDetails.length > 0) {
        // Mostrar todas as mensagens de erro de forma organizada
        error.value = `Erros de validação:\n\n${errorDetails.join('\n\n')}`
      } else if (errorMessages.length > 0) {
        // Fallback: mostrar mensagens simples
        error.value = errorMessages.join('. ') || err.message || 'Erro de validação ao criar venda'
      } else {
        error.value = err.message || 'Erro de validação ao criar venda'
      }
      
      // Mensagem especial para estoque insuficiente
      const hasStockError = errorMessages.some(msg => 
        msg.toLowerCase().includes('stock') || 
        msg.toLowerCase().includes('estoque') ||
        msg.toLowerCase().includes('insufficient') ||
        msg.toLowerCase().includes('insuficiente') ||
        msg.toLowerCase().includes('available') ||
        msg.toLowerCase().includes('seller inventory')
      )
      
      if (hasStockError) {
        const stockErrorDetails = errorDetails.filter(d => 
          d.toLowerCase().includes('stock') || 
          d.toLowerCase().includes('estoque') ||
          d.toLowerCase().includes('insufficient') ||
          d.toLowerCase().includes('available') ||
          d.toLowerCase().includes('seller inventory')
        )
        
        // Verificar se há discrepância entre estoque da loja e estoque do vendedor
        const hasSellerInventoryError = errorMessages.some(msg => 
          msg.toLowerCase().includes('seller inventory')
        )
        
        if (hasSellerInventoryError) {
          error.value = `⚠️ PROBLEMA DE ESTOQUE DO VENDEDOR:\n\n` +
            `O backend está reportando que o estoque do vendedor está zerado, ` +
            `mesmo que o estoque da loja mostre valores disponíveis.\n\n` +
            `Isso indica uma discrepância entre:\n` +
            `- Estoque da loja (exibido no frontend)\n` +
            `- Estoque do vendedor (validado pelo backend)\n\n` +
            `Detalhes dos erros:\n${stockErrorDetails.join('\n\n')}\n\n` +
            `🔧 AÇÃO NECESSÁRIA: Verifique no backend se o estoque do vendedor ` +
            `está configurado corretamente ou se há um problema de sincronização.`
        } else {
          error.value = `Estoque insuficiente:\n\n${stockErrorDetails.join('\n\n')}`
        }
      }
    } else if (err instanceof Error) {
      error.value = err.message || 'Erro ao criar venda'
      console.error('Erro detalhado:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
      })
    } else {
      error.value = 'Erro desconhecido ao criar venda'
      console.error('Erro desconhecido:', err)
    }
  } finally {
    submitting.value = false
  }
}

function cancel() {
  cart.clear()
  router.push(`/stores/${storeId.value}/sales`)
}

function formatPrice(price: string): string {
  return parseFloat(price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getProductLabel(storeProduct: StoreProduct): string {
  if (storeProduct.product) {
    return `${storeProduct.product.brand} ${storeProduct.product.name} - ${storeProduct.product.flavor}`
  }
  return 'Produto não encontrado'
}

function selectCustomer(customer: Customer) {
  selectedCustomerId.value = customer.id
  customerSearch.value = customer.name
  customers.value = []
}

function clearCustomerSelection() {
  selectedCustomerId.value = null
  customerSearch.value = ''
}

function formatFieldName(field: string): string {
  // Formatar nomes de campos para exibição
  // Ex: "items.0.quantity" -> "Item 1: Quantidade"
  // Ex: "items.1.store_product_id" -> "Item 2: Produto"
  
  if (field.startsWith('items.')) {
    const match = field.match(/^items\.(\d+)\.(.+)$/)
    if (match) {
      const itemIndex = parseInt(match[1]) + 1 // +1 para mostrar como "Item 1" ao invés de "Item 0"
      const fieldName = match[2]
      
      const fieldLabels: Record<string, string> = {
        quantity: 'Quantidade',
        store_product_id: 'Produto',
        'store_product_id': 'Produto',
      }
      
      const label = fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      return `Item ${itemIndex}: ${label}`
    }
  }
  
  // Formatação genérica
  return field
    .replace(/_/g, ' ')
    .replace(/\./g, ' → ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

// Flag para controlar se já foi montado
let hasMounted = false

onMounted(() => {
  // manter URL alinhada ao store efetivo (admin via seletor, seller/manager via store_id)
  syncUrlToStore(id => ({ path: `/stores/${id}/sales/new` }))
  loadStoreProducts()
  hasMounted = true
})

// Recarregar quando o componente for ativado (se estiver em keep-alive)
onActivated(() => {
  if (hasMounted) {
    loadStoreProducts()
  }
})

// Observar mudanças na rota para recarregar quando voltar
watch(
  () => route.name,
  (newName, oldName) => {
    // Se voltou para a página de nova venda após estar em outra rota
    if (newName === 'sale-new' && oldName && oldName !== 'sale-new' && hasMounted) {
      loadStoreProducts()
    }
  },
  { immediate: false }
)

// Se trocar o store efetivo (ex.: admin muda no seletor), sincronizar URL e recarregar produtos
watch(effectiveStoreId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  if (routeStoreId.value !== newId) {
    router.replace({ path: `/stores/${newId}/sales/new` })
  }
  loadStoreProducts()
})
</script>

<template>
  <div class="new-sale-view">
    <div class="page-header">
      <button @click="cancel" class="btn-back">← Voltar</button>
      <h1>Nova Venda</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 md:gap-8">
      <!-- Left: Products -->
      <div class="products-section">
        <h2>Produtos</h2>
        <div class="product-search">
          <input
            v-model="productSearch"
            type="text"
            placeholder="Buscar produtos..."
            class="search-input"
          />
        </div>

        <!-- Loading -->
        <div v-if="loadingProducts" class="loading-message">Carregando produtos...</div>

        <!-- Error -->
        <div v-else-if="productsError" class="error-message">
          {{ productsError }}
        </div>

        <!-- Products Grid -->
        <div v-else-if="filteredProducts.length > 0" class="products-grid">
          <div
            v-for="storeProduct in filteredProducts"
            :key="storeProduct.id"
            @click="addToCart(storeProduct)"
            class="product-card"
            :class="{ 'out-of-stock': getAvailableStock(storeProduct) === 0 }"
          >
            <div v-if="storeProduct.product" class="product-info">
              <div class="product-brand">{{ storeProduct.product.brand }}</div>
              <div class="product-name">{{ storeProduct.product.name }}</div>
              <div class="product-flavor">{{ storeProduct.product.flavor }}</div>
            </div>
            <div class="product-price">{{ formatPrice(storeProduct.sale_price) }}</div>
            <div v-if="isSeller" class="product-stock">
              <div>Seu Estoque: {{ storeProduct.seller_quantity ?? 0 }}</div>
              <div v-if="storeProduct.available_quantity && storeProduct.available_quantity > 0" class="product-available">
                Disponível para retirar: {{ storeProduct.available_quantity }}
              </div>
            </div>
            <div v-else class="product-stock">Estoque: {{ storeProduct.stock_quantity }}</div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-products">
          <p>Nenhum produto disponível no inventário desta loja.</p>
        </div>
      </div>

      <!-- Right: Cart & Checkout -->
      <div class="cart-section">
        <h2>Carrinho</h2>

        <!-- Customer Selection -->
        <div class="customer-selection">
          <label class="form-label">Cliente (opcional)</label>
          <input
            v-model="customerSearch"
            type="text"
            placeholder="Buscar cliente..."
            class="search-input"
            @input="searchCustomers"
          />

          <!-- Loading -->
          <div v-if="loadingCustomers" class="customers-loading">Carregando clientes...</div>

          <!-- Customers List/Dropdown -->
          <div v-else-if="customers.length > 0" class="customers-list">
            <div class="customers-list-header">
              <span v-if="customerSearch && customerSearch.trim().length >= 2">
                Resultados da busca ({{ customers.length }})
              </span>
              <span v-else> Clientes ({{ customers.length }}) </span>
            </div>
            <div class="customers-scrollable">
              <div
                v-for="customer in customers"
                :key="customer.id"
                @click="selectCustomer(customer)"
                class="customer-option"
                :class="{ selected: selectedCustomerId === customer.id }"
              >
                <div class="customer-name">{{ customer.name }}</div>
                <div class="customer-phone">{{ customer.phone }}</div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="customerSearch && customerSearch.trim().length >= 2"
            class="customers-empty"
          >
            Nenhum cliente encontrado.
          </div>

          <!-- Selected customer badge -->
          <div v-if="selectedCustomerId" class="selected-customer">
            <span>Cliente selecionado</span>
            <button @click="clearCustomerSelection" class="btn-remove">×</button>
          </div>
        </div>

        <!-- Cart Items -->
        <div v-if="!cart.isEmpty.value" class="cart-items">
          <div v-for="item in cart.items.value" :key="item.storeProduct.id" class="cart-item">
            <div class="cart-item-info">
              <div class="cart-item-name">
                {{ getProductLabel(item.storeProduct) }}
              </div>
              <div class="cart-item-price">
                {{ formatPrice(item.storeProduct.sale_price) }} × {{ item.quantity }} =
                {{
                  formatPrice((parseFloat(item.storeProduct.sale_price) * item.quantity).toString())
                }}
              </div>
            </div>
            <div class="cart-item-actions">
              <button
                @click="cart.updateQuantity(item.storeProduct.id, item.quantity - 1)"
                class="btn-quantity"
              >
                −
              </button>
              <span class="quantity-display">{{ item.quantity }}</span>
              <button
                @click="cart.updateQuantity(item.storeProduct.id, item.quantity + 1)"
                class="btn-quantity"
                :disabled="item.quantity >= getAvailableStock(item.storeProduct)"
              >
                +
              </button>
              <button @click="cart.removeItem(item.storeProduct.id)" class="btn-remove-item">
                Remover
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-cart">
          <p>Carrinho vazio. Clique em um produto para adicionar.</p>
        </div>

        <!-- Notes -->
        <div class="notes-section">
          <label class="form-label">Observações</label>
          <textarea
            v-model="notes"
            class="notes-input"
            placeholder="Observações sobre a venda..."
            rows="3"
          ></textarea>
        </div>

        <!-- Total -->
        <div class="cart-total">
          <div class="total-label">Total:</div>
          <div class="total-amount">
            {{ formatPrice(cart.total.value.toString()) }}
          </div>
        </div>

        <!-- Aviso para Sellers sem estoque -->
        <div v-if="isSeller && cart.items.value.length > 0" class="seller-stock-warning">
          <div v-for="item in cart.items.value" :key="item.storeProduct.id">
            <div v-if="(item.storeProduct.seller_quantity ?? 0) === 0" class="warning-item">
              <strong>{{ getProductLabel(item.storeProduct) }}</strong>
              <p>Você não tem estoque deste produto. Retire produtos do estoque da loja primeiro.</p>
              <button
                @click="router.push(`/stores/${storeId.value}/inventory/withdraw`)"
                class="btn-withdraw"
              >
                Retirar Produtos
              </button>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="error-message">
          <div class="error-title">⚠️ Erro ao criar venda</div>
          <div class="error-content" v-html="error.replace(/\n/g, '<br>')"></div>
          <div v-if="Object.keys(fieldErrors).length > 0" class="field-errors">
            <div class="field-errors-title">Detalhes dos erros:</div>
            <div v-for="(errors, field) in fieldErrors" :key="field" class="field-error-item">
              <strong class="field-name">{{ formatFieldName(field) }}:</strong>
              <ul class="field-error-list">
                <li v-for="(err, index) in errors" :key="index" class="field-error-message">{{ err }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <button
          @click="handleSubmit"
          class="btn-submit"
          :disabled="cart.isEmpty.value || submitting"
        >
          <span v-if="submitting">Processando...</span>
          <span v-else>Finalizar Venda</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-sale-view {
  max-width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  font-size: 2rem;
  color: var(--color-text-primary);
  margin: 0;
  font-family: var(--font-display);
}

.btn-back {
  background: transparent;
  color: var(--color-orange);
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-orange);
  border-radius: 8px;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background var(--transition-fast);
  font-family: var(--font-body);
}

.btn-back:hover {
  background: var(--color-medium-gray);
}

.btn-back:focus {
  outline: 2px solid var(--color-orange);
  outline-offset: 2px;
}


.products-section,
.cart-section {
  background: var(--color-dark-gray);
  border-radius: 12px;
  border: 1px solid var(--color-medium-gray);
  padding: var(--spacing-lg);
}

.products-section h2,
.cart-section h2 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-md) 0;
  font-family: var(--font-display);
}

.product-search {
  margin-bottom: var(--spacing-md);
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-medium-gray);
  border-radius: 8px;
  font-size: 0.9375rem;
  background: var(--color-dark-gray);
  color: var(--color-text-primary);
  font-family: var(--font-body);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-orange);
  box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.product-card {
  border: 2px solid var(--color-medium-gray);
  border-radius: 8px;
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-dark-gray);
}

.product-card:hover {
  border-color: var(--color-orange);
  box-shadow: var(--shadow-medium);
}

.product-card.out-of-stock {
  opacity: 0.5;
  cursor: not-allowed;
}

.product-info {
  margin-bottom: var(--spacing-sm);
}

.product-brand {
  font-weight: 600;
  color: var(--color-orange);
  font-size: 0.875rem;
}

.product-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.product-flavor {
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
}

.product-price {
  font-weight: 600;
  color: var(--color-gold);
  font-size: 1.125rem;
  margin-top: var(--spacing-sm);
}

.product-stock {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.product-available {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin-top: 0.125rem;
}

.seller-stock-warning {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid var(--color-gold);
  border-radius: 8px;
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.warning-item {
  margin-bottom: var(--spacing-sm);
}

.warning-item:last-child {
  margin-bottom: 0;
}

.warning-item strong {
  display: block;
  color: var(--color-gold);
  margin-bottom: 0.25rem;
}

.warning-item p {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-bottom: var(--spacing-sm);
}

.btn-withdraw {
  background: var(--color-gold);
  color: var(--color-dark-gray);
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast);
  font-family: var(--font-body);
}

.btn-withdraw:hover {
  background: #ffd700;
  filter: brightness(1.1);
}

.customer-selection {
  margin-bottom: var(--spacing-lg);
  position: relative;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  font-size: 0.9375rem;
}

.customers-list {
  margin-top: var(--spacing-sm);
  background: var(--color-dark-gray);
  border: 1px solid var(--color-medium-gray);
  border-radius: 8px;
  overflow: hidden;
}

.customers-list-header {
  padding: 0.75rem;
  background: var(--color-medium-gray);
  border-bottom: 1px solid var(--color-medium-gray);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.customers-scrollable {
  max-height: 300px;
  overflow-y: auto;
}

.customer-option {
  padding: 0.75rem;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--color-medium-gray);
}

.customer-option:last-child {
  border-bottom: none;
}

.customer-option:hover {
  background: var(--color-medium-gray);
}

.customer-option.selected {
  background: rgba(255, 140, 0, 0.1);
  border-left: 3px solid var(--color-orange);
}

.customer-name {
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.customer-phone {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.customers-loading {
  text-align: center;
  padding: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.customers-empty {
  text-align: center;
  padding: var(--spacing-md);
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
  margin-top: var(--spacing-sm);
}

.selected-customer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm);
  background: rgba(255, 215, 0, 0.1);
  color: var(--color-gold);
  border: 1px solid var(--color-gold);
  border-radius: 8px;
  margin-top: var(--spacing-sm);
  font-size: 0.875rem;
}

.btn-remove {
  background: none;
  border: none;
  color: #065f46;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
}

.cart-items {
  margin-bottom: 1.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.cart-item {
  border-bottom: 1px solid var(--color-medium-gray);
  padding: var(--spacing-md) 0;
}

.cart-item:last-child {
  border-bottom: none;
}

.cart-item-info {
  margin-bottom: var(--spacing-sm);
}

.cart-item-name {
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.cart-item-price {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.cart-item-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-quantity {
  background: var(--color-medium-gray);
  color: var(--color-text-primary);
  border: 1px solid var(--color-medium-gray);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1.125rem;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  font-family: var(--font-body);
}

.btn-quantity:hover:not(:disabled) {
  background: var(--color-dark-gray);
  border-color: var(--color-orange);
}

.btn-quantity:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity-display {
  min-width: 40px;
  text-align: center;
  font-weight: 500;
  color: var(--color-text-primary);
}

.btn-remove-item {
  background: rgba(255, 69, 0, 0.1);
  color: var(--color-error);
  border: 1px solid var(--color-error);
  border-radius: 6px;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background var(--transition-fast);
  font-family: var(--font-body);
}

.btn-remove-item:hover {
  background: rgba(255, 69, 0, 0.2);
}

.empty-cart {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
}

.loading-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.empty-products {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
}

.notes-section {
  margin-bottom: var(--spacing-lg);
}

.notes-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-medium-gray);
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: var(--font-body);
  resize: vertical;
  background: var(--color-dark-gray);
  color: var(--color-text-primary);
}

.notes-input:focus {
  outline: none;
  border-color: var(--color-orange);
  box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
}

.cart-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--color-medium-gray);
  border-radius: 8px;
  margin-bottom: var(--spacing-md);
}

.total-label {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.total-amount {
  font-size: 1.5rem;
  font-weight: 700;
  background: var(--gradient-boss-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-message {
  background: rgba(255, 69, 0, 0.1);
  color: var(--color-error);
  border: 1px solid var(--color-error);
  padding: var(--spacing-md);
  border-radius: 8px;
  margin-bottom: var(--spacing-md);
}

.error-title {
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  font-size: 1rem;
}

.error-content {
  margin-bottom: var(--spacing-sm);
}

.field-errors {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid rgba(255, 69, 0, 0.3);
}

.field-errors-title {
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--color-error);
  margin-bottom: var(--spacing-sm);
}

.field-error-item {
  margin-bottom: var(--spacing-sm);
  font-size: 0.875rem;
}

.field-name {
  display: block;
  text-transform: capitalize;
  margin-bottom: 0.25rem;
  color: var(--color-error);
  font-weight: 600;
}

.field-error-list {
  margin: 0.25rem 0 0 1.25rem;
  padding: 0;
  list-style-type: disc;
}

.field-error-message {
  margin-bottom: 0.125rem;
  color: rgba(255, 69, 0, 0.9);
}

.field-error-item {
  margin-bottom: var(--spacing-sm);
  font-size: 0.875rem;
}

.field-error-item strong {
  text-transform: capitalize;
  display: block;
  margin-bottom: 0.25rem;
}

.field-error-item ul {
  margin: 0;
  padding-left: 1.25rem;
  list-style-type: disc;
}

.field-error-item li {
  margin-bottom: 0.125rem;
  margin-bottom: var(--spacing-md);
}

.btn-submit {
  width: 100%;
  background: var(--gradient-boss);
  color: var(--color-white);
  padding: var(--spacing-md);
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast), filter var(--transition-fast);
  font-family: var(--font-body);
}

.btn-submit:hover:not(:disabled) {
  transform: scale(1.02);
  filter: brightness(1.1);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-submit:focus {
  outline: 2px solid var(--color-orange);
  outline-offset: 2px;
}
</style>
