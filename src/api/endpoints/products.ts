/**
 * Endpoints de Products
 */

import { request } from '../client'
import type {
  CreateProductRequest,
  PaginatedResponse,
  Product,
  ProductsListParams,
  UpdateProductRequest,
} from '../types'

/**
 * Listar produtos
 */
export function getProducts(params?: ProductsListParams): Promise<PaginatedResponse<Product>> {
  return request<PaginatedResponse<Product>>('/products', {
    params,
  })
}

/**
 * Obter um produto
 */
export function getProduct(id: number): Promise<Product> {
  return request<Product>(`/products/${id}`)
}

/**
 * Criar produto
 */
export function createProduct(data: CreateProductRequest): Promise<Product> {
  return request<Product>('/products', {
    method: 'POST',
    body: data,
  })
}

/**
 * Atualizar produto
 */
export function updateProduct(id: number, data: UpdateProductRequest): Promise<Product> {
  return request<Product>(`/products/${id}`, {
    method: 'PUT',
    body: data,
  })
}

/**
 * Deletar produto
 */
export function deleteProduct(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/products/${id}`, {
    method: 'DELETE',
  })
}
