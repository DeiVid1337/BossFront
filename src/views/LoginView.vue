<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ValidationError } from '@/api/types'

const router = useRouter()
const authStore = useAuthStore()

// Form state
const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})

// Validation
const isEmailValid = computed(() => {
  if (!email.value) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const canSubmit = computed(() => {
  return email.value && password.value && isEmailValid.value && !isSubmitting.value
})

// Error message
const errorMessage = computed(() => {
  if (authStore.error) return authStore.error
  return null
})

// Submit handler
async function handleSubmit() {
  if (!canSubmit.value) return

  isSubmitting.value = true
  fieldErrors.value = {}

  try {
    await authStore.login(email.value, password.value)
    // Login bem-sucedido - redirecionar para home
    router.push('/')
  } catch (error) {
    if (error instanceof ValidationError && error.errors) {
      // Erros de validação (422)
      fieldErrors.value = error.errors
    }
    // Outros erros já são tratados pela store
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Background orbs decorativos -->
    <div class="background-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="orb orb-4"></div>
    </div>

    <!-- Container principal -->
    <div class="login-container">
      <!-- Login Card -->
      <div class="login-card">
        <!-- Logo/Title -->
        <div class="login-header">
          <h1 class="login-title">
            <span class="title-gradient">Boss Pods</span>
          </h1>
          <p class="login-subtitle">Sistema de Gestão Multi-Loja</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="login-form">
          <!-- Email -->
          <div class="form-group">
            <label for="email" class="form-label">
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="form-input"
              :class="{ 'form-input-error': fieldErrors.email }"
              :aria-invalid="!!fieldErrors.email"
              :aria-describedby="fieldErrors.email ? 'email-error' : undefined"
              placeholder="seu@email.com"
              required
              autocomplete="email"
            />
            <div
              v-if="fieldErrors.email"
              id="email-error"
              class="form-error"
              role="alert"
              aria-live="polite"
            >
              {{ fieldErrors.email[0] }}
            </div>
          </div>

          <!-- Password -->
          <div class="form-group">
            <label for="password" class="form-label">
              Senha
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="form-input"
              :class="{ 'form-input-error': fieldErrors.password }"
              :aria-invalid="!!fieldErrors.password"
              :aria-describedby="fieldErrors.password ? 'password-error' : undefined"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
            <div
              v-if="fieldErrors.password"
              id="password-error"
              class="form-error"
              role="alert"
              aria-live="polite"
            >
              {{ fieldErrors.password[0] }}
            </div>
          </div>

          <!-- Error message -->
          <div
            v-if="errorMessage && !fieldErrors.email && !fieldErrors.password"
            class="error-message-general"
          >
            {{ errorMessage }}
          </div>

          <!-- Submit button -->
          <button type="submit" class="btn-submit" :disabled="!canSubmit">
            <span v-if="isSubmitting">Entrando...</span>
            <span v-else>Entrar</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0A0000 0%, #1A0000 50%, #000000 100%);
  background-attachment: fixed;
  color: #FFFFFF;
  position: relative;
  overflow-x: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
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
  top: 20%;
  left: 20%;
  width: 400px;
  height: 400px;
  background: rgba(231, 0, 0, 0.15);
}

.orb-2 {
  bottom: 20%;
  right: 20%;
  width: 400px;
  height: 400px;
  background: rgba(255, 127, 0, 0.15);
  animation-delay: 1s;
}

.orb-3 {
  top: 50%;
  right: 30%;
  width: 300px;
  height: 300px;
  background: rgba(255, 215, 0, 0.15);
  animation-delay: 2s;
}

.orb-4 {
  bottom: 30%;
  left: 30%;
  width: 350px;
  height: 350px;
  background: rgba(193, 127, 48, 0.15);
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

.login-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 480px;
}

/* ============================================
   LOGIN CARD
   ============================================ */

.login-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 40px 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 60px rgba(231, 0, 0, 0.1);
}

@media (min-width: 640px) {
  .login-card {
    padding: 48px 40px;
  }
}

@media (min-width: 1024px) {
  .login-card {
    padding: 56px 48px;
  }
}

/* ============================================
   LOGIN HEADER
   ============================================ */

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

@media (min-width: 640px) {
  .login-header {
    margin-bottom: 48px;
  }
}

.login-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 36px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0 0 12px 0;
}

@media (min-width: 640px) {
  .login-title {
    font-size: 44px;
  }
}

@media (min-width: 1024px) {
  .login-title {
    font-size: 52px;
  }
}

.title-gradient {
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-subtitle {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

@media (min-width: 640px) {
  .login-subtitle {
    font-size: 18px;
  }
}

/* ============================================
   LOGIN FORM
   ============================================ */

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 640px) {
  .login-form {
    gap: 28px;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

@media (min-width: 640px) {
  .form-label {
    font-size: 18px;
  }
}

.form-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 16px 20px;
  color: #FFFFFF;
  font-size: 16px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: 56px;
  transition: all 0.2s ease;
}

@media (min-width: 640px) {
  .form-input {
    padding: 18px 24px;
    font-size: 18px;
    min-height: 60px;
  }
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-input:focus {
  outline: none;
  border-color: rgba(231, 0, 0, 0.5);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.1);
}

.form-input-error {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.05);
}

.form-input-error:focus {
  border-color: rgba(239, 68, 68, 0.7);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-error {
  color: #FCA5A5;
  font-size: 14px;
  font-weight: 500;
  margin-top: 4px;
  line-height: 1.4;
}

.error-message-general {
  background: rgba(239, 68, 68, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  padding: 16px 20px;
  color: #FCA5A5;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
}

/* ============================================
   SUBMIT BUTTON
   ============================================ */

.btn-submit {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 700;
  border-radius: 16px;
  padding: 18px 32px;
  min-height: 56px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 16px rgba(231, 0, 0, 0.25), 0 0 20px rgba(231, 0, 0, 0.1);
  width: 100%;
}

@media (min-width: 640px) {
  .btn-submit {
    padding: 20px 40px;
    font-size: 20px;
    min-height: 60px;
  }
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 0, 0, 0.35), 0 0 30px rgba(231, 0, 0, 0.15);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(0);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-submit:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
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

button:focus-visible,
input:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
