<template>
  <div class="overview-container">
    <h2 class="page-title">数据概览</h2>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon users"><User /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalUsers }}</div>
              <div class="stat-label">总用户数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon conversations"><ChatDotRound /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalConversations }}</div>
              <div class="stat-label">总对话数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon messages"><Comment /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalMessages }}</div>
              <div class="stat-label">总消息数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon documents"><Document /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalDocuments }}</div>
              <div class="stat-label">知识库文档</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="activity-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近活跃用户</span>
              <el-button text @click="loadStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="recentUsers" style="width: 100%" v-loading="loading">
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column prop="lastActive" label="最后活跃" width="180">
              <template #default="{ row }">
                {{ formatTime(row.lastActive) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近对话</span>
              <el-button text @click="loadStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="recentConversations" style="width: 100%" v-loading="loading">
            <el-table-column prop="userName" label="用户" width="120" />
            <el-table-column prop="title" label="对话标题" />
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User, ChatDotRound, Comment, Document, Refresh } from '@element-plus/icons-vue'
import api from '../api'
import { ElMessage } from 'element-plus'

interface Stats {
  totalUsers: number
  totalConversations: number
  totalMessages: number
  totalDocuments: number
}

interface RecentUser {
  id: string
  name: string
  email: string
  lastActive: string
}

interface RecentConversation {
  id: string
  userName: string
  title: string
  createdAt: string
}

const loading = ref(false)
const stats = ref<Stats>({
  totalUsers: 0,
  totalConversations: 0,
  totalMessages: 0,
  totalDocuments: 0
})

const recentUsers = ref<RecentUser[]>([])
const recentConversations = ref<RecentConversation[]>([])

const loadStats = async () => {
  loading.value = true
  try {
    const [statsData, usersData, conversationsData] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/recent-users'),
      api.get('/admin/recent-conversations')
    ])

    stats.value = statsData
    recentUsers.value = usersData
    recentConversations.value = conversationsData
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.overview-container {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  color: #303133;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.stat-icon {
  font-size: 48px;
  margin-right: 20px;
}

.stat-icon.users {
  color: #409eff;
}

.stat-icon.conversations {
  color: #67c23a;
}

.stat-icon.messages {
  color: #e6a23c;
}

.stat-icon.documents {
  color: #f56c6c;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-row {
  margin-top: 20px;
}
</style>
