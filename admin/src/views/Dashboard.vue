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
}

.sidebar {
  background: #304156;
  color: white;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2b3947;
}

.logo h3 {
  color: white;
  margin: 0;
}

.el-menu-vertical {
  border: none;
  background: #304156;
}

.el-menu-item {
  color: rgba(255, 255, 255, 0.7);
}

.el-menu-item:hover,
.el-menu-item.is-active {
  background-color: #263445 !important;
  color: white;
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
}
</style>
