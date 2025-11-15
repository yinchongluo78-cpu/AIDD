<template>
  <div class="app-layout">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-left">
        <h1 class="main-title">智能少年</h1>
        <p class="sub-title">自学为基础 生产为导向</p>
      </div>

      <nav class="header-nav">
        <router-link to="/chat" class="nav-btn" active-class="active">
          <svg class="icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          对话
        </router-link>
        <router-link to="/kb" class="nav-btn" active-class="active">
          <svg class="icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M9 3v2H4v2h5v2H3v2h6v2H4v2h5v2H3v2h6v4h2V3H9zm10 0h-4v20h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          知识库
        </router-link>
        <router-link to="/assessment" class="nav-btn" active-class="active">
          <svg class="icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 16H9v-2h4v2zm3-4H8v-2h8v2zm0-4H8V8h8v2z" fill="currentColor"/>
          </svg>
          测评
        </router-link>
      </nav>

      <div class="header-right">
        <div class="user-profile-header" @click="$emit('show-profile')">
          <div class="user-avatar-header" :style="{ background: userAvatar }">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="35" r="15" fill="white" opacity="0.9"/>
              <ellipse cx="50" cy="70" rx="25" ry="20" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <span class="username-header">{{ userInfo.nickname || userInfo.username || '用户' }}</span>
          <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z" fill="currentColor"/>
          </svg>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="app-main">
      <slot></slot>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 使用 ref 而不是 computed，这样可以手动触发更新
const userInfo = ref<any>({})

const loadUserInfo = () => {
  const user = localStorage.getItem('user')
  userInfo.value = user ? JSON.parse(user) : {}
}

// 监听 storage 事件，当其他标签页或组件更新 localStorage 时响应
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'user' || e.key === null) {
    loadUserInfo()
  }
}

// 监听自定义事件，当同一页面内 localStorage 更新时响应
const handleCustomStorageUpdate = (e: CustomEvent) => {
  if (e.detail === 'user') {
    loadUserInfo()
  }
}

onMounted(() => {
  loadUserInfo()
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('localStorageUpdated', handleCustomStorageUpdate as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('localStorageUpdated', handleCustomStorageUpdate as EventListener)
})

const userAvatar = computed(() => {
  const storedInfo = localStorage.getItem('userInfo')
  if (storedInfo) {
    const info = JSON.parse(storedInfo)
    return info.avatar || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
  return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
})
</script>

<style scoped>
.app-layout {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0a0b;
  color: #ffffff;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

/* 顶部导航栏 */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: linear-gradient(180deg, #1a1a1d 0%, rgba(26, 26, 29, 0.95) 100%);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  z-index: 1000;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.main-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: 1px;
}

.sub-title {
  font-size: 12px;
  color: rgba(255, 215, 0, 0.6);
  margin: 0;
  letter-spacing: 0.5px;
}

.header-nav {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 30px;
  border: 1px solid rgba(255, 215, 0, 0.1);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 25px;
  position: relative;
}

.nav-btn:hover {
  color: rgba(255, 215, 0, 0.8);
}

.nav-btn.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
}

.nav-btn .icon {
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* 右上角用户资料区域 */
.user-profile-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 215, 0, 0.05);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 215, 0, 0.1);
}

.user-profile-header:hover {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
}

.user-avatar-header {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.user-avatar-header svg {
  width: 18px;
  height: 18px;
}

.username-header {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dropdown-icon {
  color: rgba(255, 255, 255, 0.6);
  transition: transform 0.2s ease;
}

.user-profile-header:hover .dropdown-icon {
  color: rgba(255, 215, 0, 0.8);
}

/* 主内容区域 */
.app-main {
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: calc(100vh - 70px);
  overflow: hidden;
  margin: 0;
  padding: 0;
}
</style>