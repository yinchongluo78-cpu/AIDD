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
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text @click="viewUserDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button type="warning" text @click="viewSystemPrompt(row)">
              <el-icon><EditPen /></el-icon>
              AI提示词
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

    <!-- AI提示词编辑弹窗 -->
    <el-dialog
      v-model="promptDialogVisible"
      title="AI教师系统提示词管理"
      width="90%"
      top="5vh"
    >
      <div v-if="promptData" class="prompt-editor">
        <el-alert
          :title="`学生: ${promptData.userName} (${promptData.userEmail})`"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        />

        <el-tabs v-model="activePromptTab" type="border-card">
          <el-tab-pane label="学生画像" name="assessment">
            <el-card class="prompt-card">
              <template #header>
                <div class="card-header">
                  <span>测评数据汇总</span>
                  <el-tag v-if="!promptData.assessmentContext || promptData.assessmentContext.includes('尚未完成')" type="warning">
                    暂无测评数据
                  </el-tag>
                  <el-tag v-else type="success">已完成测评</el-tag>
                </div>
              </template>
              <el-input
                type="textarea"
                v-model="promptData.assessmentContext"
                :rows="12"
                readonly
                placeholder="该学生尚未完成测评"
              />
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="自动生成提示词" name="auto">
            <el-card class="prompt-card">
              <template #header>
                <div class="card-header">
                  <span>基于测评数据自动生成的系统提示词</span>
                  <el-tag type="info">只读</el-tag>
                </div>
              </template>
              <el-input
                type="textarea"
                v-model="promptData.autoGeneratedPrompt"
                :rows="20"
                readonly
              />
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="自定义提示词" name="custom">
            <el-card class="prompt-card">
              <template #header>
                <div class="card-header">
                  <span>管理员自定义提示词（优先级最高）</span>
                  <el-tag v-if="promptData.customPrompt" type="warning">已启用自定义</el-tag>
                  <el-tag v-else type="info">未设置</el-tag>
                </div>
              </template>
              <el-alert
                title="说明"
                type="warning"
                :closable="false"
                style="margin-bottom: 15px;"
              >
                <template #default>
                  <p>• 如果设置了自定义提示词，将完全替代自动生成的提示词</p>
                  <p>• 清空自定义提示词后，将恢复使用自动生成的提示词</p>
                  <p>• 建议在自动生成提示词的基础上进行微调</p>
                </template>
              </el-alert>
              <el-input
                type="textarea"
                v-model="editingCustomPrompt"
                :rows="20"
                placeholder="输入自定义的系统提示词，留空则使用自动生成的提示词"
              />
              <div style="margin-top: 15px; display: flex; gap: 10px;">
                <el-button type="primary" @click="saveCustomPrompt" :loading="saving">
                  保存自定义提示词
                </el-button>
                <el-button @click="editingCustomPrompt = promptData.autoGeneratedPrompt">
                  复制自动生成的提示词
                </el-button>
                <el-button type="danger" @click="clearCustomPrompt" v-if="promptData.customPrompt">
                  清空自定义（恢复自动生成）
                </el-button>
              </div>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="当前实际使用" name="active">
            <el-card class="prompt-card">
              <template #header>
                <div class="card-header">
                  <span>当前在对话中实际使用的提示词</span>
                  <el-tag v-if="promptData.customPrompt" type="warning">使用自定义</el-tag>
                  <el-tag v-else type="success">使用自动生成</el-tag>
                </div>
              </template>
              <el-input
                type="textarea"
                v-model="promptData.activePrompt"
                :rows="20"
                readonly
              />
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Download, View, EditPen } from '@element-plus/icons-vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
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

interface SystemPromptData {
  userId: string
  userName: string
  userEmail: string
  assessmentContext: string
  autoGeneratedPrompt: string
  customPrompt: string | null
  activePrompt: string
}

const loading = ref(false)
const exporting = ref(false)
const saving = ref(false)
const users = ref<User[]>([])
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const detailDialogVisible = ref(false)
const selectedUser = ref<User | null>(null)

// 系统提示词相关
const promptDialogVisible = ref(false)
const promptData = ref<SystemPromptData | null>(null)
const activePromptTab = ref('assessment')
const editingCustomPrompt = ref('')

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

// 查看系统提示词
const viewSystemPrompt = async (user: User) => {
  loading.value = true
  try {
    const response = await api.get(`/admin/users/${user.id}/system-prompt`)
    promptData.value = response
    editingCustomPrompt.value = response.customPrompt || ''
    activePromptTab.value = 'assessment'
    promptDialogVisible.value = true
  } catch (error) {
    console.error('加载系统提示词失败:', error)
    ElMessage.error('加载系统提示词失败')
  } finally {
    loading.value = false
  }
}

// 保存自定义提示词
const saveCustomPrompt = async () => {
  if (!promptData.value) return

  try {
    await ElMessageBox.confirm(
      '保存后，该学生的所有对话将使用新的自定义提示词。是否确认保存？',
      '确认保存',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    saving.value = true
    await api.put(`/admin/users/${promptData.value.userId}/system-prompt`, {
      customPrompt: editingCustomPrompt.value.trim() || null
    })

    // 更新本地数据
    promptData.value.customPrompt = editingCustomPrompt.value.trim() || null
    promptData.value.activePrompt = editingCustomPrompt.value.trim() || promptData.value.autoGeneratedPrompt

    ElMessage.success('保存成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('保存自定义提示词失败:', error)
      ElMessage.error('保存失败')
    }
  } finally {
    saving.value = false
  }
}

// 清空自定义提示词
const clearCustomPrompt = async () => {
  if (!promptData.value) return

  try {
    await ElMessageBox.confirm(
      '清空后，将恢复使用基于测评数据自动生成的提示词。是否确认？',
      '确认清空',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    saving.value = true
    await api.put(`/admin/users/${promptData.value.userId}/system-prompt`, {
      customPrompt: null
    })

    // 更新本地数据
    promptData.value.customPrompt = null
    promptData.value.activePrompt = promptData.value.autoGeneratedPrompt
    editingCustomPrompt.value = ''

    ElMessage.success('已清空自定义提示词，恢复使用自动生成')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('清空自定义提示词失败:', error)
      ElMessage.error('清空失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-container {
  padding: 30px;
}

.page-title {
  margin-bottom: 30px;
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.search-card {
  margin-bottom: 24px;
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.search-card :deep(.el-card__body) {
  padding: 24px;
}

.table-card {
  margin-top: 20px;
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.table-card :deep(.el-card__body) {
  padding: 24px;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.user-detail {
  padding: 10px;
}

/* 优化按钮样式 */
:deep(.el-button--primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button--primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

:deep(.el-button--text) {
  color: #667eea;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button--text:hover) {
  color: #764ba2;
  background: rgba(102, 126, 234, 0.1);
}

/* 优化表格样式 */
:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%);
  font-weight: 600;
  color: #303133;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

:deep(.el-table td) {
  color: #606266;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

:deep(.el-table tr:hover > td) {
  background: rgba(102, 126, 234, 0.05) !important;
}

/* 优化输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.15);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.25);
}

/* 系统提示词编辑器样式 */
.prompt-editor {
  max-height: 75vh;
  overflow-y: auto;
}

.prompt-card {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prompt-card :deep(.el-card__body) {
  padding: 20px;
}

.prompt-card :deep(textarea) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  border-radius: 8px;
}

.el-alert :deep(p) {
  margin: 5px 0;
  font-size: 13px;
}

/* 优化对话框样式 */
:deep(.el-dialog) {
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%);
  border-radius: 16px 16px 0 0;
  padding: 24px;
}

:deep(.el-dialog__title) {
  font-weight: 600;
  color: #303133;
  font-size: 18px;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

/* 优化统计卡片 */
:deep(.el-statistic) {
  text-align: center;
}

:deep(.el-statistic__head) {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
  font-weight: 500;
}

:deep(.el-statistic__content) {
  font-size: 28px;
  font-weight: 700;
  color: #667eea;
}

/* 优化 Tabs */
:deep(.el-tabs__item) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-tabs__item.is-active) {
  color: #667eea;
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  height: 3px;
}

/* 优化描述列表 */
:deep(.el-descriptions) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  color: #303133;
}

:deep(.el-descriptions__content) {
  color: #606266;
}
</style>
