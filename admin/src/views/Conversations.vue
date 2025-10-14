<template>
  <div class="conversations-container">
    <h2 class="page-title">对话分析</h2>

    <el-card class="search-card">
      <el-form :inline="true">
        <el-form-item label="搜索">
          <el-input
            v-model="searchQuery"
            placeholder="输入用户名或对话标题"
            clearable
            @clear="loadConversations"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="exportConversations" :loading="exporting">
            <el-icon><Download /></el-icon>
            导出对话数据
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="conversations" style="width: 100%" v-loading="loading">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="userName" label="用户" width="120" />
        <el-table-column prop="title" label="对话标题" min-width="200" />
        <el-table-column prop="messageCount" label="消息数" width="100" />
        <el-table-column prop="hasInstructions" label="自定义指令" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.hasInstructions" type="success" size="small">已设置</el-tag>
            <el-tag v-else type="info" size="small">未设置</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="hasKnowledgeBase" label="知识库" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.hasKnowledgeBase" type="warning" size="small">已使用</el-tag>
            <el-tag v-else type="info" size="small">未使用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text @click="viewConversationDetail(row)">
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
          @size-change="loadConversations"
          @current-change="loadConversations"
        />
      </div>
    </el-card>

    <!-- 对话详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="对话详情"
      width="1000px"
      top="5vh"
    >
      <div v-if="selectedConversation" class="conversation-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户">{{ selectedConversation.userName }}</el-descriptions-item>
          <el-descriptions-item label="对话标题">{{ selectedConversation.title }}</el-descriptions-item>
          <el-descriptions-item label="消息数">{{ selectedConversation.messageCount }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(selectedConversation.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="自定义指令" :span="2">
            <el-tag v-if="selectedConversation.customInstructions" type="success">已设置</el-tag>
            <el-tag v-else type="info">未设置</el-tag>
            <div v-if="selectedConversation.customInstructions" style="margin-top: 10px; padding: 10px; background: #f5f7fa; border-radius: 4px;">
              {{ selectedConversation.customInstructions }}
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <h3 style="margin-top: 20px; margin-bottom: 10px;">对话消息</h3>
        <div class="messages-container">
          <div
            v-for="message in selectedConversation.messages"
            :key="message.id"
            :class="['message-item', message.role]"
          >
            <div class="message-header">
              <span class="message-role">{{ message.role === 'user' ? '用户' : 'AI助手' }}</span>
              <span class="message-time">{{ formatTime(message.createdAt) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
            <div v-if="message.imageUrl" class="message-image">
              <el-image :src="message.imageUrl" fit="contain" style="max-width: 300px;" />
            </div>
          </div>
        </div>
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

interface Conversation {
  id: string
  userName: string
  title: string
  messageCount: number
  hasInstructions: boolean
  hasKnowledgeBase: boolean
  customInstructions?: string
  createdAt: string
  messages?: any[]
}

const loading = ref(false)
const exporting = ref(false)
const conversations = ref<Conversation[]>([])
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const detailDialogVisible = ref(false)
const selectedConversation = ref<Conversation | null>(null)

const loadConversations = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/conversations', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: searchQuery.value
      }
    })
    conversations.value = response.data
    total.value = response.total
  } catch (error) {
    console.error('加载对话失败:', error)
    ElMessage.error('加载对话失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadConversations()
}

const viewConversationDetail = async (conversation: Conversation) => {
  loading.value = true
  try {
    const detail = await api.get(`/admin/conversations/${conversation.id}`)
    selectedConversation.value = detail
    detailDialogVisible.value = true
  } catch (error) {
    console.error('加载对话详情失败:', error)
    ElMessage.error('加载对话详情失败')
  } finally {
    loading.value = false
  }
}

const exportConversations = async () => {
  exporting.value = true
  try {
    const response = await api.get('/admin/conversations/export')
    const data = response.data

    const worksheet = XLSX.utils.json_to_sheet(data.map((conv: Conversation) => ({
      '用户': conv.userName,
      '对话标题': conv.title,
      '消息数': conv.messageCount,
      '自定义指令': conv.hasInstructions ? '已设置' : '未设置',
      '知识库': conv.hasKnowledgeBase ? '已使用' : '未使用',
      '创建时间': formatTime(conv.createdAt)
    })))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '对话数据')

    const fileName = `对话数据_${new Date().toLocaleDateString()}.xlsx`
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

onMounted(() => {
  loadConversations()
})
</script>

<style scoped>
.conversations-container {
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

.conversation-detail {
  padding: 10px;
}

.messages-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.message-item {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
  background: white;
}

.message-item.user {
  background: #e6f7ff;
}

.message-item.assistant {
  background: #f0f9ff;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

.message-role {
  font-weight: bold;
  color: #303133;
}

.message-content {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-image {
  margin-top: 10px;
}
</style>
