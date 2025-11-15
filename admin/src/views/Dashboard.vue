<template>
  <el-container class="dashboard-container">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <h3>管理后台</h3>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="el-menu-vertical"
      >
        <el-menu-item index="/overview">
          <el-icon><DataAnalysis /></el-icon>
          <span>概览</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/conversations">
          <el-icon><ChatDotRound /></el-icon>
          <span>对话分析</span>
        </el-menu-item>
        <el-menu-item index="/knowledge-base">
          <el-icon><Document /></el-icon>
          <span>知识库</span>
        </el-menu-item>
        <el-menu-item index="/assessment">
          <el-icon><Checked /></el-icon>
          <span>测评管理</span>
        </el-menu-item>
        <el-menu-item index="/system">
          <el-icon><Setting /></el-icon>
          <span>系统监控</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-right">
          <el-button @click="handleLogout" text>
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import {
  DataAnalysis,
  User,
  ChatDotRound,
  Document,
  Checked,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const activeMenu = computed(() => route.path)

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    sessionStorage.removeItem('admin_auth')
    router.push('/login')
  })
}
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
  width: 100vw;
}

.sidebar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 4px 0 20px rgba(102, 126, 234, 0.15);
  position: relative;
  overflow: hidden;
}

.sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="30" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="60" r="1.5" fill="rgba(255,255,255,0.08)"/><circle cx="80" cy="20" r="1" fill="rgba(255,255,255,0.12)"/><circle cx="70" cy="70" r="1.2" fill="rgba(255,255,255,0.1)"/></svg>');
  background-size: 200px 200px;
  opacity: 0.5;
  pointer-events: none;
}

.logo {
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  z-index: 1;
}

.logo h3 {
  color: white;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 1px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.el-menu-vertical {
  border: none;
  background: transparent !important;
  position: relative;
  z-index: 1;
}

.el-menu-item {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  margin: 8px 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.el-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.15) !important;
  color: white;
  transform: translateX(4px);
}

.el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.25) !important;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-weight: 600;
}

.el-menu-item .el-icon {
  color: inherit;
}

.header {
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right .el-button {
  font-weight: 500;
  color: #606266;
  transition: all 0.3s ease;
}

.header-right .el-button:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.main-content {
  background: linear-gradient(135deg, #f5f7fa 0%, #f0f2f5 100%);
  padding: 0;
  overflow-y: auto;
}
</style>
