<template>
  <div class="kb-container">
    <h2 class="page-title">知识库分析</h2>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card>
          <el-statistic title="总文档数" :value="stats.totalDocuments" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <el-statistic title="总分类数" :value="stats.totalCategories" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <el-statistic title="总切片数" :value="stats.totalChunks" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>文档列表</span>
              <el-button text @click="loadData">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="documents" style="width: 100%" v-loading="loading" max-height="400">
            <el-table-column prop="userName" label="用户" width="100" />
            <el-table-column prop="fileName" label="文件名" min-width="150" show-overflow-tooltip />
            <el-table-column prop="categoryName" label="分类" width="120" />
            <el-table-column prop="chunkCount" label="切片数" width="80" />
            <el-table-column prop="createdAt" label="上传时间" width="150">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="docPage"
              :page-size="10"
              :total="docTotal"
              layout="prev, pager, next"
              @current-change="loadDocuments"
              small
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>分类统计</span>
              <el-button text @click="loadData">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="categories" style="width: 100%" v-loading="loading" max-height="400">
            <el-table-column prop="userName" label="用户" width="100" />
            <el-table-column prop="name" label="分类名称" min-width="150" />
            <el-table-column prop="documentCount" label="文档数" width="80" />
            <el-table-column prop="createdAt" label="创建时间" width="150">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="catPage"
              :page-size="10"
              :total="catTotal"
              layout="prev, pager, next"
              @current-change="loadCategories"
              small
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="usage-row">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>知识库使用情况</span>
          </template>
          <el-table :data="usage" style="width: 100%" v-loading="loading">
            <el-table-column prop="userName" label="用户" width="120" />
            <el-table-column prop="categoryCount" label="分类数" width="100" />
            <el-table-column prop="documentCount" label="文档数" width="100" />
            <el-table-column prop="chunkCount" label="切片数" width="100" />
            <el-table-column prop="totalSize" label="总大小" width="120">
              <template #default="{ row }">
                {{ formatSize(row.totalSize) }}
              </template>
            </el-table-column>
            <el-table-column prop="lastUploadAt" label="最后上传" width="180">
              <template #default="{ row }">
                {{ row.lastUploadAt ? formatTime(row.lastUploadAt) : '-' }}
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
import { Refresh } from '@element-plus/icons-vue'
import api from '../api'
import { ElMessage } from 'element-plus'

interface Stats {
  totalDocuments: number
  totalCategories: number
  totalChunks: number
}

const loading = ref(false)
const stats = ref<Stats>({
  totalDocuments: 0,
  totalCategories: 0,
  totalChunks: 0
})

const documents = ref([])
const docPage = ref(1)
const docTotal = ref(0)

const categories = ref([])
const catPage = ref(1)
const catTotal = ref(0)

const usage = ref([])

const loadData = () => {
  loadStats()
  loadDocuments()
  loadCategories()
  loadUsage()
}

const loadStats = async () => {
  try {
    const response = await api.get('/admin/knowledge-base/stats')
    stats.value = response
  } catch (error) {
    console.error('加载统计失败:', error)
    ElMessage.error('加载统计失败')
  }
}

const loadDocuments = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/knowledge-base/documents', {
      params: {
        page: docPage.value,
        pageSize: 10
      }
    })
    documents.value = response.data
    docTotal.value = response.total
  } catch (error) {
    console.error('加载文档失败:', error)
    ElMessage.error('加载文档失败')
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/knowledge-base/categories', {
      params: {
        page: catPage.value,
        pageSize: 10
      }
    })
    categories.value = response.data
    catTotal.value = response.total
  } catch (error) {
    console.error('加载分类失败:', error)
    ElMessage.error('加载分类失败')
  } finally {
    loading.value = false
  }
}

const loadUsage = async () => {
  try {
    const response = await api.get('/admin/knowledge-base/usage')
    usage.value = response.data
  } catch (error) {
    console.error('加载使用情况失败:', error)
    ElMessage.error('加载使用情况失败')
  }
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.kb-container {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  color: #303133;
}

.stats-row {
  margin-bottom: 20px;
}

.content-row {
  margin-bottom: 20px;
}

.usage-row {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
</style>
