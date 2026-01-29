/**
 * Tipos TypeScript para a API Boss Pods
 * Baseado em Docs/api.md
 */

// ============================================================================
// Tipos Base de Entidades
// ============================================================================

export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'manager' | 'seller'
  store_id: number | null
  is_active: boolean
  store?: {
    id: number
    name: string
  } | null
  created_at: string
  updated_at: string
}

export interface Store {
  id: number
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  brand: string
  name: string
  flavor: string
  created_at: string
  updated_at: string
}

export interface StoreProduct {
  id: number
  store_id: number
  product_id: number
  cost_price: string // Decimal como string
  sale_price: string // Decimal como string
  stock_quantity: number
  min_stock_level: number
  is_active: boolean
  // Campos adicionais para Sellers
  seller_quantity?: number // Estoque do vendedor autenticado (apenas para Sellers)
  available_quantity?: number // Quantidade disponível para retirada (stock - sum de todos sellers)
  product?: {
    id: number
    brand: string
    name: string
    flavor: string
  }
  created_at: string
  updated_at: string
}

export interface SellerInventoryItem {
  store_product_id: number
  quantity: number
  // Opcional: quando API inclui dados do store_product junto
  store_product?: StoreProduct
}

export interface Customer {
  id: number
  name: string
  phone: string
  total_purchases: number
  sales?: SaleSummary[]
  created_at: string
  updated_at: string
}

export interface SaleSummary {
  id: number
  store_id: number
  total_amount: string
  sale_date: string
  created_at: string
}

export interface Sale {
  id: number
  store_id: number
  user_id: number
  customer_id: number | null
  total_amount: string // Decimal como string
  sale_date: string
  notes: string | null
  created_at: string
  updated_at: string
  items?: SaleItem[]
  customer?: {
    id: number
    name: string
    phone: string
  }
  user?: {
    id: number
    name: string
  }
}

export interface SaleItem {
  id: number
  sale_id: number
  store_product_id: number
  quantity: number
  unit_price: string // Decimal como string
  subtotal: string // Decimal como string
}

// ============================================================================
// Tipos de Resposta
// ============================================================================

export interface SingleResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from: number | null
    to: number | null
  }
  links?: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
}

export interface ErrorResponse {
  message: string
  errors?: Record<string, string[]>
}

// ============================================================================
// Tipos de Request (DTOs)
// ============================================================================

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface CreateStoreRequest {
  name: string
  address?: string | null
  phone?: string | null
  is_active?: boolean
}

export interface UpdateStoreRequest {
  name?: string
  address?: string | null
  phone?: string | null
  is_active?: boolean
}

export interface CreateProductRequest {
  brand: string
  name: string
  flavor: string
}

export interface UpdateProductRequest {
  brand?: string
  name?: string
  flavor?: string
}

export interface CreateStoreProductRequest {
  product_id: number
  cost_price: number
  sale_price: number
  stock_quantity: number
  min_stock_level?: number
  is_active?: boolean
}

export interface UpdateStoreProductRequest {
  cost_price?: number
  sale_price?: number
  stock_quantity?: number
  min_stock_level?: number
  is_active?: boolean
}

export interface CreateCustomerRequest {
  name: string
  phone: string
}

export interface UpdateCustomerRequest {
  name?: string
  phone?: string
}

export interface CreateSaleRequest {
  customer_id?: number | null
  items: Array<{
    store_product_id: number
    quantity: number
  }>
  notes?: string | null
}

export interface WithdrawInventoryRequest {
  items: Array<{
    store_product_id: number
    quantity: number
  }>
}

export interface SellerInventoryTransferRequest {
  items: Array<{
    store_product_id: number
    quantity: number
  }>
}

// Admin/Manager: usa os mesmos endpoints de withdraw/return, mas informando seller_id
export interface AdminSellerInventoryTransferRequest extends SellerInventoryTransferRequest {
  seller_id: number
}

export interface InventoryUpdateResponse {
  message: string
  updated_at?: string
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: 'admin' | 'manager' | 'seller'
  store_id?: number | null // Obrigatório se role é manager ou seller
  is_active?: boolean
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  password?: string
  role?: 'admin' | 'manager' | 'seller'
  store_id?: number | null
  is_active?: boolean
}

// ============================================================================
// Tipos de Query Parameters
// ============================================================================

export interface ListQueryParams {
  page?: number
  per_page?: number // Max: 100
}

export interface StoresListParams extends ListQueryParams {
  is_active?: boolean
  search?: string // Max: 255
  sort_by?: 'name' | 'is_active' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface ProductsListParams extends ListQueryParams {
  brand?: string
  search?: string // Max: 255
  sort_by?: 'brand' | 'name' | 'flavor' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface StoreProductsListParams extends ListQueryParams {
  is_active?: boolean
  low_stock?: boolean
  search?: string // Max: 255
  // Admin/Manager: opcional para obter seller_quantity de um vendedor específico (quando suportado no backend)
  seller_id?: number
  sort_by?: 'stock_quantity' | 'sale_price' | 'created_at' | 'product_name'
  sort_order?: 'asc' | 'desc'
}

export interface CustomersListParams extends ListQueryParams {
  search?: string // Max: 255
  phone?: string
  sort_by?: 'name' | 'phone' | 'total_purchases' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface SalesListParams extends ListQueryParams {
  from?: string // Date: YYYY-MM-DD
  to?: string // Date: YYYY-MM-DD, deve ser >= from
  search?: string // Max: 255 (busca em notes)
  sort_by?: 'sale_date' | 'total_amount' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface UsersListParams extends ListQueryParams {
  role?: 'admin' | 'manager' | 'seller'
  store_id?: number // Apenas Admin
  is_active?: boolean
  search?: string // Max: 255
  sort_by?: 'name' | 'email' | 'role' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

// ============================================================================
// Erros Customizados
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends ApiError {
  public validationErrors: Record<string, string[]>

  constructor(message: string, errors: Record<string, string[]>) {
    super(message, 422, errors)
    this.name = 'ValidationError'
    this.validationErrors = errors
  }
}
