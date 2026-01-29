import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: {
        layout: 'auth',
        requiresAuth: false,
      },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
      },
    },
    {
      path: '/seller/dashboard',
      name: 'seller-dashboard',
      component: () => import('@/views/SellerDashboardView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['seller'],
        storeContext: true,
      },
    },
    {
      path: '/stores',
      name: 'stores',
      component: () => import('@/views/StoresListView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/stores/new',
      name: 'store-new',
      component: () => import('@/views/StoreFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/stores/:id',
      name: 'store-detail',
      component: () => import('@/views/StoreDetailView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/stores/:id/edit',
      name: 'store-edit',
      component: () => import('@/views/StoreFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('@/views/ProductsListView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
      },
    },
    {
      path: '/products/new',
      name: 'product-new',
      component: () => import('@/views/ProductFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/products/:id',
      name: 'product-detail',
      component: () => import('@/views/ProductDetailView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
      },
    },
    {
      path: '/products/:id/edit',
      name: 'product-edit',
      component: () => import('@/views/ProductFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/stores/:storeId/products',
      name: 'store-products',
      component: () => import('@/views/StoreProductsListView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        storeContext: true,
      },
    },
    {
      path: '/stores/:storeId/products/new',
      name: 'store-product-new',
      component: () => import('@/views/StoreProductFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
        storeContext: true,
      },
    },
    {
      path: '/stores/:storeId/products/:id/edit',
      name: 'store-product-edit',
      component: () => import('@/views/StoreProductEditView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
        storeContext: true,
      },
    },
    {
      path: '/stores/:storeId/products/:id/edit-stock',
      name: 'admin-stock-edit',
      component: () => import('@/views/AdminStockEditView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
        storeContext: true,
      },
    },
    {
      path: '/customers',
      name: 'customers',
      component: () => import('@/views/CustomersListView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
      },
    },
    {
      path: '/customers/new',
      name: 'customer-new',
      component: () => import('@/views/CustomerFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
      },
    },
    {
      path: '/customers/:id',
      name: 'customer-detail',
      component: () => import('@/views/CustomerDetailView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
      },
    },
    {
      path: '/customers/:id/edit',
      name: 'customer-edit',
      component: () => import('@/views/CustomerFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
      },
    },
    {
      path: '/stores/:storeId/sales',
      name: 'sales',
      component: () => import('@/views/SalesListView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        storeContext: true,
      },
    },
    {
      path: '/stores/:storeId/sales/new',
      name: 'sale-new',
      component: () => import('@/views/NewSaleView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        storeContext: true,
      },
    },
    {
      path: '/stores/:storeId/sales/:id',
      name: 'sale-detail',
      component: () => import('@/views/SaleDetailView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        storeContext: true,
      },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersListView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
      },
    },
    {
      path: '/users/new',
      name: 'user-new',
      component: () => import('@/views/UserFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/users/:id',
      name: 'user-detail',
      component: () => import('@/views/UserDetailView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
      },
    },
    {
      path: '/users/:id/edit',
      name: 'user-edit',
      component: () => import('@/views/UserFormView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin'],
      },
    },
    {
      path: '/lista',
      name: 'lista',
      component: () => import('@/views/ListaView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
      },
    },
    {
      path: '/seller/stores/:storeId/products',
      name: 'seller-stock-list',
      component: () => import('@/views/SellerStockListView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['seller'],
        storeContext: true,
      },
    },
    {
      path: '/seller/stores/:storeId/products/:id/edit-stock',
      name: 'seller-stock-edit',
      component: () => import('@/views/SellerStockEditView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['seller'],
        storeContext: true,
      },
    },
    {
      path: '/seller/stores/:storeId/products/new',
      name: 'seller-add-product',
      component: () => import('@/views/SellerAddProductView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['seller'],
        storeContext: true,
      },
    },
    {
      path: '/stores/:storeId/inventory/withdraw',
      name: 'inventory-withdraw',
      component: () => import('@/views/InventoryWithdrawView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['seller'],
        storeContext: true,
      },
    },
    {
      path: '/seller-stock-management',
      name: 'seller-stock-management',
      component: () => import('@/views/SellerStockManagementView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
      },
    },
    {
      path: '/seller-stock-management/:sellerId/stores/:storeId/products',
      name: 'seller-stock-management-edit',
      component: () => import('@/views/SellerStockManagementEditView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
      },
    },
    {
      path: '/seller-stock-management/:sellerId/stores/:storeId/inventory',
      name: 'seller-inventory-management',
      component: () => import('@/views/SellerInventoryManagementView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
      },
    },
    {
      path: '/seller-stock-management/:sellerId/stores/:storeId/products/:id/edit-stock',
      name: 'seller-stock-management-stock-edit',
      component: () => import('@/views/SellerStockManagementStockEditView.vue'),
      meta: {
        layout: 'default',
        requiresAuth: true,
        roles: ['admin', 'manager'],
      },
    },
  ],
})

// Guard global
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Se a rota requer autenticação
  if (to.meta.requiresAuth) {
    // Se não tem token, redirecionar para login
    if (!authStore.token) {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }

    // Se tem token mas não tem user, tentar buscar
    if (!authStore.user) {
      try {
        await authStore.fetchUser()
      } catch {
        // Se falhar, redirecionar para login
        next({ name: 'login' })
        return
      }
    }

    // Verificar role se necessário
    if (to.meta.roles && Array.isArray(to.meta.roles)) {
      const userRole = authStore.user?.role
      if (!userRole || !to.meta.roles.includes(userRole)) {
        // Usuário não tem permissão - redirecionar para home ou dashboard do seller
        if (userRole === 'seller') {
          const userStoreId = authStore.user?.store_id
          if (userStoreId) {
            next({ name: 'seller-dashboard' })
          } else {
            next({ name: 'home' })
          }
        } else {
          next({ name: 'home' })
        }
        return
      }
    }

    // Redirecionar sellers da home para dashboard
    if (to.name === 'home' && authStore.user?.role === 'seller') {
      const userStoreId = authStore.user?.store_id
      if (userStoreId) {
        next({ name: 'seller-dashboard' })
        return
      }
    }

    // Verificar store context se necessário
    if (to.meta.storeContext && to.params.storeId) {
      const storeId = Number(to.params.storeId)
      const userRole = authStore.user?.role
      const userStoreId = authStore.user?.store_id

      // Admin pode acessar qualquer loja
      // Manager/Seller só pode acessar sua própria loja
      if (userRole !== 'admin' && userStoreId !== storeId) {
        // Usuário não tem permissão para acessar esta loja
        // Redirecionar sellers para dashboard, outros para home
        if (userRole === 'seller') {
          next({ name: 'seller-dashboard' })
        } else {
          next({ name: 'home' })
        }
        return
      }
    }

    // Autenticado e autorizado, permitir acesso
    next()
    return
  }

  // Se está tentando acessar /login e já está autenticado
  if (to.name === 'login' && authStore.isAuthenticated) {
    // Redirecionar para home ou para a rota de redirect se existir
    const redirect = (from.query.redirect as string) || '/'
    next(redirect)
    return
  }

  // Rota pública, permitir acesso
  next()
})

export default router
