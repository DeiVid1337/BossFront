<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

// Layouts lazy: reduzem o bundle inicial e melhoram FCP (ex.: tela de login)
const AuthLayout = defineAsyncComponent(() => import('@/layouts/AuthLayout.vue'))
const DefaultLayout = defineAsyncComponent(() => import('@/layouts/DefaultLayout.vue'))

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
