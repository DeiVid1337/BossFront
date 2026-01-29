<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const route = useRoute()

const layout = computed(() => {
  if (route.meta.layout === 'auth') {
    return AuthLayout
  }
  if (route.meta.layout === 'default' || route.meta.requiresAuth) {
    return DefaultLayout
  }
  return 'div'
})
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

<style scoped></style>
