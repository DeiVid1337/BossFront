<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/composables/useStoreContext'

const route = useRoute()
const authStore = useAuthStore()
const storeContext = useStoreContext()
const isOpen = ref(false)

// Handlers para eventos
function handleToggle() {
  isOpen.value = !isOpen.value
}

function handleResize() {
  if (window.innerWidth >= 768) {
    isOpen.value = false
  }
}

// Escutar eventos de toggle do header
onMounted(() => {
  window.addEventListener('sidebar-toggle', handleToggle)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('sidebar-toggle', handleToggle)
  window.removeEventListener('resize', handleResize)
})

// Fechar sidebar ao clicar em um link em mobile
function closeSidebar() {
  if (window.innerWidth < 768) {
    isOpen.value = false
  }
}

const user = computed(() => authStore.user)
const role = computed(() => user.value?.role)
const storeId = computed(() => {
  const id = storeContext.storeId.value
  return typeof id === 'number' ? id : null
})

// Verificar se link deve ser exibido baseado no role
const canSeeProducts = computed(() => role.value === 'admin' || role.value === 'manager')
const canSeeInventory = computed(() => !!storeId.value)
const canSeeCustomers = computed(() => true)
const canSeeSales = computed(() => !!storeId.value)
const canSeeUsers = computed(() => role.value === 'admin' || role.value === 'manager')

// Links de navegação
const navLinks = computed(() => {
  const links: Array<{
    label: string
    to: string
    icon?: string
    visible: boolean
  }> = []

  // Home/Dashboard - diferente para sellers
  if (role.value === 'seller' && storeId.value) {
    links.push({
      label: 'Dashboard',
      to: `/seller/dashboard`,
      icon: '🏠',
      visible: true,
    })
  } else {
    links.push({
      label: 'Home',
      to: '/',
      icon: '🏠',
      visible: true,
    })
  }

  if (canSeeProducts.value) {
    links.push({
      label: 'Produtos',
      to: '/products',
      icon: '📦',
      visible: true,
    })
  }

  if (canSeeInventory.value && storeId.value) {
    // Sellers veem link para edição de estoque, outros veem inventário completo
    if (role.value === 'seller') {
      links.push({
        label: 'Editar Estoque',
        to: `/seller/stores/${storeId.value}/products`,
        icon: '📋',
        visible: true,
      })
    } else {
      links.push({
        label: 'Inventário',
        to: `/stores/${storeId.value}/products`,
        icon: '📋',
        visible: true,
      })
    }
  }

  if (canSeeCustomers.value) {
    links.push({
      label: 'Clientes',
      to: '/customers',
      icon: '👥',
      visible: true,
    })
  }

  if (canSeeSales.value && storeId.value) {
    links.push({
      label: 'Vendas',
      to: `/stores/${storeId.value}/sales`,
      icon: '💰',
      visible: true,
    })
  }

  if (canSeeUsers.value) {
    links.push({
      label: 'Usuários',
      to: '/users',
      icon: '👤',
      visible: true,
    })
  }

  if (canSeeUsers.value) {
    links.push({
      label: 'Estoque Vendedor',
      to: '/seller-stock-management',
      icon: '📦',
      visible: true,
    })
  }

  if (storeId.value) {
    links.push({
      label: 'Lista',
      to: '/lista',
      icon: '📝',
      visible: true,
    })
  }

  return links
})

function isActive(linkTo: string): boolean {
  // Para a rota raiz (/), verificar se é exatamente a raiz ou se não começa com outras rotas conhecidas
  if (linkTo === '/') {
    return route.path === '/' || route.path === ''
  }
  // Para dashboard do seller, verificar match exato
  if (linkTo.includes('/seller/dashboard')) {
    return route.path === linkTo
  }
  // Para rotas de edição de estoque do seller
  if (linkTo.includes('/seller/stores/')) {
    return route.path.startsWith(linkTo)
  }
  // Para rotas de gerenciamento de estoque do vendedor
  if (linkTo.includes('/seller-stock-management')) {
    return route.path.startsWith(linkTo)
  }
  // Para outras rotas, verificar se o path começa com o link
  return route.path.startsWith(linkTo) && linkTo !== '/'
}
</script>

<template>
  <!-- Overlay para mobile -->
  <div
    v-if="isOpen"
    class="sidebar-overlay"
    @click="closeSidebar"
  ></div>
  
  <aside
    :class="[
      'app-sidebar',
      isOpen ? 'sidebar-open' : 'sidebar-closed'
    ]"
  >
    <nav class="sidebar-nav">
      <router-link
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        @click="closeSidebar"
        :class="[
          'nav-link',
          isActive(link.to) ? 'nav-link-active' : ''
        ]"
      >
        <span class="nav-icon">{{ link.icon }}</span>
        <span class="nav-label">{{ link.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 40;
}

@media (min-width: 768px) {
  .sidebar-overlay {
    display: none;
  }
}

.app-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 280px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 50;
  transition: transform 0.3s ease-in-out;
  box-shadow: 4px 0 32px rgba(0, 0, 0, 0.3);
  padding-top: 80px;
  overflow-y: auto;
}

@media (min-width: 640px) {
  .app-sidebar {
    padding-top: 88px;
  }
}

@media (min-width: 768px) {
  .app-sidebar {
    position: sticky;
    top: 80px;
    transform: translateX(0) !important;
    padding-top: 0;
    height: calc(100vh - 80px);
  }
}

@media (min-width: 1024px) {
  .app-sidebar {
    top: 96px;
    height: calc(100vh - 96px);
  }
}

.sidebar-closed {
  transform: translateX(-100%);
}

@media (min-width: 768px) {
  .sidebar-closed {
    transform: translateX(0);
  }
}

.sidebar-open {
  transform: translateX(0);
}

/* ============================================
   NAVIGATION
   ============================================ */

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  gap: 12px;
}

@media (min-width: 768px) {
  .sidebar-nav {
    padding: 32px 24px;
    gap: 16px;
  }
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  min-height: 64px;
  background: transparent;
  border-left: 4px solid transparent;
}

@media (min-width: 768px) {
  .nav-link {
    font-size: 20px;
    padding: 24px 28px;
    min-height: 72px;
    gap: 24px;
  }
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
  transform: translateX(4px);
}

.nav-link-active {
  background: rgba(255, 255, 255, 0.15);
  color: #FFFFFF;
  font-weight: 700;
  border-left-color: #E70000;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.1);
}

.nav-icon {
  font-size: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .nav-icon {
    font-size: 36px;
    width: 44px;
  }
}

.nav-label {
  flex: 1;
  font-weight: inherit;
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

.nav-link:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
