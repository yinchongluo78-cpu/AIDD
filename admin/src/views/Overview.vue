<template>
  <div class="overview-container">
    <h2 class="page-title">数据概览</h2>

    <!-- 统计卡片 -->
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

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>累计用户数趋势</span>
              <el-button text @click="loadStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div ref="userTrendChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>活跃用户数趋势</span>
              <el-button text @click="loadStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div ref="activeUserChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>对话数趋势</span>
              <el-button text @click="loadStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div ref="conversationChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>用户在线时长趋势</span>
              <el-button text @click="loadStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div ref="durationChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 活动数据表格 -->
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
import { ref, onMounted, onUnmounted } from 'vue'
import { User, ChatDotRound, Comment, Document, Refresh } from '@element-plus/icons-vue'
import api from '../api'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

interface Stats {
  totalUsers: number
  totalConversations: number
  totalMessages: number
  totalDocuments: number
  userTrend?: { date: string; count: number }[]
  activeUserTrend?: { date: string; count: number }[]
  conversationTrend?: { date: string; count: number }[]
  durationTrend?: { date: string; hours: number }[]
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

// 图表实例
const userTrendChart = ref<HTMLElement | null>(null)
const activeUserChart = ref<HTMLElement | null>(null)
const conversationChart = ref<HTMLElement | null>(null)
const durationChart = ref<HTMLElement | null>(null)

let userTrendChartInstance: echarts.ECharts | null = null
let activeUserChartInstance: echarts.ECharts | null = null
let conversationChartInstance: echarts.ECharts | null = null
let durationChartInstance: echarts.ECharts | null = null

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

    // 渲染图表
    renderCharts()
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  // 用户数趋势图（蓝色折线图）
  if (userTrendChart.value && stats.value.userTrend) {
    if (!userTrendChartInstance) {
      userTrendChartInstance = echarts.init(userTrendChart.value)
    }

    const dates = stats.value.userTrend.map(item => item.date)
    const counts = stats.value.userTrend.map(item => item.count)

    userTrendChartInstance.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data: counts,
        type: 'line',
        smooth: true,
        areaStyle: {
          color: 'rgba(64, 158, 255, 0.2)'
        },
        itemStyle: {
          color: '#409eff'
        },
        lineStyle: {
          color: '#409eff',
          width: 2
        }
      }]
    })
  }

  // 活跃用户数趋势（绿色柱状图）
  if (activeUserChart.value && stats.value.activeUserTrend) {
    if (!activeUserChartInstance) {
      activeUserChartInstance = echarts.init(activeUserChart.value)
    }

    const dates = stats.value.activeUserTrend.map(item => item.date)
    const counts = stats.value.activeUserTrend.map(item => item.count)

    activeUserChartInstance.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data: counts,
        type: 'bar',
        itemStyle: {
          color: '#67c23a'
        }
      }]
    })
  }

  // 对话数趋势（橙色折线图）
  if (conversationChart.value && stats.value.conversationTrend) {
    if (!conversationChartInstance) {
      conversationChartInstance = echarts.init(conversationChart.value)
    }

    const dates = stats.value.conversationTrend.map(item => item.date)
    const counts = stats.value.conversationTrend.map(item => item.count)

    conversationChartInstance.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data: counts,
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#e6a23c'
        },
        lineStyle: {
          color: '#e6a23c',
          width: 2
        }
      }]
    })
  }

  // 用户在线时长趋势（红色柱状图）
  if (durationChart.value && stats.value.durationTrend) {
    if (!durationChartInstance) {
      durationChartInstance = echarts.init(durationChart.value)
    }

    const dates = stats.value.durationTrend.map(item => item.date)
    const hours = stats.value.durationTrend.map(item => item.hours)

    durationChartInstance.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br/>{a}: {c}h'
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value',
        name: '时长(秒)'
      },
      series: [{
        name: '在线时长',
        data: hours,
        type: 'bar',
        itemStyle: {
          color: '#f56c6c'
        }
      }]
    })
  }
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  loadStats()

  // 监听窗口大小变化，重新渲染图表
  window.addEventListener('resize', () => {
    userTrendChartInstance?.resize()
    activeUserChartInstance?.resize()
    conversationChartInstance?.resize()
    durationChartInstance?.resize()
  })
})

onUnmounted(() => {
  // 销毁图表实例
  userTrendChartInstance?.dispose()
  activeUserChartInstance?.dispose()
  conversationChartInstance?.dispose()
  durationChartInstance?.dispose()
})
</script>

<style scoped>
.overview-container {
  padding: 30px;
}

.page-title {
  margin-bottom: 30px;
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.stats-row {
  margin-bottom: 30px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  border: none;
  overflow: hidden;
  position: relative;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%);
  z-index: 0;
}

.stat-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.25);
}

.stat-card:nth-child(1) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card:nth-child(4) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px 0;
  position: relative;
  z-index: 1;
}

.stat-icon {
  font-size: 48px;
  margin-right: 20px;
  opacity: 0.9;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.stat-icon.users {
  color: #667eea;
}

.stat-icon.conversations {
  color: #f5576c;
}

.stat-icon.messages {
  color: #00f2fe;
}

.stat-icon.documents {
  color: #38f9d7;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.2;
  margin-bottom: 6px;
  letter-spacing: -1px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #303133;
}

.charts-row {
  margin-bottom: 30px;
}

.charts-row .el-card,
.activity-row .el-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.charts-row .el-card:hover,
.activity-row .el-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}

.chart-container {
  width: 100%;
  height: 320px;
}

.activity-row {
  margin-top: 20px;
}

/* 优化 Element Plus 卡片样式 */
:deep(.el-card__body) {
  padding: 24px;
}

:deep(.el-card__header) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.9) 100%);
}

/* 优化表格样式 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%);
  font-weight: 600;
  color: #303133;
}

:deep(.el-table td) {
  color: #606266;
}

:deep(.el-table tr:hover > td) {
  background: rgba(102, 126, 234, 0.05) !important;
}
</style>
