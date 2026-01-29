<script setup lang="ts">
import { computed } from 'vue'
import { useStoreContext } from '@/composables/useStoreContext'

const storeContext = useStoreContext()

const showSelector = computed(
  () => storeContext.canChangeStore && storeContext.storeOptions.value.length > 0
)

const storeOptions = computed(() => storeContext.storeOptions.value)
const currentStoreId = computed(() => storeContext.storeId.value)
const currentStoreName = computed(() => storeContext.currentStoreName.value)

function handleStoreChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const storeId = target.value ? Number(target.value) : null
  storeContext.setCurrentStoreId(storeId)
}
</script>

<template>
  <div v-if="showSelector" class="store-selector-wrapper">
    <div class="store-selector-card">
      <label for="store-select" class="store-label">
        <span class="label-icon">🏪</span>
        <span class="label-text">Loja:</span>
      </label>
      <select
        id="store-select"
        :value="currentStoreId ?? ''"
        @change="handleStoreChange"
        class="store-select"
      >
        <option value="">Selecione uma loja</option>
        <option v-for="store in storeOptions" :key="store.id" :value="store.id">
          {{ store.name }}
        </option>
      </select>
    </div>
  </div>
  <div v-else-if="currentStoreName" class="store-selector-wrapper">
    <div class="store-display-card">
      <span class="store-label">
        <span class="label-icon">🏪</span>
        <span class="label-text">Loja:</span>
      </span>
      <span class="store-name">{{ currentStoreName }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.store-selector-wrapper {
  padding: 24px 20px;
  max-width: 1280px;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .store-selector-wrapper {
    padding: 32px 40px;
  }
}

@media (min-width: 1024px) {
  .store-selector-wrapper {
    padding: 40px 56px;
  }
}

/* ============================================
   STORE SELECTOR CARD
   ============================================ */

.store-selector-card,
.store-display-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 40px rgba(231, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 640px) {
  .store-selector-card,
  .store-display-card {
    flex-direction: row;
    align-items: center;
    gap: 32px;
    padding: 40px;
  }
}

@media (min-width: 1024px) {
  .store-selector-card,
  .store-display-card {
    padding: 48px 56px;
  }
}

/* ============================================
   STORE LABEL
   ============================================ */

.store-label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

@media (min-width: 640px) {
  .store-label {
    font-size: 20px;
  }
}

.label-icon {
  font-size: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 640px) {
  .label-icon {
    font-size: 28px;
  }
}

.label-text {
  display: inline-block;
}

/* ============================================
   STORE SELECT
   ============================================ */

.store-select {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 20px 24px;
  color: #FFFFFF;
  font-size: 18px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 600;
  min-height: 64px;
  cursor: pointer;
  transition: all 0.2s ease;
}

@media (min-width: 640px) {
  .store-select {
    font-size: 20px;
    padding: 20px 28px;
    min-height: 72px;
  }
}

.store-select::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.store-select:focus {
  outline: none;
  border-color: rgba(231, 0, 0, 0.5);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 3px rgba(231, 0, 0, 0.1);
}

.store-select:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
}

.store-select option {
  background: #000000;
  color: #FFFFFF;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
}

/* ============================================
   STORE DISPLAY
   ============================================ */

.store-name {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #FFD700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  flex: 1;
  text-align: left;
}

@media (min-width: 640px) {
  .store-name {
    font-size: 24px;
    text-align: right;
  }
}

.store-display-card {
  justify-content: space-between;
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

select:focus-visible {
  outline: 2px solid rgba(231, 0, 0, 0.5);
  outline-offset: 2px;
}
</style>
