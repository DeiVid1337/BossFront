<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

function toggleSidebar() {
  window.dispatchEvent(new CustomEvent('sidebar-toggle'))
}
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <div class="header-left">
        <!-- Menu hambúrguer para mobile -->
        <button
          @click="toggleSidebar"
          class="btn-menu"
          aria-label="Toggle menu"
        >
          <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 class="app-title">Boss Pods</h1>
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button
          @click="authStore.logout"
          class="btn-logout"
        >
          <span class="logout-icon">🚪</span>
          <span class="logout-text">Sair</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(231, 0, 0, 0.05);
}

.header-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

@media (min-width: 640px) {
  .header-container {
    padding: 24px 40px;
  }
}

@media (min-width: 1024px) {
  .header-container {
    padding: 28px 56px;
  }
}

/* ============================================
   HEADER LEFT
   ============================================ */

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

@media (min-width: 640px) {
  .header-left {
    gap: 24px;
  }
}

.btn-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
}

@media (min-width: 768px) {
  .btn-menu {
    display: none;
  }
}

.btn-menu:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.btn-menu:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.3);
}

.menu-icon {
  width: 28px;
  height: 28px;
}

.app-title {
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  margin: 0;
  background: linear-gradient(135deg, #E70000 0%, #FF7F00 50%, #FFD700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 640px) {
  .app-title {
    font-size: 36px;
  }
}

@media (min-width: 1024px) {
  .app-title {
    font-size: 44px;
  }
}

/* ============================================
   HEADER RIGHT
   ============================================ */

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

@media (min-width: 640px) {
  .header-right {
    gap: 24px;
  }
}

.user-name {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  display: none;
}

@media (min-width: 640px) {
  .user-name {
    display: inline-block;
    font-size: 18px;
  }
}

@media (min-width: 1024px) {
  .user-name {
    font-size: 20px;
  }
}

.btn-logout {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 700;
  border-radius: 16px;
  padding: 16px 32px;
  min-height: 56px;
  min-width: 56px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3), 0 0 20px rgba(220, 38, 38, 0.1);
}

@media (min-width: 640px) {
  .btn-logout {
    padding: 16px 40px;
    min-width: auto;
  }
}

.btn-logout:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(220, 38, 38, 0.4), 0 0 30px rgba(220, 38, 38, 0.15);
}

.btn-logout:active {
  transform: translateY(0);
}

.btn-logout:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.4), 0 4px 16px rgba(220, 38, 38, 0.3);
}

.logout-icon {
  font-size: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 640px) {
  .logout-icon {
    display: none;
  }
}

.logout-text {
  display: none;
}

@media (min-width: 640px) {
  .logout-text {
    display: inline-block;
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

button:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
