<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'

interface Props {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  variant: 'default',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const modalContentRef = ref<HTMLElement | null>(null)

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleCancel()
  }
}

// Keyboard navigation: Escape to close
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.show) {
    handleCancel()
  }
}

// Focus trap: focus first focusable element when modal opens
watch(
  () => props.show,
  newValue => {
    if (newValue && modalContentRef.value) {
      // Focus first button when modal opens
      const firstButton = modalContentRef.value.querySelector('button') as HTMLElement
      if (firstButton) {
        setTimeout(() => {
          firstButton.focus()
        }, 100)
      }
    }
  }
)

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click="handleBackdropClick"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`modal-title-${props.title}`"
      >
        <div
          ref="modalContentRef"
          class="rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-[#E70000]/10 max-w-lg w-full mx-4 p-6 sm:p-8"
          @click.stop
        >
          <h2
            :id="`modal-title-${props.title}`"
            class="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight"
          >
            {{ props.title }}
          </h2>
          <p class="text-base text-slate-200 mb-6 sm:mb-8 leading-relaxed modal-message">
            {{ props.message }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              class="px-6 py-3 rounded-xl font-semibold text-white bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E70000] focus:ring-offset-2 focus:ring-offset-black w-full sm:w-auto"
              @click="handleCancel"
              type="button"
            >
              {{ props.cancelText }}
            </button>
            <button
              :class="[
                'px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black w-full sm:w-auto',
                props.variant === 'danger'
                  ? 'bg-red-400/20 backdrop-blur-lg border border-red-400/30 hover:bg-red-400/30 hover:border-red-400/50 focus:ring-red-400'
                  : 'bg-gradient-to-r from-[#E70000] via-[#FF7F00] to-[#FFD700] shadow-[#E70000]/25 hover:shadow-xl hover:shadow-[#E70000]/30 focus:ring-[#E70000]'
              ]"
              @click="handleConfirm"
              type="button"
            >
              {{ props.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Transitions com glassmorphism */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}

.modal-message {
  white-space: pre-line;
}
</style>
