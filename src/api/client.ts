/**
 * Cliente HTTP base para a API Boss Pods
 * Tratamento centralizado de erros e autenticação
 */

import { getApiBaseUrl } from '@/utils/env'
import { ApiError, ValidationError } from './types'
import type { ErrorResponse } from './types'

/**
 * Helper para obter o token de autenticação
 * Usa localStorage diretamente (a store também salva lá)
 */
function getToken(): string | null {
  return localStorage.getItem('token')
}

/**
 * Helper para limpar autenticação em caso de 401
 * Tenta usar a store, com fallback para localStorage
 */
async function clearAuth() {
  try {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    authStore.clearAuth()
  } catch {
    // Fallback: apenas limpar localStorage e redirecionar
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
}

/**
 * Constrói uma query string a partir de parâmetros
 */
export function buildQueryString(params: unknown): string {
  if (!params || typeof params !== 'object') return ''

  const entries = Object.entries(params as Record<string, unknown>).filter(([, value]) => {
    // Filtrar undefined e null
    if (value === undefined || value === null) return false
    // Filtrar strings vazias
    if (typeof value === 'string' && value.trim() === '') return false
    return true
  })

  if (entries.length === 0) return ''

  const searchParams = new URLSearchParams()
  entries.forEach(([key, value]) => {
    // Para booleanos, usar '1'/'0' para máxima compatibilidade com validações.
    // (Backends costumam aceitar também 'true'/'false', mas alguns validadores são mais restritos.)
    if (typeof value === 'boolean') {
      searchParams.append(key, value ? '1' : '0')
    } else {
      searchParams.append(key, String(value))
    }
  })

  return searchParams.toString()
}

/**
 * Configuração de requisição
 */
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  params?: unknown
  requiresAuth?: boolean
}

/**
 * Cliente HTTP base
 */
export async function request<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', body, params, requiresAuth = true } = config

  const baseUrl = getApiBaseUrl()
  const queryString = buildQueryString(params)
  const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`

  // Headers
  const headers: HeadersInit = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  // Adicionar token se necessário
  if (requiresAuth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  // Configuração da requisição
  const requestInit: RequestInit = {
    method,
    headers,
  }

  // Adicionar body se necessário
  if (body !== undefined) {
    requestInit.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, requestInit)

    // Tratar erros HTTP
    if (!response.ok) {
      await handleErrorResponse(response)
    }

    // Parse da resposta
    const data = await response.json()

    // Se a resposta tem formato { data: T, meta?: ... }, verificar se é paginada
    if (data && typeof data === 'object' && 'data' in data) {
      // Se tem meta, é uma resposta paginada - retornar objeto completo
      if ('meta' in data) {
        return data as T
      }
      // Caso contrário, retornar apenas data
      return data.data as T
    }

    // Caso contrário, retornar a resposta completa
    return data as T
  } catch (error) {
    // Se já é um ApiError, re-lançar
    if (error instanceof ApiError || error instanceof ValidationError) {
      throw error
    }

    // Erro de rede ou outro erro
    throw new Error('Network error or server unavailable')
  }
}

/**
 * Trata respostas de erro da API
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let errorData: ErrorResponse

  try {
    errorData = await response.json()
  } catch {
    // Se não conseguir parsear JSON, criar erro genérico
    throw new ApiError(`Request failed with status ${response.status}`, response.status)
  }

  const { message, errors } = errorData

  // 401: Não autenticado - limpar token e redirecionar
  if (response.status === 401) {
    clearAuth()
    throw new ApiError(message || 'Unauthorized', 401)
  }

  // 403: Sem permissão
  if (response.status === 403) {
    throw new ApiError(message || 'Forbidden', 403)
  }

  // 422: Erro de validação
  if (response.status === 422 && errors) {
    throw new ValidationError(message || 'Validation failed', errors)
  }

  // 409: Conflito
  if (response.status === 409) {
    throw new ApiError(message || 'Conflict', 409)
  }

  // Outros erros
  throw new ApiError(message || 'Request failed', response.status, errors)
}
