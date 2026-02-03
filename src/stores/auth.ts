/**
 * Store de autenticação (Pinia)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, logout as logoutApi, me } from '@/api/endpoints/auth'
import type { User } from '@/api/types'
import { ValidationError } from '@/api/types'
import router from '@/router'

const TOKEN_KEY = 'token'
/** TTL do cache do perfil (me): evita refetch em navegações rápidas */
const USER_CACHE_TTL_MS = 2 * 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUserFetchTs = ref(0)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Actions
  function setToken(newToken: string | null) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  function setUser(newUser: User | null) {
    user.value = newUser
  }

  function clearAuth() {
    setToken(null)
    setUser(null)
    error.value = null
    lastUserFetchTs.value = 0
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const response = await loginApi({ email, password })
      setToken(response.token)
      setUser(response.user)
      return response
    } catch (err) {
      if (err instanceof ValidationError) {
        error.value = err.message
        throw err
      }
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erro ao fazer login'
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    error.value = null

    try {
      if (token.value) {
        await logoutApi()
      }
    } catch (err) {
      // Mesmo se a API falhar, limpar o estado local
      console.error('Erro ao fazer logout na API:', err)
    } finally {
      clearAuth()
      loading.value = false
      router.push('/login')
    }
  }

  async function fetchUser() {
    if (!token.value) {
      clearAuth()
      return
    }

    // Cache: evitar refetch em navegações rápidas (TTL 2 min)
    if (
      user.value &&
      lastUserFetchTs.value > 0 &&
      Date.now() - lastUserFetchTs.value < USER_CACHE_TTL_MS
    ) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const userData = await me()
      setUser(userData)
      lastUserFetchTs.value = Date.now()
    } catch (err) {
      // 401 ou outro erro - limpar autenticação
      clearAuth()
      if (err instanceof Error && err.message.includes('401')) {
        router.push('/login')
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    token,
    user,
    loading,
    error,
    // Getters
    isAuthenticated,
    // Actions
    login,
    logout,
    fetchUser,
    clearAuth,
    setToken,
    setUser,
  }
})
