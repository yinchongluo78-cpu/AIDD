<template>
  <div class="share-page">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <h2>加载失败</h2>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="conversation" class="share-wrapper">
      <header class="share-header">
        <h1>{{ conversation.title || '未命名对话' }}</h1>
        <div class="author-info">
          <span>分享者：{{ conversation.author.name }}</span>
          <span>创建时间：{{ formatDate(conversation.createdAt) }}</span>
        </div>
      </header>

      <div class="messages-container">
        <div
          v-for="(message, index) in conversation.messages"
          :key="message.id"
          :class="['message', message.role]"
        >
          <div class="message-avatar">
            <div v-if="message.role === 'user'" class="user-avatar">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="35" r="15" fill="white" opacity="0.9"/>
                <ellipse cx="50" cy="70" rx="25" ry="20" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <div v-else class="ai-avatar">AI</div>
          </div>

          <div class="message-content">
            <div v-if="message.imageOssKey" class="message-image">
              <img :src="getImageUrl(message.imageOssKey)" alt="图片" loading="lazy" @error="handleImageError" />
            </div>
            <!-- 🔥 后端重构：AI消息使用后端渲染的 htmlContent（教科书风格） -->
            <div v-if="message.content && message.content.trim()" class="message-text" v-html="message.htmlContent || renderMessage(message.content)"></div>
            <div v-else-if="message.role === 'assistant'" class="message-text empty-message">
              <em>（AI正在思考...）</em>
            </div>
          </div>
        </div>
      </div>

      <footer class="share-footer">
        <p>由 <strong>智能少年</strong> 提供技术支持</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { renderMarkdownToHtml } from '../utils/markdown'
import 'katex/dist/katex.min.css'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const conversation = ref<any>(null)

// 在生产环境使用相对路径，开发环境使用完整URL
const API_BASE = import.meta.env.VITE_API_URL || '/api'

onMounted(async () => {
  const shareId = route.params.shareId as string
  if (!shareId) {
    error.value = '无效的分享链接'
    loading.value = false
    return
  }

  try {
    const response = await axios.get(`${API_BASE}/shared/public/${shareId}`)
    conversation.value = response.data
    console.log('分享对话加载成功，消息数量:', response.data.messages?.length)
    console.log('所有消息:', response.data.messages)
  } catch (err: any) {
    if (err.response?.status === 404) {
      error.value = '分享不存在'
    } else if (err.response?.status === 410) {
      error.value = '分享已失效'
    } else {
      error.value = err.response?.data?.error || '加载失败'
    }
  } finally {
    loading.value = false
  }
})

function renderMessage(content: string) {
  if (!content) return ''
  return renderMarkdownToHtml(content)
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getImageUrl(ossKey: string) {
  // 通过后端API获取签名URL
  return `${API_BASE}/images/${ossKey}`
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  console.error('图片加载失败:', img.src)
  // 可以设置一个占位图
  img.style.display = 'none'
}
</script>

<style>
/* 全局样式确保可以正常滚动 */
html, body {
  height: auto !important;
  overflow-y: auto !important;
}
</style>

<style scoped>
.share-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f5f5f5;
  padding-bottom: 40px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.error-container h2 {
  color: #f44336;
  margin-bottom: 10px;
}

.error-container p {
  color: #666;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.share-wrapper {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  min-height: 100vh;
}

.share-header {
  padding: 30px 20px;
  border-bottom: 2px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.share-header h1 {
  margin: 0 0 15px 0;
  font-size: 24px;
  font-weight: 600;
}

.author-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
  opacity: 0.9;
}

.messages-container {
  padding: 20px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease-in;
  max-height: none !important;
  height: auto !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar svg {
  width: 20px;
  height: 20px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.message-content {
  flex: 1;
  min-width: 0;
  max-height: none !important;
  overflow: visible !important;
  height: auto !important;
}

.message.user .message-content {
  background: #e3f2fd;
  border-radius: 12px 12px 0 12px;
  padding: 12px 16px;
}

.message.assistant .message-content {
  background: #f5f5f5;
  border-radius: 12px 12px 12px 0;
  padding: 12px 16px;
}

.message-image {
  margin-bottom: 10px;
}

.message-image img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.message-image img:hover {
  transform: scale(1.02);
}

.message-text {
  line-height: 1.6;
  word-wrap: break-word;
  color: #333;
  max-height: none !important;
  overflow: visible !important;
  display: block !important;
  white-space: normal !important;
  transform: translateZ(0);
  will-change: transform;
}

.message-text :deep(p) {
  margin: 0 0 10px 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 10px 0;
  padding-left: 24px;
}

.message-text :deep(li) {
  margin: 6px 0;
}

.message-text :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.message-text :deep(pre) {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 10px 0;
}

.message-text :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

/* KaTeX样式 */
.message-text :deep(.katex) {
  font-size: 1.1em;
  max-height: none !important;
}

.message-text :deep(.katex-display) {
  margin: 16px 0;
  overflow-x: auto;
  overflow-y: visible !important;
  max-height: none !important;
}

.message-text.empty-message {
  color: #999;
  font-size: 14px;
}

.share-footer {
  padding: 20px;
  text-align: center;
  border-top: 1px solid #eee;
  background: #fafafa;
  color: #666;
  font-size: 14px;
}

.share-footer strong {
  color: #667eea;
}

@media (max-width: 768px) {
  .share-header h1 {
    font-size: 20px;
  }

  .author-info {
    flex-direction: column;
    gap: 8px;
  }

  .messages-container {
    padding: 12px;
  }

  .message {
    margin-bottom: 16px;
  }
}
</style>
