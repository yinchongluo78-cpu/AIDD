<template>
  <div class="system-container">
    <h2 class="page-title">系统监控</h2>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card>
          <div class="stat-box">
            <div class="stat-label">DeepSeek 调用次数</div>
            <div class="stat-value">{{ systemStats.deepseekCalls || 0 }}</div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card>
          <div class="stat-box">
            <div class="stat-label">OCR 识别次数</div>
            <div class="stat-value">{{ systemStats.ocrCalls || 0 }}</div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card>
          <div class="stat-box">
            <div class="stat-label">OSS 存储空间</div>
            <div class="stat-value">{{ formatSize(systemStats.ossStorage || 0) }}</div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card>
          <div class="stat-box">
            <div class="stat-label">总文件数</div>
            <div class="stat-value">{{ systemStats.totalFiles || 0 }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="cost-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>API 成本估算</span>
              <el-button text @click="loadSystemStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="cost-info">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="cost-item">
                  <span class="cost-label">DeepSeek 成本</span>
                  <span class="cost-value">¥ {{ (systemStats.deepseekCost || 0).toFixed(2) }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="cost-item">
                  <span class="cost-label">阿里云 OCR 成本</span>
                  <span class="cost-value">¥ {{ (systemStats.ocrCost || 0).toFixed(2) }}</span>
                </div>
              </el-col>
            </el-row>
            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="12">
                <div class="cost-item">
                  <span class="cost-label">OSS 存储成本</span>
                  <span class="cost-value">¥ {{ (systemStats.ossCost || 0).toFixed(2) }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="cost-item">
                  <span class="cost-label">总成本</span>
                  <span class="cost-value total">¥ {{ totalCost.toFixed(2) }}</span>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>数据库统计</span>
              <el-button text @click="loadSystemStats">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="db-info">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="db-item">
                  <span class="db-label">用户表记录</span>
                  <span class="db-value">{{ systemStats.userCount || 0 }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="db-item">
                  <span class="db-label">对话表记录</span>
                  <span class="db-value">{{ systemStats.conversationCount || 0 }}</span>
                </div>
              </el-col>
            </el-row>
            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="12">
                <div class="db-item">
                  <span class="db-label">消息表记录</span>
                  <span class="db-value">{{ systemStats.messageCount || 0 }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="db-item">
                  <span class="db-label">知识库切片</span>
                  <span class="db-value">{{ systemStats.chunkCount || 0 }}</span>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="activity-row">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近 API 调用</span>
              <el-button text @click="loadApiLogs">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="apiLogs" style="width: 100%" v-loading="loading">
            <el-table-column prop="type" label="类型" width="150">
              <template #default="{ row }">
                <el-tag v-if="row.type === 'deepseek'" type="primary">DeepSeek</el-tag>
                <el-tag v-else-if="row.type === 'ocr'" type="success">OCR</el-tag>
                <el-tag v-else type="info">其他</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="userName" label="用户" width="120" />
            <el-table-column prop="model" label="模型" width="150" />
            <el-table-column prop="tokens" label="Token 数" width="100" />
            <el-table-column prop="cost" label="成本" width="100">
              <template #default="{ row }">
                ¥ {{ (row.cost || 0).toFixed(4) }}
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="耗时(ms)" width="100" />
            <el-table-column prop="createdAt" label="调用时间" min-width="180">
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
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import api from '../api'
import { ElMessage } from 'element-plus'

interface SystemStats {
  deepseekCalls: number
  ocrCalls: number
  ossStorage: number
  totalFiles: number
  deepseekCost: number
  ocrCost: number
  ossCost: number
  userCount: number
  conversationCount: number
  messageCount: number
  chunkCount: number
}

const loading = ref(false)
const systemStats = ref<SystemStats>({
  deepseekCalls: 0,
  ocrCalls: 0,
  ossStorage: 0,
  totalFiles: 0,
  deepseekCost: 0,
  ocrCost: 0,
  ossCost: 0,
  userCount: 0,
  conversationCount: 0,
  messageCount: 0,
  chunkCount: 0
})

const apiLogs = ref([])

const totalCost = computed(() => {
  return (systemStats.value.deepseekCost || 0) +
         (systemStats.value.ocrCost || 0) +
         (systemStats.value.ossCost || 0)
})

const loadSystemStats = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/system/stats')
    systemStats.value = response
  } catch (error) {
    console.error('加载系统统计失败:', error)
    ElMessage.error('加载系统统计失败')
  } finally {
    loading.value = false
  }
}

const loadApiLogs = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/system/api-logs', {
      params: {
        limit: 20
      }
    })
    apiLogs.value = response.data
  } catch (error) {
    console.error('加载 API 日志失败:', error)
    ElMessage.error('加载 API 日志失败')
  } finally {
    loading.value = false
  }
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  loadSystemStats()
  loadApiLogs()
})
</script>

<style scoped>
.system-container {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  color: #303133;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-box {
  padding: 10px 0;
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.cost-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cost-info,
.db-info {
  padding: 20px 10px;
}

.cost-item,
.db-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.cost-label,
.db-label {
  font-size: 14px;
  color: #606266;
}

.cost-value {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.cost-value.total {
  color: #f56c6c;
  font-size: 24px;
}

.db-value {
  font-size: 20px;
  font-weight: bold;
  color: #67c23a;
}

.activity-row {
  margin-top: 20px;
}
</style>
