import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './assets/styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Bootstrap: verificar se há token e buscar usuário
const authStore = useAuthStore()
if (authStore.token) {
  authStore.fetchUser().catch(() => {
    // Se falhar, o guard do router vai redirecionar para login
  })
}

app.mount('#app')
