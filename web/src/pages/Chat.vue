<template>
  <div v-if="isAuthenticated">
    <AppLayout @show-profile="showProfileModal = true">
    <!-- 个人资料弹窗 -->
    <ProfileModal v-model:visible="showProfileModal" @saved="onProfileSaved" />

    <div class="chat-container">
      <!-- 左侧对话列表 -->
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <button class="new-chat-btn" @click="createNewChat">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
            </svg>
            新对话
          </button>
        </div>

        <div class="chat-list">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            :class="['chat-item', { active: conv.id === currentConversationId }]"
            @click="selectConversation(conv.id)"
            @contextmenu.prevent="showContextMenu($event, conv)"
          >
            <div class="chat-item-content">
              <span class="chat-title">{{ conv.title || '新对话' }}</span>
              <span class="chat-time">{{ formatTime(conv.createdAt) }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主聊天区域 -->
      <div class="chat-main">
        <div class="messages-container" ref="messagesContainer">
          <div
            v-for="msg in currentMessages"
            :key="msg.id"
            :class="['message', msg.role]"
          >
            <div class="message-avatar">
              <div v-if="msg.role === 'user'" class="user-avatar-msg" :style="{ background: userAvatar }">
                <svg v-if="!userInfo.avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="35" r="15" fill="white" opacity="0.9"/>
                  <ellipse cx="50" cy="70" rx="25" ry="20" fill="white" opacity="0.9"/>
                </svg>
              </div>
              <div v-else class="ai-avatar">AI</div>
            </div>
            <div class="message-content">
              <div v-if="msg.imageUrl" class="message-image">
                <img :src="msg.imageUrl" alt="图片" />
              </div>
              <div v-if="msg.fileInfo" class="message-file">
                <div class="file-icon">
                  <svg v-if="msg.fileInfo.type === 'pdf'" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2zm-1 7V3.5L18.5 9H13z" fill="#ff4444"/>
                  </svg>
                  <svg v-else-if="msg.fileInfo.type === 'md' || msg.fileInfo.type === 'markdown'" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2zm-1 7V3.5L18.5 9H13z" fill="#ffd700"/>
                  </svg>
                  <svg v-else-if="msg.fileInfo.type === 'txt'" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2zm-1 7V3.5L18.5 9H13z" fill="#4CAF50"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2zm-1 7V3.5L18.5 9H13z" fill="#9E9E9E"/>
                  </svg>
                </div>
                <div class="file-details">
                  <div class="file-name">{{ msg.fileInfo.name }}</div>
                  <div class="file-meta">{{ msg.fileInfo.size }}</div>
                </div>
              </div>
              <div class="message-text">
                <span v-html="formatMessage(msg.content)"></span>
                <span v-if="msg.isStreaming" class="typing-cursor">▊</span>
              </div>
            </div>
          </div>

          <!-- 加载动画 - 只在没有流式消息时显示 -->
          <div v-if="isLoading && !currentMessages.some(m => m.isStreaming)" class="message assistant">
            <div class="message-avatar">
              <div class="ai-avatar">AI</div>
            </div>
            <div class="message-content">
              <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-container">
          <div class="input-wrapper">
            <!-- 知识库选择器 -->
            <KnowledgeSelector @change="handleKnowledgeChange" />

            <div class="input-tools">
              <input
                type="file"
                ref="imageInput"
                accept="image/*"
                style="display: none"
                @change="handleImageUpload"
              />
              <button class="tool-btn" @click="$refs.imageInput.click()" title="上传图片">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
                </svg>
              </button>

              <input
                type="file"
                ref="docInput"
                accept=".txt,.pdf,.md,.markdown,.doc,.docx,.csv,.json,.xml"
                style="display: none"
                @change="handleDocUpload"
              />
              <div class="doc-upload-dropdown">
                <button class="tool-btn" @click="toggleDocMenu" title="上传文档">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M14,8V3.5L18.5,8H14Z" fill="currentColor"/>
                  </svg>
                  <svg viewBox="0 0 24 24" width="12" height="12" class="dropdown-arrow">
                    <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                  </svg>
                </button>
                <div v-if="showDocMenu" class="dropdown-menu">
                  <div class="menu-item" @click="uploadNewDocument">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                    </svg>
                    上传新文档
                  </div>
                  <div class="menu-item" @click="selectFromKnowledgeBase">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
                    </svg>
                    从知识库选择
                  </div>
                </div>
              </div>
            </div>

            <div v-if="uploadedImage" class="upload-preview image-preview">
              <img :src="uploadedImage.preview" alt="预览" />
              <button class="remove-btn" @click="uploadedImage = null">✕</button>
            </div>

            <div v-if="uploadedDoc" class="upload-preview doc-preview">
              <div class="doc-info">
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M14,8V3.5L18.5,8H14Z" fill="#FFD700"/>
                </svg>
                <div class="doc-details">
                  <div class="doc-name">{{ uploadedDoc.name }}</div>
                  <div class="doc-size">{{ uploadedDoc.size }}</div>
                </div>
              </div>
              <button class="remove-btn" @click="uploadedDoc = null">✕</button>
            </div>

            <div class="input-box">
              <textarea
                v-model="inputMessage"
                @keydown.enter.prevent="handleEnter"
                placeholder="输入消息，支持 Shift+Enter 换行"
                rows="1"
              ></textarea>
              <button class="send-btn" @click="sendMessage" :disabled="!inputMessage.trim()">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右键菜单 -->
      <div
        v-if="contextMenu.show"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click="contextMenu.show = false"
      >
        <div class="menu-item" @click="renameConversation">重命名</div>
        <div class="menu-item danger" @click="deleteConversation">删除</div>
      </div>

      <!-- 上传文档到知识库弹窗 -->
      <div v-if="showKnowledgeBaseModal" class="modal-overlay" @click.self="showKnowledgeBaseModal = false">
        <div class="kb-modal">
          <div class="modal-header">
            <h3>选择知识库分类</h3>
            <button class="close-btn" @click="showKnowledgeBaseModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="modal-content">
            <div v-if="categories.length === 0" class="empty-categories">
              <p>暂无分类，请先在知识库页面创建分类</p>
              <button class="create-category-btn" @click="goToKnowledgeBase">
                前往知识库
              </button>
            </div>
            <div v-else class="category-list">
              <div
                v-for="category in categories"
                :key="category.id"
                class="category-item"
                :class="{ selected: selectedCategoryId === category.id }"
                @click="selectedCategoryId = category.id"
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
                </svg>
                <span>{{ category.name }}</span>
                <span class="doc-count">{{ category.documentCount || 0 }}</span>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn" @click="showKnowledgeBaseModal = false">取消</button>
            <button
              class="modal-btn primary"
              :disabled="!selectedCategoryId"
              @click="uploadToKnowledgeBase"
            >
              上传到知识库
            </button>
          </div>
        </div>
      </div>

      <!-- 从知识库选择文档弹窗 -->
      <div v-if="showDocumentSelectModal" class="modal-overlay" @click.self="showDocumentSelectModal = false">
        <div class="kb-modal">
          <div class="modal-header">
            <h3>从知识库选择文档</h3>
            <button class="close-btn" @click="showDocumentSelectModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="modal-content">
            <!-- 分类选择器 -->
            <div class="category-selector">
              <select v-model="selectedViewCategoryId" @change="loadCategoryDocuments">
                <option value="">选择分类</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }} ({{ cat.documentCount || 0 }})
                </option>
              </select>
            </div>
            <!-- 文档列表 -->
            <div v-if="categoryDocuments.length > 0" class="document-list">
              <div
                v-for="doc in categoryDocuments"
                :key="doc.id"
                class="document-item"
                :class="{ selected: selectedDocumentId === doc.id }"
                @click="selectedDocumentId = doc.id"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" fill="currentColor"/>
                </svg>
                <div class="doc-info">
                  <div class="doc-name">{{ doc.name }}</div>
                  <div class="doc-meta">{{ formatFileSize(doc.size) }} · {{ formatDate(doc.createdAt) }}</div>
                </div>
              </div>
            </div>
            <div v-else-if="selectedViewCategoryId" class="empty-documents">
              <p>该分类下暂无文档</p>
            </div>
            <div v-else class="empty-documents">
              <p>请选择一个分类查看文档</p>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn" @click="showDocumentSelectModal = false">取消</button>
            <button
              class="modal-btn primary"
              :disabled="!selectedDocumentId"
              @click="applyDocumentToChat"
            >
              应用到对话
            </button>
          </div>
        </div>
      </div>

      <!-- 用户信息弹窗 -->
      <UserProfile v-if="showUserProfile" @close="showUserProfile = false" />
    </div>
    </AppLayout>
  </div>
  <div v-else-if="shouldRedirect" class="auth-redirect">
    <p>正在跳转到登录页面...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import UserProfile from '../components/UserProfile.vue'
import ProfileModal from '../components/ProfileModal.vue'
import KnowledgeSelector from '../components/KnowledgeSelector.vue'
import api from '../api'

// 状态
const conversations = ref([])
const currentConversationId = ref(null)
const currentMessages = ref([])
const inputMessage = ref('')
const uploadedImage = ref(null)
const uploadedDoc = ref(null)
const showUserProfile = ref(false)
const showProfileModal = ref(false)
const messagesContainer = ref(null)
const isLoading = ref(false)
const isAuthenticated = ref(!!localStorage.getItem('token'))

// 文档上传相关状态
const showDocMenu = ref(false)
const showKnowledgeBaseModal = ref(false)
const showDocumentSelectModal = ref(false)
const categories = ref([])
const selectedCategoryId = ref(null)
const selectedViewCategoryId = ref(null)
const selectedDocumentId = ref(null)
const categoryDocuments = ref([])
const pendingFile = ref(null)
const selectedDocuments = ref([]) // 知识库选择器选中的文档列表

// 用户信息
const userInfo = computed(() => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : {}
})
const userAvatar = computed(() => {
  const storedInfo = localStorage.getItem('userInfo')
  if (storedInfo) {
    const info = JSON.parse(storedInfo)
    return info.avatar || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
  return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
})

const shouldRedirect = computed(() => {
  if (!isAuthenticated.value) {
    // 立即重定向到登录页
    setTimeout(() => {
      window.location.replace('/login')
    }, 0)
    return true
  }
  return false
})

// 右键菜单
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  conversation: null
})

// 方法
const createNewChat = async () => {
  try {
    const response = await api.post('/conversations')
    conversations.value.unshift(response.data)
    currentConversationId.value = response.data.id
    currentMessages.value = []
  } catch (error) {
    console.error('创建对话失败', error)
  }
}

const selectConversation = async (id: string) => {
  currentConversationId.value = id
  try {
    const response = await api.get(`/conversations/${id}/messages`)
    // 处理历史消息，提取文档信息并清理显示内容
    currentMessages.value = response.data.map(msg => {
      if (msg.role === 'user' && msg.content.includes('[文档:')) {
        // 提取文档信息
        const docMatch = msg.content.match(/\[文档: (.+?)\]/)
        if (docMatch) {
          const fileName = docMatch[1]
          // 提取原始用户输入（文档标记之前的内容）
          const originalContent = msg.content.split('\n\n[文档:')[0]

          return {
            ...msg,
            content: originalContent || `已上传文件: ${fileName}`,
            fileInfo: {
              name: fileName,
              size: '已上传',
              type: fileName.split('.').pop() || 'unknown'
            }
          }
        }
      }
      return msg
    })
    scrollToBottom()
  } catch (error) {
    console.error('加载消息失败', error)
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() && !uploadedImage.value && !uploadedDoc.value) return
  if (isLoading.value) return

  // 检查图片是否还在上传中
  if (uploadedImage.value?.uploading) {
    alert('图片正在上传中，请稍候...')
    return
  }

  let userInput = inputMessage.value
  const imageUrl = uploadedImage.value?.url
  let fileInfo = null

  // 如果有上传的文档，显示文件信息，但不读取内容（改为使用知识库检索）
  if (uploadedDoc.value) {
    fileInfo = {
      name: uploadedDoc.value.name,
      size: uploadedDoc.value.size,
      type: uploadedDoc.value.type
    }
  }

  // 添加用户消息 - 显示原始输入文字和文件图标，不显示文件内容
  currentMessages.value.push({
    id: Date.now(),
    role: 'user',
    content: inputMessage.value || (fileInfo ? `已上传文件: ${fileInfo.name}` : ''),
    imageUrl,
    fileInfo,
    createdAt: new Date()
  })

  // 清空输入
  inputMessage.value = ''
  uploadedImage.value = null
  uploadedDoc.value = null
  scrollToBottom()

  // 添加 AI 消息占位
  const assistantMessage = {
    id: Date.now() + 1,
    role: 'assistant',
    content: '',
    createdAt: new Date(),
    isStreaming: true
  }
  currentMessages.value.push(assistantMessage)
  isLoading.value = true

  try {
    const token = localStorage.getItem('token')
    const requestBody = {
      content: userInput,
      imageUrl,
      categoryId: selectedViewCategoryId.value, // 兼容旧逻辑
      documentIds: selectedDocuments.value.map(doc => doc.id) // 发送选中的文档ID数组
    }
    console.log('📤 发送请求到后端:', requestBody)

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/conversations/${currentConversationId.value}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (dataStr.trim()) {
              try {
                const data = JSON.parse(dataStr)

                if (data.type === 'user_message') {
                  // 忽略用户消息确认（已经在前端添加了）
                  console.log('收到用户消息确认')
                } else if (data.type === 'stream') {
                  // 流式更新内容
                  console.log('收到流式内容:', data.content)
                  assistantMessage.content += data.content
                  // 强制触发Vue响应式更新
                  const msgIndex = currentMessages.value.findIndex(m => m.id === assistantMessage.id)
                  if (msgIndex !== -1) {
                    currentMessages.value[msgIndex].content = assistantMessage.content
                  }
                  scrollToBottom()
                } else if (data.type === 'done') {
                  console.log('流式传输完成')
                  // 完成
                  assistantMessage.isStreaming = false
                  if (data.data) {
                    // 不要直接覆盖，保留已经流式显示的内容
                    assistantMessage.id = data.data.id
                    assistantMessage.createdAt = data.data.createdAt
                  }
                  // 更新消息状态
                  const msgIndex = currentMessages.value.findIndex(m => m.id === assistantMessage.id)
                  if (msgIndex !== -1) {
                    currentMessages.value[msgIndex].isStreaming = false
                  }

                  // 如果是新对话，更新对话列表
                  const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
                  if (currentConv && currentConv.title === '新对话') {
                    setTimeout(async () => {
                      const convResponse = await api.get('/conversations')
                      conversations.value = convResponse.data
                    }, 1000)
                  }
                } else if (data.type === 'error') {
                  assistantMessage.content = data.message || '抱歉，发生错误。'
                  assistantMessage.isStreaming = false
                }
              } catch (e) {
                console.error('解析数据错误:', e)
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('发送消息失败', error)
    assistantMessage.content = '抱歉，发送消息失败，请稍后重试。'
    assistantMessage.isStreaming = false
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const handleEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) {
    return
  }
  sendMessage()
}

const handleKnowledgeChange = (documents: any[]) => {
  selectedDocuments.value = documents
  console.log('📚 知识库选择变更 - 选中文档数:', documents.length)
  console.log('📚 文档列表:', documents.map(d => ({ id: d.id, name: d.filename })))
}

const handleImageUpload = async (e: Event) => {
  const file = e.target.files[0]
  if (!file) return

  // 限制图片大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过5MB')
    return
  }

  // 显示预览
  const reader = new FileReader()
  reader.onload = (e) => {
    uploadedImage.value = {
      preview: e.target.result,
      url: '', // 等待上传后获取
      file: file,
      uploading: true
    }
  }
  reader.readAsDataURL(file)

  // 上传到服务器
  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    // 上传成功，更新URL
    uploadedImage.value.url = response.data.url
    uploadedImage.value.uploading = false

    console.log('图片上传成功:', response.data.url)
  } catch (error) {
    console.error('图片上传失败:', error)
    alert('图片上传失败，请重试')
    uploadedImage.value = null
  }
}

// 文档上传相关方法
const toggleDocMenu = () => {
  showDocMenu.value = !showDocMenu.value
}

// 上传新文档
const uploadNewDocument = () => {
  showDocMenu.value = false

  // 先让用户选择文件
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = '.txt,.pdf,.md,.markdown,.doc,.docx,.csv,.json,.xml'
  fileInput.onchange = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    // 限制文件大小（50MB）
    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小不能超过50MB')
      return
    }

    // 保存文件到临时状态
    pendingFile.value = file

    // 加载知识库分类
    try {
      const response = await api.get('/kb/categories')
      categories.value = response.data
      showKnowledgeBaseModal.value = true
    } catch (error) {
      console.error('加载分类失败', error)
      alert('加载知识库分类失败，请重试')
    }
  }
  fileInput.click()
}

// 从知识库选择文档
const selectFromKnowledgeBase = async () => {
  showDocMenu.value = false

  try {
    // 加载分类列表
    const response = await api.get('/kb/categories')
    categories.value = response.data
    showDocumentSelectModal.value = true
  } catch (error) {
    console.error('加载分类失败', error)
    alert('加载知识库分类失败，请重试')
  }
}

// 加载分类下的文档
const loadCategoryDocuments = async () => {
  if (!selectedViewCategoryId.value) {
    categoryDocuments.value = []
    return
  }

  try {
    const response = await api.get(`/kb/categories/${selectedViewCategoryId.value}/documents`)
    categoryDocuments.value = response.data
  } catch (error) {
    console.error('加载文档失败', error)
    alert('加载文档失败，请重试')
  }
}

// 将选中的文档应用到对话
const applyDocumentToChat = async () => {
  const selectedDoc = categoryDocuments.value.find(d => d.id === selectedDocumentId.value)
  if (!selectedDoc) return

  try {
    // 获取文档内容 - 使用正确的URL格式
    const fullUrl = selectedDoc.url.startsWith('http') ? selectedDoc.url : `${window.location.origin}${selectedDoc.url}`
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const text = await response.text()

    // 创建文件对象以便 sendMessage 能读取内容
    const blob = new Blob([text], { type: selectedDoc.type || 'text/plain' })
    const file = new File([blob], selectedDoc.name, { type: selectedDoc.type || 'text/plain' })

    // 安全地获取文件类型
    let fileType = 'unknown'
    if (selectedDoc.type) {
      fileType = selectedDoc.type.split('/').pop() || 'unknown'
    } else if (selectedDoc.name) {
      fileType = selectedDoc.name.split('.').pop() || 'unknown'
    }

    // 设置为当前文档
    uploadedDoc.value = {
      name: selectedDoc.name,
      type: fileType,
      size: formatFileSize(selectedDoc.size),
      file: file
    }

    // 关闭弹窗
    showDocumentSelectModal.value = false
    selectedViewCategoryId.value = null
    selectedDocumentId.value = null
    categoryDocuments.value = []

    // 提示用户
    alert('文档已添加，请输入消息开始对话')
  } catch (error) {
    console.error('加载文档内容失败:', error)
    alert('加载文档内容失败，请重试')
  }
}

const goToKnowledgeBase = () => {
  showKnowledgeBaseModal.value = false
  // 跳转到知识库页面
  window.location.href = '/kb'
}

// 上传文档到知识库并应用到对话
const uploadToKnowledgeBase = async () => {
  if (!selectedCategoryId.value || !pendingFile.value) {
    console.error('缺少必要参数:', {
      categoryId: selectedCategoryId.value,
      file: pendingFile.value?.name
    })
    alert('请选择分类和文件')
    return
  }

  console.log('开始上传文档到知识库:', {
    fileName: pendingFile.value.name,
    fileSize: pendingFile.value.size,
    fileType: pendingFile.value.type,
    categoryId: selectedCategoryId.value
  })

  try {
    // 步骤1: 上传文件到存储服务
    console.log('步骤1: 上传文件到存储服务...')
    const formData = new FormData()
    formData.append('document', pendingFile.value)

    const uploadResponse = await api.post('/upload/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000 // 5分钟超时，支持大文件上传
    })

    console.log('文件上传成功:', uploadResponse.data)

    // 步骤2: 创建文档记录
    console.log('步骤2: 创建文档记录...')
    const docData = {
      name: uploadResponse.data.name,
      type: uploadResponse.data.type,
      url: uploadResponse.data.url,
      size: uploadResponse.data.size,
      categoryId: selectedCategoryId.value
    }

    console.log('准备创建文档记录:', docData)
    const docResponse = await api.post('/kb/documents', docData)
    console.log('文档记录创建成功:', docResponse.data)

    // 步骤3: 读取文件内容并应用到对话
    console.log('步骤3: 读取文件内容并应用到对话...')
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result as string
      console.log('文件内容读取成功，长度:', content.length)

      // 格式化文件大小显示
      const formatFileSize = (bytes) => {
        if (bytes < 1024 * 1024) {
          return (bytes / 1024).toFixed(2) + ' KB'
        } else {
          return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
        }
      }

      // 安全地获取文件类型
      let fileType = 'unknown'
      if (pendingFile.value.type) {
        fileType = pendingFile.value.type.split('/').pop() || 'unknown'
      } else if (pendingFile.value.name) {
        const ext = pendingFile.value.name.split('.').pop()
        fileType = ext || 'unknown'
      }

      // 设置为当前文档
      uploadedDoc.value = {
        name: uploadResponse.data.name,
        type: fileType,
        size: formatFileSize(pendingFile.value.size),
        file: pendingFile.value,
        content: content
      }
      console.log('文档已设置为当前文档')
    }

    reader.onerror = (error) => {
      console.error('读取文件内容失败:', error)
      alert('读取文件内容失败')
    }

    reader.readAsText(pendingFile.value)

    // 清理状态
    showKnowledgeBaseModal.value = false
    selectedCategoryId.value = null
    pendingFile.value = null

    console.log('知识库上传流程完成')
    alert('文档已上传到知识库并应用到当前对话！')
  } catch (error) {
    console.error('上传到知识库失败详细信息:', {
      error: error,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    })

    let errorMessage = '上传到知识库失败'
    if (error.response?.data?.message) {
      errorMessage += ': ' + error.response.data.message
    } else if (error.message) {
      errorMessage += ': ' + error.message
    }

    alert(errorMessage)
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const handleDocUpload = async (e: Event) => {
  const file = e.target.files[0]
  if (!file) return

  // 限制文件大小（100MB）
  if (file.size > 100 * 1024 * 1024) {
    alert('文件大小不能超过100MB')
    return
  }

  // 格式化文件大小显示
  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB'
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }
  }

  // 安全地获取文件类型
  let fileType = 'unknown'
  if (file.type) {
    fileType = file.type.split('/').pop() || 'unknown'
  } else if (file.name) {
    const ext = file.name.split('.').pop()
    fileType = ext || 'unknown'
  }

  uploadedDoc.value = {
    name: file.name,
    size: formatFileSize(file.size),
    type: fileType,
    file: file
  }
}

// 读取文件内容的辅助函数
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content)
    }
    reader.onerror = (error) => {
      reject(error)
    }
    reader.readAsText(file, 'UTF-8')
  })
}

const showContextMenu = (e: MouseEvent, conv: any) => {
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    conversation: conv
  }
}

const renameConversation = async () => {
  const newTitle = prompt('请输入新的对话标题', contextMenu.value.conversation.title)
  if (!newTitle || newTitle === contextMenu.value.conversation.title) return

  try {
    await api.put(`/conversations/${contextMenu.value.conversation.id}`, {
      title: newTitle
    })

    const conv = conversations.value.find(c => c.id === contextMenu.value.conversation.id)
    if (conv) {
      conv.title = newTitle
    }
  } catch (error) {
    console.error('重命名失败', error)
    alert('重命名失败，请重试')
  }
}

const deleteConversation = async () => {
  if (!confirm('确定删除这个对话吗？')) return

  try {
    await api.delete(`/conversations/${contextMenu.value.conversation.id}`)
    conversations.value = conversations.value.filter(c => c.id !== contextMenu.value.conversation.id)

    if (currentConversationId.value === contextMenu.value.conversation.id) {
      if (conversations.value.length > 0) {
        selectConversation(conversations.value[0].id)
      } else {
        createNewChat()
      }
    }
  } catch (error) {
    console.error('删除对话失败', error)
    alert('删除失败，请重试')
  }
}

const formatTime = (time: string) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 86400000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }
}

const formatMessage = (content: string) => {
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 个人资料保存后的回调
const onProfileSaved = () => {
  // 强制刷新用户信息
  window.location.reload()
}

// 生命周期
onMounted(async () => {
  // 检查用户是否登录
  const token = localStorage.getItem('token')
  if (!token) {
    // 如果没有登录，立即停止执行并跳转到登录页
    isAuthenticated.value = false
    setTimeout(() => {
      window.location.replace('/login')
    }, 100)
    return
  }

  isAuthenticated.value = true

  try {
    // 加载对话列表
    const response = await api.get('/conversations')
    conversations.value = response.data

    // 加载知识库分类
    try {
      const catResponse = await api.get('/kb/categories')
      categories.value = catResponse.data
      console.log('知识库分类加载成功:', categories.value.length)
    } catch (error) {
      console.error('加载知识库分类失败:', error)
    }

    if (conversations.value.length > 0) {
      selectConversation(conversations.value[0].id)
    } else {
      // 只有在用户已登录的情况下才创建新对话
      await createNewChat()
    }

    // 检查是否有待处理的文档（从知识库跳转过来）
    const pendingDocStr = localStorage.getItem('pendingDocument')
    if (pendingDocStr) {
      const pendingDoc = JSON.parse(pendingDocStr)
      localStorage.removeItem('pendingDocument')

      // 获取文档内容
      const fullUrl = pendingDoc.url.startsWith('http') ? pendingDoc.url : `${window.location.origin}${pendingDoc.url}`
      const docResponse = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (docResponse.ok) {
        const text = await docResponse.text()

        // 创建文件对象
        const blob = new Blob([text], { type: pendingDoc.type || 'text/plain' })
        const file = new File([blob], pendingDoc.name, { type: pendingDoc.type || 'text/plain' })

        // 安全地获取文件类型
        let fileType = 'unknown'
        if (pendingDoc.type) {
          fileType = pendingDoc.type.split('/').pop() || 'unknown'
        } else if (pendingDoc.name) {
          const ext = pendingDoc.name.split('.').pop()
          fileType = ext || 'unknown'
        }

        // 设置为当前文档
        uploadedDoc.value = {
          name: pendingDoc.name,
          type: fileType,
          size: formatFileSize(pendingDoc.size),
          file: file
        }

        // 提示用户
        alert(`已加载文档：${pendingDoc.name}，请输入消息开始对话`)
      }
    }
  } catch (error) {
    console.error('加载对话历史失败', error)
  }
})

document.addEventListener('click', () => {
  contextMenu.value.show = false
})
</script>

<style scoped>
.chat-container {
  display: flex;
  width: 100%;
  height: 100%;
  background: #0a0a0b;
  margin: 0;
  padding: 0;
}

/* 左侧边栏 */
.chat-sidebar {
  width: 260px;
  background: #0f0f10;
  border-right: 1px solid rgba(255, 215, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 15px;
}


.arrow-icon {
  opacity: 0.7;
}

.new-chat-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.new-chat-btn:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.2);
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.chat-list::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track {
  background: rgba(255, 215, 0, 0.05);
}

.chat-list::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.2);
  border-radius: 3px;
}

.chat-item {
  padding: 12px;
  margin-bottom: 5px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.chat-item:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.1);
}

.chat-item.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 237, 78, 0.08) 100%);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.1);
}

/* 新对话高亮 */
.chat-item.active .chat-title {
  color: #ffd700;
  font-weight: 500;
}

.chat-item:first-child:not(.has-messages) {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  border-color: rgba(255, 215, 0, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  100% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
  }
}

.chat-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-time {
  font-size: 12px;
  color: rgba(255, 215, 0, 0.4);
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0a0a0b;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  scroll-behavior: smooth;
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: rgba(255, 215, 0, 0.05);
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.2);
  border-radius: 4px;
}

.message {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar-msg {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.user-avatar-msg svg {
  width: 20px;
  height: 20px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #0a0a0b;
  font-size: 14px;
}

.message-content {
  max-width: 70%;
  padding: 15px 20px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 215, 0, 0.1);
  backdrop-filter: blur(10px);
}

.message.user .message-content {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  border-color: rgba(255, 215, 0, 0.2);
}

.message-text {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  font-size: 14px;
}

.message-image img {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  margin-bottom: 10px;
}

/* 输入区域 */
.input-container {
  border-top: 1px solid rgba(255, 215, 0, 0.1);
  background: #0f0f10;
  padding: 20px;
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
}

/* 知识库选择器 */
.kb-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
}

.kb-icon {
  color: rgba(255, 215, 0, 0.6);
  flex-shrink: 0;
}

.kb-select {
  flex: 1;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.kb-select:hover {
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(0, 0, 0, 0.4);
}

.kb-select:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.6);
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.1);
}

.kb-select option {
  background: #1a1a1d;
  color: rgba(255, 255, 255, 0.9);
  padding: 8px;
}

.input-tools {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.tool-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.2);
  color: rgba(255, 215, 0, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.tool-btn:hover {
  background: rgba(255, 215, 0, 0.2);
  transform: scale(1.05);
}

/* 文档上传下拉菜单 */
.doc-upload-dropdown {
  position: relative;
}

.doc-upload-dropdown .tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dropdown-arrow {
  margin-left: 2px;
  transition: transform 0.2s;
}

.dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: linear-gradient(145deg, #1a1a1d 0%, #151518 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  min-width: 160px;
  margin-bottom: 8px;
}

.dropdown-menu .menu-item {
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.dropdown-menu .menu-item:hover {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.dropdown-menu .menu-item:first-child {
  border-radius: 7px 7px 0 0;
}

.dropdown-menu .menu-item:last-child {
  border-radius: 0 0 7px 7px;
}

/* 知识库选择弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.kb-modal {
  background: linear-gradient(145deg, #1a1a1d 0%, #151518 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 16px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-content {
  padding: 20px 24px;
  max-height: 300px;
  overflow-y: auto;
}

.empty-categories {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 20px;
}

.create-category-btn {
  margin-top: 16px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.create-category-btn:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  transform: translateY(-1px);
}

.category-list .category-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid transparent;
}

.category-list .category-item:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.1);
}

.category-list .category-item.selected {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  border-color: rgba(255, 215, 0, 0.3);
}

.category-list .category-item svg {
  color: rgba(255, 215, 0, 0.6);
  flex-shrink: 0;
}

.category-list .category-item.selected svg {
  color: #ffd700;
}

.category-list .category-item span:first-of-type {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
}

.category-list .category-item.selected span:first-of-type {
  color: #ffd700;
}

.doc-count {
  background: rgba(255, 215, 0, 0.1);
  color: rgba(255, 215, 0, 0.7);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.category-list .category-item.selected .doc-count {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 215, 0, 0.1);
}

.modal-btn {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
}

.modal-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-btn.primary {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  color: #ffd700;
  border-color: rgba(255, 215, 0, 0.3);
}

.modal-btn.primary:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 237, 78, 0.15) 100%);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.primary:disabled:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  box-shadow: none;
  transform: none;
}

.category-selector {
  margin-bottom: 20px;
}

.category-selector select {
  width: 100%;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.category-selector select:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.4);
}

.document-list {
  max-height: 300px;
  overflow-y: auto;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.1);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.document-item:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.2);
}

.document-item.selected {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  border-color: rgba(255, 215, 0, 0.3);
}

.document-item svg {
  color: rgba(255, 215, 0, 0.6);
  flex-shrink: 0;
}

.document-item.selected svg {
  color: #ffd700;
}

.document-item .doc-info {
  flex: 1;
  min-width: 0;
}

.document-item .doc-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-item.selected .doc-name {
  color: #ffd700;
}

.document-item .doc-meta {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 4px;
}

.empty-documents {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.upload-preview {
  position: relative;
  margin-bottom: 10px;
  display: inline-block;
}

.upload-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.remove-btn {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff4444;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-box {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.input-box textarea {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  min-height: 44px;
  max-height: 120px;
}

.input-box textarea:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border: none;
  color: #0a0a0b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: #1a1a1d;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.menu-item {
  padding: 10px 20px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.menu-item:hover {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.menu-item.danger {
  color: #ff6b6b;
}

.menu-item.danger:hover {
  background: rgba(255, 107, 107, 0.1);
  color: #ff4444;
}

/* 加载动画 */
.loading-dots {
  display: flex;
  gap: 4px;
  padding: 10px 15px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffd700;
  animation: loading-bounce 1.4s infinite;
}

.loading-dots span:nth-child(1) {
  animation-delay: 0s;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.4;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* 打字光标 */
.typing-cursor {
  display: inline-block;
  color: #ffd700;
  animation: blink 1s infinite;
  font-weight: normal;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* 文档预览样式 */
.document-preview {
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.doc-icon {
  font-size: 24px;
  color: #ffd700;
}

.doc-info {
  flex: 1;
}

.doc-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.doc-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: rgba(255, 215, 0, 0.5);
}

.doc-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.doc-remove {
  background: none;
  border: none;
  color: rgba(255, 107, 107, 0.6);
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-remove:hover {
  color: #ff4444;
  transform: scale(1.1);
}

/* 消息中的文件显示 */
.message-file {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  max-width: 250px;
}

.file-icon {
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 12px;
  color: rgba(255, 215, 0, 0.6);
  margin-top: 2px;
}
.auth-redirect {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f5f5f5;
  color: #666;
  font-size: 14px;
}
</style>