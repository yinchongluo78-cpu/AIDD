<template>
  <!-- 使用 keep-alive 缓存对话页和知识库页，避免切换时状态丢失 -->
  <router-view v-slot="{ Component }">
    <keep-alive include="Chat,Kb">
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <DiagnosticModal
    :show="showDiagnosticModal"
    @close="showDiagnosticModal = false"
    @skip="showDiagnosticModal = false"
    @start="showDiagnosticModal = false"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from './api'
import DiagnosticModal from './components/DiagnosticModal.vue'

const router = useRouter()
const route = useRoute()
const showDiagnosticModal = ref(false)
const hasCheckedOnboarding = ref(false) // 添加标记，避免同一会话中重复检查

let sessionId: string | null = null
let heartbeatInterval: number | null = null

// 开始会话
const startSession = async () => {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const response = await api.post('/users/session/start')
    sessionId = response.sessionId
    console.log('会话已启动:', sessionId)

    // 启动心跳（每30秒）
    heartbeatInterval = window.setInterval(sendHeartbeat, 30000)
  } catch (error) {
    console.error('启动会话失败:', error)
  }
}

// 发送心跳
const sendHeartbeat = async () => {
  if (!sessionId) return

  try {
    await api.post('/users/session/heartbeat', { sessionId })
    console.log('心跳已发送')
  } catch (error) {
    console.error('发送心跳失败:', error)
  }
}

// 结束会话
const endSession = async () => {
  if (!sessionId) return

  try {
    await api.post('/users/session/end', { sessionId })
    console.log('会话已结束')
  } catch (error) {
    console.error('结束会话失败:', error)
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }

  sessionId = null
}

// 检查是否需要显示测试弹窗
const checkOnboardingStatus = async () => {
  const token = localStorage.getItem('token')
  if (!token) return

  // 本次会话已经检查过，不再重复检查
  if (hasCheckedOnboarding.value) return

  // 仅在非测试页面显示弹窗
  if (route.path.startsWith('/diagnostic')) return

  try {
    const response = await api.get('/diagnostic/onboarding/status')
    hasCheckedOnboarding.value = true // 标记已检查

    if (response.shouldShowTestModal) {
      // 延迟1秒显示弹窗，避免与页面加载冲突
      setTimeout(() => {
        showDiagnosticModal.value = true
      }, 1000)
    }
  } catch (error) {
    console.error('检查引导状态失败:', error)
  }
}

// 监听路由变化，每次进入对话页或知识库页时检查引导状态
watch(() => route.path, (newPath) => {
  const token = localStorage.getItem('token')
  if (token && (newPath === '/chat' || newPath === '/kb')) {
    checkOnboardingStatus()
  }
})

onMounted(() => {
  // 检查是否已登录，如果已登录则启动会话
  const token = localStorage.getItem('token')
  if (token) {
    startSession()
    checkOnboardingStatus()
  }

  // 监听页面关闭事件
  window.addEventListener('beforeunload', endSession)

  // 监听页面可见性变化（用户切换标签页）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // 页面隐藏时发送心跳
      sendHeartbeat()
    }
  })
})

onUnmounted(() => {
  endSession()
  window.removeEventListener('beforeunload', endSession)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>