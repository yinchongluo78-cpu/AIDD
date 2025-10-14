<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import api from './api'

let sessionId: string | null = null
let heartbeatInterval: number | null = null

// 开始会话
const startSession = async () => {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const response = await api.post('/api/users/session/start')
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
    await api.post('/api/users/session/heartbeat', { sessionId })
    console.log('心跳已发送')
  } catch (error) {
    console.error('发送心跳失败:', error)
  }
}

// 结束会话
const endSession = async () => {
  if (!sessionId) return

  try {
    await api.post('/api/users/session/end', { sessionId })
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

onMounted(() => {
  // 检查是否已登录，如果已登录则启动会话
  const token = localStorage.getItem('token')
  if (token) {
    startSession()
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