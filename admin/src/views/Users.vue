<template>
  <div class="users-container">
    <h2 class="page-title">用户管理</h2>

    <el-card class="search-card">
      <el-form :inline="true">
        <el-form-item label="搜索">
          <el-input
            v-model="searchQuery"
            placeholder="输入姓名或邮箱"
            clearable
            @clear="loadUsers"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="exportUsers" :loading="exporting">
            <el-icon><Download /></el-icon>
            导出用户数据
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="users" style="width: 100%" v-loading="loading">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="conversationCount" label="对话数" width="100" />
        <el-table-column prop="sessionCount" label="会话次数" width="100" />
        <el-table-column prop="totalActiveDuration" label="活跃时长" width="120">
          <template #default="{ row }">
            {{ formatDuration(row.totalActiveDuration) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text @click="viewUserDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadUsers"
          @current-change="loadUsers"
        />
      </div>
    </el-card>

    <!-- 用户详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="用户详情"
      width="800px"
    >
      <div v-if="selectedUser" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ selectedUser.name }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ selectedUser.email }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ selectedUser.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="年龄">{{ selectedUser.age || '-' }}</el-descriptions-item>
          <el-descriptions-item label="年级">{{ selectedUser.grade || '-' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatTime(selectedUser.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <h3 style="margin-top: 20px; margin-bottom: 10px;">学习统计</h3>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="总对话数" :value="selectedUser.conversationCount || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="总消息数" :value="selectedUser.messageCount || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="知识库文档" :value="selectedUser.documentCount || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="会话次数" :value="selectedUser.sessionCount || 0" />
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card>
              <template #header>
                <span>活跃时长统计</span>
              </template>
              <div style="font-size: 32px; font-weight: bold; color: #409eff; text-align: center;">
                {{ formatDuration(selectedUser.totalActiveDuration || 0) }}
              </div>
              <div style="text-align: center; color: #909399; margin-top: 10px;">
                总学习时长
              </div>
            </el-card>
          </el-col>
        </el-row>

        <h3 style="margin-top: 20px; margin-bottom: 10px;">最近对话</h3>
        <el-table :data="selectedUser.recentConversations" style="width: 100%">
          <el-table-column prop="title" label="对话标题" />
          <el-table-column prop="messageCount" label="消息数" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Download, View } from '@element-plus/icons-vue'
import api from '../api'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  age?: number
  grade?: string
  conversationCount: number
  messageCount?: number
  documentCount?: number
  sessionCount?: number
  totalActiveDuration?: number
  createdAt: string
  recentConversations?: any[]
}

const loading = ref(false)
const exporting = ref(false)
const users = ref<User[]>([])
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const detailDialogVisible = ref(false)
const selectedUser = ref<User | null>(null)

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/users', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: searchQuery.value
      }
    })
    users.value = response.data
    total.value = response.total
  } catch (error) {
    console.error('加载用户失败:', error)
    ElMessage.error('加载用户失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadUsers()
}

const viewUserDetail = async (user: User) => {
  loading.value = true
  try {
    const detail = await api.get(`/admin/users/${user.id}`)
    selectedUser.value = detail
    detailDialogVisible.value = true
  } catch (error) {
    console.error('加载用户详情失败:', error)
    ElMessage.error('加载用户详情失败')
  } finally {
    loading.value = false
  }
}

const exportUsers = async () => {
  exporting.value = true
  try {
    const response = await api.get('/admin/users/export')
    const data = response.data

    // 转换数据为 Excel 格式
    const worksheet = XLSX.utils.json_to_sheet(data.map((user: User) => ({
      '姓名': user.name,
      '邮箱': user.email,
      '手机号': user.phone || '-',
      '年龄': user.age || '-',
      '年级': user.grade || '-',
      '对话数': user.conversationCount,
      '注册时间': formatTime(user.createdAt)
    })))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户数据')

    const fileName = `用户数据_${new Date().toLocaleDateString()}.xlsx`
    XLSX.writeFile(workbook, fileName)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

// 格式化时长（秒 -> 友好格式）
const formatDuration = (seconds: number) => {
  if (!seconds || seconds === 0) return '0分钟'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
  } else {
    return `${minutes}分钟`
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-container {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  color: #303133;
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.user-detail {
  padding: 10px;
}
</style>
