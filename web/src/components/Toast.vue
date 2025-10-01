<template>
  <Transition name="toast">
    <div v-if="visible" class="toast-container" :class="type">
      <div class="toast-icon">
        <svg v-if="type === 'success'" viewBox="0 0 24 24" width="20" height="20">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
        </svg>
        <svg v-else-if="type === 'error'" viewBox="0 0 24 24" width="20" height="20">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
        </svg>
        <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" width="20" height="20">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
        </svg>
      </div>
      <div class="toast-message">{{ message }}</div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}>()

const visible = ref(false)
let timer: NodeJS.Timeout | null = null

watch(() => props.message, (newMessage) => {
  if (newMessage) {
    visible.value = true

    if (timer) clearTimeout(timer)

    timer = setTimeout(() => {
      visible.value = false
    }, props.duration || 3000)
  }
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(30, 30, 30, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-message {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.toast-container.success {
  border-left: 3px solid #4caf50;
}

.toast-container.success .toast-icon {
  color: #4caf50;
}

.toast-container.error {
  border-left: 3px solid #f44336;
}

.toast-container.error .toast-icon {
  color: #f44336;
}

.toast-container.warning {
  border-left: 3px solid #ff9800;
}

.toast-container.warning .toast-icon {
  color: #ff9800;
}

.toast-container.info {
  border-left: 3px solid #2196f3;
}

.toast-container.info .toast-icon {
  color: #2196f3;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>