<template>
  <div v-if="isAuthenticated">
    <AppLayout @show-profile="showUserProfile = true">
    <div class="kb-container">
      <!-- 左侧分类管理 -->
      <aside class="kb-sidebar">
        <div class="sidebar-header">
          <h3 class="sidebar-title">知识库分类</h3>
          <button class="new-category-btn" @click="showAddCategory = true">
            <svg class="icon" viewBox="0 0 24 24" width="16" height="16">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
            </svg>
            新建分类
          </button>
        </div>

        <div class="category-list">
          <div
            v-for="category in categories"
            :key="category.id"
            :class="['category-item', { active: selectedCategoryId === category.id }]"
            @click="selectCategory(category.id)"
            @contextmenu.prevent="showCategoryMenu($event, category)"
          >
            <svg class="category-icon" viewBox="0 0 24 24" width="18" height="18">
              <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
            </svg>
            <span class="category-name">{{ category.name }}</span>
            <span class="doc-count">{{ category.documentCount || 0 }}</span>
          </div>
        </div>
      </aside>

      <!-- 主内容区域 -->
      <div class="kb-main">
        <div class="content-header">
          <h2 class="content-title">{{ currentCategory?.name || '请选择分类' }}</h2>
          <div class="header-actions" v-if="selectedCategoryId" style="display: flex; align-items: center; gap: 0;">
            <!-- PDF处理速度提示图标 -->
            <div class="upload-tip-wrapper">
              <div class="upload-tip-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
              </div>
              <div class="upload-tip-popup">
                <div class="tip-popup-title">⚠️ 重要提示</div>
                <div class="tip-popup-content">
                  <div class="tip-highlight">只支持文字版PDF</div>
                  <div class="tip-comparison">· 扫描版PDF暂不支持</div>
                  <div class="tip-suggestion">请先使用OCR软件识别后再上传</div>
                </div>
              </div>
            </div>
            <button class="upload-btn" @click="$refs.fileInput.click()">
              <svg class="icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
              </svg>
              上传文档
            </button>
            <input
              ref="fileInput"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.markdown"
              style="display: none"
              @change="handleFileUpload"
            />
          </div>
        </div>

        <!-- 文档网格 -->
        <div class="document-grid" v-if="selectedCategoryId && documents.length > 0">
          <div
            v-for="doc in documents"
            :key="doc.id"
            class="document-card"
            @click="viewDocument(doc)"
            @contextmenu.prevent="showDocMenu($event, doc)"
          >
            <div class="doc-icon">
              <svg v-if="doc.fileExt === 'pdf'" viewBox="0 0 24 24" width="48" height="48">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" fill="currentColor"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="48" height="48">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" fill="currentColor"/>
              </svg>
            </div>
            <div class="doc-info">
              <p class="doc-name">{{ doc.filename || doc.name }}</p>
              <p class="doc-meta">
                {{ formatFileSize(doc.fileSize || doc.size) }} · {{ formatDate(doc.createdAt) }}
              </p>
              <!-- 🔥 新增：OCR处理进度显示 -->
              <div v-if="doc.status === 'processing' && documentProgresses.get(doc.id)" class="doc-progress">
                <div class="progress-text">
                  已完成 {{ documentProgresses.get(doc.id)?.current || 0 }}/{{ documentProgresses.get(doc.id)?.total || 0 }} 页
                  ({{ documentProgresses.get(doc.id)?.percentage || 0 }}%)
                </div>
                <div class="progress-bar-mini">
                  <div
                    class="progress-fill-mini"
                    :style="{ width: (documentProgresses.get(doc.id)?.percentage || 0) + '%' }"
                  ></div>
                </div>
              </div>
              <div class="doc-status" :class="doc.status">
                {{ getStatusText(doc.status) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="selectedCategoryId" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" width="64" height="64">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" fill="currentColor"/>
          </svg>
          <p>暂无文档</p>
          <button class="upload-empty-btn" @click="$refs.fileInput.click()">
            上传第一个文档
          </button>
        </div>

        <div v-else class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" width="64" height="64">
            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
          </svg>
          <p>请先选择或创建一个分类</p>
        </div>
      </div>

      <!-- 新建分类弹窗 -->
      <div v-if="showAddCategory" class="modal-overlay" @click.self="showAddCategory = false">
        <div class="modal">
          <h3 class="modal-title">新建分类</h3>
          <input
            v-model="newCategoryName"
            placeholder="请输入分类名称"
            class="modal-input"
            @keyup.enter="addCategory"
          />
          <div class="modal-actions">
            <button class="modal-btn" @click="showAddCategory = false">取消</button>
            <button class="modal-btn primary" @click="addCategory">创建</button>
          </div>
        </div>
      </div>

      <!-- 分类右键菜单 -->
      <div
        v-if="categoryMenu.show"
        class="context-menu"
        :style="{ left: categoryMenu.x + 'px', top: categoryMenu.y + 'px' }"
        @click="categoryMenu.show = false"
      >
        <div class="menu-item" @click="renameCategory">重命名</div>
        <div class="menu-item danger" @click="deleteCategory">删除分类</div>
      </div>

      <!-- 文档右键菜单 -->
      <div
        v-if="docMenu.show"
        class="context-menu"
        :style="{ left: docMenu.x + 'px', top: docMenu.y + 'px' }"
        @click="docMenu.show = false"
      >
        <div class="menu-item" @click="startChatWithDocument">
          <svg viewBox="0 0 24 24" width="16" height="16" style="margin-right: 8px;">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          开始对话
        </div>
        <div class="menu-item" @click="downloadDocument">下载</div>
        <div class="menu-item danger" @click="deleteDocument">删除文档</div>
      </div>

      <!-- 上传进度 -->
      <div v-if="uploadProgress.show" class="upload-progress">
        <div class="progress-header">
          <span>上传中...</span>
          <span>{{ uploadProgress.percent }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: uploadProgress.percent + '%' }"></div>
        </div>
        <p class="progress-file">{{ uploadProgress.filename }}</p>
      </div>

      <!-- 消息提示 -->
      <div v-if="message.show" :class="['message-toast', message.type]">
        <div class="message-content">
          <svg v-if="message.type === 'success'" class="message-icon" width="20" height="20" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
          </svg>
          <svg v-if="message.type === 'error'" class="message-icon" width="20" height="20" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
          </svg>
          <span>{{ message.text }}</span>
        </div>
      </div>

      <!-- 文档预览弹窗 -->
      <div v-if="documentPreview.show" class="modal-overlay" @click.self="closePreview">
        <div class="preview-modal">
          <div class="preview-header">
            <div class="preview-title">
              <svg class="preview-icon" viewBox="0 0 24 24" width="20" height="20">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" fill="currentColor"/>
              </svg>
              <span>{{ documentPreview.document?.name }}</span>
            </div>
            <div class="preview-actions">
              <button class="preview-btn" @click="downloadDocument">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="M12 16l-5-5h3V4h4v7h3l-5 5z M19 18v2H5v-2h14z" fill="currentColor"/>
                </svg>
                下载
              </button>
              <button class="preview-btn close-btn" @click="closePreview">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                </svg>
                关闭
              </button>
            </div>
          </div>
          <div class="preview-content">
            <div v-if="documentPreview.document?.type === 'application/pdf'" class="pdf-preview">
              <iframe
                :src="documentPreview.document?.url"
                class="pdf-viewer"
                frameborder="0">
              </iframe>
            </div>
            <div v-else-if="documentPreview.document?.type === 'text/plain'" class="text-preview">
              <div class="text-content">文本文件预览功能开发中...</div>
            </div>
            <div v-else class="unsupported-preview">
              <svg class="unsupported-icon" viewBox="0 0 24 24" width="64" height="64">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" fill="currentColor"/>
              </svg>
              <p>该文件类型暂不支持预览</p>
              <p class="file-info">
                {{ documentPreview.document?.name }}<br>
                {{ formatFileSize(documentPreview.document?.size) }} · {{ documentPreview.document?.type }}
              </p>
              <button class="download-btn" @click="downloadDocument">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M12 16l-5-5h3V4h4v7h3l-5 5z M19 18v2H5v-2h14z" fill="currentColor"/>
                </svg>
                下载文件
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 用户信息弹窗 -->
      <ProfileModal
        v-model:visible="showUserProfile"
        @saved="handleProfileSaved"
      />

      <!-- 新手引导组件 -->
      <TutorialGuide
        :is-active="isActive"
        :current-step="currentStep"
        :current-steps="currentSteps"
        @next-step="nextStep"
        @prev-step="prevStep"
        @skip-tutorial="skipTutorial"
        @complete-tutorial="completeTutorial"
      />
    </div>
    </AppLayout>
  </div>
  <div v-else-if="shouldRedirect" class="auth-redirect">
    <p>正在跳转到登录页面...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import ProfileModal from '../components/ProfileModal.vue'
import TutorialGuide from '../components/TutorialGuide.vue'
import api from '../api'
import { useTutorial } from '../composables/useTutorial'

// Tutorial
const {
  isActive,
  currentStep,
  currentSteps,
  startKbTutorial,
  nextStep,
  prevStep,
  skipTutorial,
  completeTutorial
} = useTutorial()

// 🔥 新增：PDF页数检查函数（使用pdf-parse库）
const checkPdfPageCount = async (file: File): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 动态导入 pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist')

      // 配置 worker - 使用npm包自带的worker文件
      // 这样可以避免CDN加载失败的问题
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      resolve(pdf.numPages)
    } catch (error) {
      console.error('PDF页数检查失败:', error)
      reject(error)
    }
  })
}

// 🔥 新增：文档处理进度状态
interface DocumentProgress {
  id: string
  filename: string
  status: string
  current: number
  total: number
  percentage: number
}

const documentProgresses = ref<Map<string, DocumentProgress>>(new Map())
const progressCheckInterval = ref<number | null>(null)

// 状态
const categories = ref([])
const selectedCategoryId = ref(null)
const documents = ref([])
const showAddCategory = ref(false)
const newCategoryName = ref('')
const showUserProfile = ref(false)
const isAuthenticated = ref(!!localStorage.getItem('token'))
const statusCheckInterval = ref<number | null>(null)

// 文档预览
const documentPreview = ref({
  show: false,
  document: null
})

// 上传进度
const uploadProgress = ref({
  show: false,
  percent: 0,
  filename: ''
})

// 消息提示
const message = ref({
  show: false,
  type: 'success', // success, error, warning, info
  text: ''
})

const showMessage = (type: string, text: string) => {
  message.value = { show: true, type, text }
  setTimeout(() => {
    message.value.show = false
  }, 3000)
}

// 当前选中的分类
const currentCategory = computed(() => {
  return categories.value.find(c => c.id === selectedCategoryId.value)
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
const categoryMenu = ref({
  show: false,
  x: 0,
  y: 0,
  category: null
})

const docMenu = ref({
  show: false,
  x: 0,
  y: 0,
  document: null
})

// 方法
const loadCategories = async () => {
  try {
    const response = await api.get('/api/kb/categories')
    categories.value = response.data

    // 自动选择第一个分类
    if (categories.value.length > 0 && !selectedCategoryId.value) {
      selectCategory(categories.value[0].id)
    }
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

const selectCategory = async (categoryId: string) => {
  selectedCategoryId.value = categoryId
  try {
    const response = await api.get(`/api/kb/categories/${categoryId}/documents`)
    documents.value = response.data

    // 启动状态检查，如果有pending状态的文档
    checkAndStartStatusPolling()
  } catch (error) {
    console.error('加载文档失败', error)
  }
}

// 🔥 修改：检查是否有pending或processing状态的文档，如果有则开始轮询
const checkAndStartStatusPolling = () => {
  const hasPendingDocs = documents.value.some(doc => doc.status === 'pending' || doc.status === 'processing')

  if (hasPendingDocs && !statusCheckInterval.value) {
    // 每3秒检查一次（加快刷新频率以获得更流畅的进度更新）
    statusCheckInterval.value = window.setInterval(refreshDocumentStatus, 3000)
    console.log('开始轮询文档状态（有pending/processing文档）')

    // 立即查询一次进度
    checkProcessingDocumentsProgress()
  } else if (!hasPendingDocs && statusCheckInterval.value) {
    // 如果没有pending/processing文档了，停止轮询
    window.clearInterval(statusCheckInterval.value)
    statusCheckInterval.value = null
    console.log('停止轮询文档状态（无pending/processing文档）')

    // 清空进度信息
    documentProgresses.value.clear()
  }
}

// 🔥 新增：查询processing状态文档的处理进度
const checkProcessingDocumentsProgress = async () => {
  const processingDocs = documents.value.filter(doc => doc.status === 'processing')

  if (processingDocs.length === 0) {
    return
  }

  // 并行查询所有processing文档的进度
  const progressPromises = processingDocs.map(async (doc) => {
    try {
      const progress = await api.get(`/api/kb/documents/${doc.id}/progress`)
      documentProgresses.value.set(doc.id, progress.data)

      console.log(`文档"${doc.filename}"处理进度: ${progress.data.current}/${progress.data.total} (${progress.data.percentage}%)`)
    } catch (error) {
      console.error(`查询文档"${doc.filename}"进度失败:`, error)
    }
  })

  await Promise.all(progressPromises)
}

// 刷新当前分类的文档状态
const refreshDocumentStatus = async () => {
  if (!selectedCategoryId.value) return

  try {
    const response = await api.get(`/api/kb/categories/${selectedCategoryId.value}/documents`)
    const newDocs = response.data

    // 只更新状态发生变化的文档
    let hasChanges = false
    documents.value = documents.value.map(doc => {
      const newDoc = newDocs.find(d => d.id === doc.id)
      if (newDoc && newDoc.status !== doc.status) {
        hasChanges = true
        console.log(`文档"${doc.filename}"状态更新: ${doc.status} -> ${newDoc.status}`)

        // 如果状态变为ready，显示成功消息并清除进度
        if (newDoc.status === 'ready' && (doc.status === 'pending' || doc.status === 'processing')) {
          showMessage('success', `文档"${doc.filename}"解析完成！`)
          documentProgresses.value.delete(doc.id)
        }

        // 如果状态变为failed，显示错误消息并清除进度
        if (newDoc.status === 'failed') {
          showMessage('error', `文档"${doc.filename}"解析失败`)
          documentProgresses.value.delete(doc.id)
        }

        return newDoc
      }
      return doc
    })

    // 🔥 新增：刷新processing文档的进度
    await checkProcessingDocumentsProgress()

    // 检查是否还有pending/processing的文档
    if (hasChanges) {
      checkAndStartStatusPolling()
    }
  } catch (error) {
    console.error('刷新文档状态失败', error)
  }
}

const addCategory = async () => {
  if (!newCategoryName.value.trim()) return

  try {
    const response = await api.post('/api/kb/categories', {
      name: newCategoryName.value
    })
    categories.value.push(response.data)
    newCategoryName.value = ''
    showAddCategory.value = false
    selectCategory(response.data.id)
  } catch (error) {
    console.error('创建分类失败', error)
  }
}

const handleFileUpload = async (e: Event) => {
  const files = Array.from(e.target.files)

  for (const file of files) {
    // 检查文件大小 (100MB限制)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      showMessage('error', `文件"${file.name}"超过100MB限制`)
      continue
    }

    // 🔥 新增：检查PDF页数（扫描版PDF限制200页）
    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pageCount = await checkPdfPageCount(file)
        console.log(`PDF "${file.name}" 页数: ${pageCount}`)

        if (pageCount > 200) {
          showMessage('error', `PDF文档"${file.name}"共${pageCount}页，超过扫描版PDF处理限制（200页）。请上传文本格式的PDF，或将文档拆分为200页以内的小文件。`)
          continue
        }
      } catch (error) {
        console.error('检查PDF页数失败:', error)
        // 页数检查失败不阻止上传，继续正常流程
      }
    }

    uploadProgress.value = {
      show: true,
      percent: 0,
      filename: file.name
    }

    try {
      // 步骤1: 上传文件到存储服务 (真实进度)
      const formData = new FormData()
      formData.append('document', file)

      const uploadResponse = await api.post('/api/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000, // 5分钟超时
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            // 上传占70%进度
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 70)
            uploadProgress.value.percent = percent
          }
        }
      })

      uploadProgress.value.percent = 75

      // 步骤2: 创建文档记录
      const docData = {
        name: uploadResponse.data.name,
        type: uploadResponse.data.type,
        url: uploadResponse.data.url,
        size: uploadResponse.data.size,
        categoryId: selectedCategoryId.value
      }

      uploadProgress.value.percent = 80
      uploadProgress.value.filename = `解析文档: ${file.name}`

      const docResponse = await api.post('/api/kb/documents', docData)

      uploadProgress.value.percent = 100

      // 添加到文档列表
      documents.value.unshift(docResponse.data)

      setTimeout(() => {
        uploadProgress.value.show = false
      }, 1000)

      // 显示成功消息
      showMessage('success', `文档"${docResponse.data.name}"上传成功！文档正在后台解析...`)

      // 启动状态轮询检查
      checkAndStartStatusPolling()
    } catch (error) {
      console.error('上传失败:', error)
      uploadProgress.value.show = false

      // 显示错误消息
      showMessage('error', '上传失败，请重试')
    }
  }

  // 清空文件选择
  e.target.value = ''
}

const viewDocument = (doc: any) => {
  documentPreview.value = {
    show: true,
    document: doc
  }
}

const closePreview = () => {
  documentPreview.value.show = false
}

const showCategoryMenu = (e: MouseEvent, category: any) => {
  categoryMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    category
  }
}

const showDocMenu = (e: MouseEvent, doc: any) => {
  docMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    document: doc
  }
}

const renameCategory = async () => {
  const newName = prompt('请输入新名称', categoryMenu.value.category.name)
  if (newName && newName !== categoryMenu.value.category.name) {
    try {
      await api.put(`/api/kb/categories/${categoryMenu.value.category.id}`, {
        name: newName
      })
      categoryMenu.value.category.name = newName
    } catch (error) {
      console.error('重命名失败', error)
    }
  }
}

const deleteCategory = async () => {
  if (!confirm('确定删除这个分类吗？分类下的所有文档也会被删除。')) return

  try {
    await api.delete(`/api/kb/categories/${categoryMenu.value.category.id}`)
    categories.value = categories.value.filter(c => c.id !== categoryMenu.value.category.id)

    if (selectedCategoryId.value === categoryMenu.value.category.id) {
      selectedCategoryId.value = null
      documents.value = []
    }
  } catch (error) {
    console.error('删除分类失败', error)
  }
}

const downloadDocument = async () => {
  const doc = documentPreview.value.document || docMenu.value.document
  if (!doc) return

  try {
    // 创建下载链接
    const link = document.createElement('a')
    link.href = doc.url
    link.download = doc.name
    link.style.display = 'none'

    // 添加到文档并触发点击
    document.body.appendChild(link)
    link.click()

    // 清理DOM
    document.body.removeChild(link)

    showMessage('success', '文档下载已开始')
  } catch (error) {
    console.error('下载文档失败:', error)
    showMessage('error', '下载失败，请重试')
  }
}

const deleteDocument = async () => {
  if (!confirm('确定删除这个文档吗？')) return

  try {
    await api.delete(`/api/kb/documents/${docMenu.value.document.id}`)
    documents.value = documents.value.filter(d => d.id !== docMenu.value.document.id)
  } catch (error) {
    console.error('删除文档失败', error)
  }
}

// 使用文档开始对话
const startChatWithDocument = () => {
  if (!docMenu.value.document) return

  // 将文档信息存储到 localStorage
  localStorage.setItem('pendingDocument', JSON.stringify({
    id: docMenu.value.document.id,
    name: docMenu.value.document.name,
    url: docMenu.value.document.url,
    size: docMenu.value.document.size,
    type: docMenu.value.document.type
  }))

  // 跳转到对话页面
  window.location.href = '/chat'

  docMenu.value.show = false
}

// 处理个人资料保存
const handleProfileSaved = () => {
  console.log('个人资料已保存')
}

// 工具函数
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const getStatusText = (status: string) => {
  const texts = {
    pending: '解析中',
    uploading: '上传中',
    processing: '处理中',
    parsed: '就绪',
    ready: '就绪',
    failed: '失败',
    error: '错误'
  }
  return texts[status] || status
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

  // 先加载分类数据
  await loadCategories()

  // 检查是否从对话页引导跳转过来
  const fromChatTutorial = localStorage.getItem('tutorial_from_chat')
  if (fromChatTutorial === 'true') {
    // 清除标记
    localStorage.removeItem('tutorial_from_chat')
    // 等待 DOM 渲染完成后启动知识库引导
    await nextTick()
    setTimeout(() => {
      console.log('🎯 从对话页跳转，启动知识库引导')
      startKbTutorial()
    }, 500)
  }
})

// 清理定时器
onUnmounted(() => {
  if (statusCheckInterval.value) {
    window.clearInterval(statusCheckInterval.value)
    statusCheckInterval.value = null
    console.log('组件卸载，清理状态轮询定时器')
  }
})

// 点击其他地方关闭菜单
document.addEventListener('click', () => {
  categoryMenu.value.show = false
  docMenu.value.show = false
})
</script>

<style scoped>
.kb-container {
  display: flex;
  width: 100%;
  height: 100%;
  background: #0a0a0b;
  gap: 1px;
  margin: 0;
  padding: 0;
}

/* 左侧分类管理 */
.kb-sidebar {
  width: 280px;
  background: linear-gradient(180deg, #151518 0%, #0f0f11 100%);
  border-right: 1px solid rgba(255, 215, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.sidebar-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.new-category-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.new-category-btn:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
}

.new-category-btn .icon {
  flex-shrink: 0;
}

.category-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.category-list::-webkit-scrollbar {
  width: 8px;
}

.category-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

.category-list::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.2);
  border-radius: 4px;
}

.category-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 215, 0, 0.3);
}

.category-item {
  padding: 14px;
  margin-bottom: 8px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.category-item:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.1);
  transform: translateX(2px);
}

.category-item.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.1);
}

.category-icon {
  color: rgba(255, 215, 0, 0.6);
  flex-shrink: 0;
}

.category-item.active .category-icon {
  color: #ffd700;
}

.category-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-item:hover .category-name {
  color: rgba(255, 255, 255, 0.9);
}

.category-item.active .category-name {
  color: #ffd700;
}

.doc-count {
  background: rgba(255, 215, 0, 0.1);
  color: rgba(255, 215, 0, 0.7);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.category-item.active .doc-count {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

/* 主内容区域 */
.kb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 32px;
  background: #0a0a0b;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.content-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.upload-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
}

.upload-btn:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
}

/* 文档网格 */
.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  overflow-y: auto;
  padding: 4px;
}

.document-grid::-webkit-scrollbar {
  width: 8px;
}

.document-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

.document-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.2);
  border-radius: 4px;
}

.document-card {
  background: linear-gradient(145deg, #151518 0%, #0f0f11 100%);
  border: 1px solid rgba(255, 215, 0, 0.1);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.document-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.document-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.3);
}

.document-card:hover::before {
  opacity: 1;
}

.doc-icon {
  text-align: center;
  margin-bottom: 16px;
  color: rgba(255, 215, 0, 0.6);
  transition: color 0.3s;
}

.document-card:hover .doc-icon {
  color: #ffd700;
}

.doc-info {
  text-align: center;
}

.doc-name {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

/* 🔥 新增：上传提示悬停弹窗样式 */
.upload-tip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-right: 12px;
}

.upload-tip-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 237, 78, 0.06) 100%);
  border: 1px solid rgba(255, 215, 0, 0.25);
  color: rgba(255, 215, 0, 0.9);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-tip-icon:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  border-color: rgba(255, 215, 0, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
}

.upload-tip-icon svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.upload-tip-popup {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 280px;
  background: linear-gradient(135deg, rgba(20, 20, 22, 0.98) 0%, rgba(15, 15, 17, 0.98) 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 215, 0, 0.1);
  z-index: 1000;
  pointer-events: none;
  backdrop-filter: blur(10px);
}

/* 添加小三角指示器 */
.upload-tip-popup::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 12px;
  width: 12px;
  height: 12px;
  background: rgba(20, 20, 22, 0.98);
  border-left: 1px solid rgba(255, 215, 0, 0.3);
  border-top: 1px solid rgba(255, 215, 0, 0.3);
  transform: rotate(45deg);
}

.upload-tip-wrapper:hover .upload-tip-popup {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}

.tip-popup-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
  padding-bottom: 8px;
}

.tip-popup-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-highlight {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
  padding: 8px 10px;
  border-radius: 6px;
  border-left: 3px solid #22c55e;
}

.tip-comparison {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  padding-left: 12px;
  line-height: 1.6;
}

.tip-suggestion {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(59, 130, 246, 0.1);
  padding: 8px 10px;
  border-radius: 6px;
  border-left: 3px solid rgba(59, 130, 246, 0.5);
  line-height: 1.5;
}

.doc-progress {
  margin: 0 0 12px 0;
}

.progress-text {
  font-size: 11px;
  color: #ffd700;
  margin-bottom: 6px;
  text-align: center;
}

.progress-bar-mini {
  height: 3px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill-mini {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ffed4e);
  transition: width 0.5s ease-out;
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
}

.doc-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.doc-status.ready,
.doc-status.parsed {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.doc-status.pending,
.doc-status.processing {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.doc-status.failed,
.doc-status.error {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  gap: 16px;
}

.empty-icon {
  color: rgba(255, 215, 0, 0.2);
  margin-bottom: 8px;
}

.upload-empty-btn {
  margin-top: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-empty-btn:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
}

/* 弹窗 */
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

.modal {
  background: linear-gradient(145deg, #1a1a1d 0%, #151518 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 16px;
  padding: 24px;
  width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.modal-input {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  color: white;
  margin-bottom: 20px;
  font-size: 14px;
  transition: all 0.3s;
}

.modal-input:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.modal-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-btn {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
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

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: linear-gradient(145deg, #1a1a1d 0%, #151518 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 2000;
  overflow: hidden;
}

.menu-item {
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
}

.menu-item:hover {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.menu-item.danger {
  color: #f44336;
}

.menu-item.danger:hover {
  background: rgba(244, 67, 54, 0.1);
}

/* 上传进度 */
.upload-progress {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: linear-gradient(145deg, #1a1a1d 0%, #151518 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  width: 320px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: #ffd700;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ffed4e);
  transition: width 0.3s;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.progress-file {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 消息提示 */
.message-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  padding: 16px 20px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
  max-width: 400px;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.message-toast.success {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  border: 1px solid rgba(76, 175, 80, 0.5);
}

.message-toast.error {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  border: 1px solid rgba(244, 67, 54, 0.5);
}

.message-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-icon {
  flex-shrink: 0;
}

/* 文档预览弹窗 */
.preview-modal {
  background: linear-gradient(145deg, #1a1a1d 0%, #151518 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 16px;
  width: 90vw;
  height: 90vh;
  max-width: 1200px;
  max-height: 800px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffd700;
  font-size: 16px;
  font-weight: 500;
}

.preview-icon {
  color: rgba(255, 215, 0, 0.6);
  flex-shrink: 0;
}

.preview-actions {
  display: flex;
  gap: 12px;
}

.preview-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.preview-btn:hover {
  background: rgba(255, 215, 0, 0.2);
  transform: translateY(-1px);
}

.preview-btn.close-btn {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.1);
}

.preview-btn.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.preview-content {
  flex: 1;
  display: flex;
  position: relative;
}

.pdf-preview {
  width: 100%;
  height: 100%;
  display: flex;
}

.pdf-viewer {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.text-preview {
  width: 100%;
  height: 100%;
  padding: 24px;
  background: #0a0a0b;
  overflow-y: auto;
}

.text-content {
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.unsupported-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  gap: 16px;
  text-align: center;
}

.unsupported-icon {
  color: rgba(255, 215, 0, 0.3);
  margin-bottom: 16px;
}

.file-info {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.3);
  margin: 16px 0;
  line-height: 1.5;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 25px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.download-btn:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
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