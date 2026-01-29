/**
 * Endpoints de Customers
 */

import { request } from '../client'
import type {
  CreateCustomerRequest,
  Customer,
  CustomersListParams,
  PaginatedResponse,
  UpdateCustomerRequest,
} from '../types'

/**
 * Listar clientes
 */
export function getCustomers(params?: CustomersListParams): Promise<PaginatedResponse<Customer>> {
  return request<PaginatedResponse<Customer>>('/customers', {
    params,
  })
}

/**
 * Obter um cliente
 */
export function getCustomer(id: number, includeSales = false): Promise<Customer> {
  const params = includeSales ? { include: 'sales' } : undefined
  return request<Customer>(`/customers/${id}`, {
    params,
  })
}

/**
 * Criar cliente
 */
export function createCustomer(data: CreateCustomerRequest): Promise<Customer> {
  return request<Customer>('/customers', {
    method: 'POST',
    body: data,
  })
}

/**
 * Atualizar cliente
 */
export function updateCustomer(id: number, data: UpdateCustomerRequest): Promise<Customer> {
  return request<Customer>(`/customers/${id}`, {
    method: 'PUT',
    body: data,
  })
}
