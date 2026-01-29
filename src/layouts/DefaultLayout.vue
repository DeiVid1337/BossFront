<script setup lang="ts">
import AppHeader from '@/components/domain/AppHeader.vue'
import AppSidebar from '@/components/domain/AppSidebar.vue'
import StoreSelector from '@/components/domain/StoreSelector.vue'
</script>

<template>
  <div class="default-layout">
    <AppHeader />
    <div class="layout-body">
      <AppSidebar />
      <main class="main-content">
        <StoreSelector />
        <div class="router-view-wrapper">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   BASE & LAYOUT
   ============================================ */

.default-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0A0000 0%, #1A0000 50%, #000000 100%);
  background-attachment: fixed;
}

.layout-body {
  display: flex;
  flex: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.router-view-wrapper {
  flex: 1;
  max-width: 100%;
}
</style>
