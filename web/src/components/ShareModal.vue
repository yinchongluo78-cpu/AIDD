<template>
  <div v-if="visible" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>分享对话</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="loading">加载中...</div>

        <div v-else-if="shareInfo" class="share-info">
          <div class="share-url-section">
            <label>分享链接</label>
            <div class="url-box">
              <input
                ref="urlInput"
                type="text"
                :value="shareInfo.shareUrl"
                readonly
                class="url-input"
              />
              <button @click="copyUrl" class="copy-btn">
                {{ copied ? '已复制' : '复制' }}
              </button>
            </div>
          </div>

          <div class="share-stats">
            <div class="stat-item">
              <span class="stat-label">访问次数</span>
              <span class="stat-value">{{ shareInfo.viewCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">创建时间</span>
              <span class="stat-value">{{ formatDate(shareInfo.createdAt) }}</span>
            </div>
          </div>

          <div class="share-actions">
            <button @click="unshare" class="unshare-btn">取消分享</button>
          </div>
        </div>

        <div v-else class="not-shared">
          <p>该对话尚未分享</p>
          <button @click="createShare" class="create-share-btn" :disabled="creating">
            {{ creating ? '创建中...' : '创建分享链接' }}
          </button>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import api from '../api'

interface Props {
  visible: boolean
  conversationId: string | null
}

interface ShareInfo {
  shareId: string
  shareUrl: string
  viewCount: number
  createdAt: string
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'unshared'])

const loading = ref(false)
const creating = ref(false)
const shareInfo = ref<ShareInfo | null>(null)
const error = ref('')
const copied = ref(false)
const urlInput = ref<HTMLInputElement | null>(null)

watch(() => props.visible, async (newVal) => {
  if (newVal && props.conversationId) {
    await loadShareInfo()
  }
})

async function loadShareInfo() {
  if (!props.conversationId) return

  loading.value = true
  error.value = ''

  try {
    const response = await api.get(`/conversations/${props.conversationId}/share`)
    if (response.data.shared) {
      // 使用当前域名构建分享URL
      const baseUrl = window.location.origin
      shareInfo.value = {
        ...response.data,
        shareUrl: `${baseUrl}/share/${response.data.shareId}`
      }
    } else {
      shareInfo.value = null
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || '加载分享信息失败'
  } finally {
    loading.value = false
  }
}

async function createShare() {
  if (!props.conversationId) return

  creating.value = true
  error.value = ''

  try {
    const response = await api.post(`/conversations/${props.conversationId}/share`)
    // 使用当前域名构建分享URL
    const baseUrl = window.location.origin
    shareInfo.value = {
      ...response.data,
      shareUrl: `${baseUrl}/share/${response.data.shareId}`
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || '创建分享失败'
  } finally {
    creating.value = false
  }
}

async function unshare() {
  if (!props.conversationId || !confirm('确定要取消分享吗？')) return

  try {
    await api.delete(`/conversations/${props.conversationId}/share`)
    shareInfo.value = null
    emit('unshared')
  } catch (err: any) {
    error.value = err.response?.data?.error || '取消分享失败'
  }
}

function copyUrl() {
  if (shareInfo.value && urlInput.value) {
    urlInput.value.select()
    document.execCommand('copy')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function close() {
  emit('close')
  shareInfo.value = null
  error.value = ''
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
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.share-url-section {
  margin-bottom: 20px;
}

.share-url-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.url-box {
  display: flex;
  gap: 10px;
}

.url-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
}

.copy-btn {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.copy-btn:hover {
  background: #45a049;
}

.share-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.share-actions {
  display: flex;
  justify-content: flex-end;
}

.unshare-btn {
  padding: 10px 20px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.unshare-btn:hover {
  background: #da190b;
}

.not-shared {
  text-align: center;
  padding: 40px 20px;
}

.not-shared p {
  margin-bottom: 20px;
  color: #666;
}

.create-share-btn {
  padding: 12px 24px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.create-share-btn:hover:not(:disabled) {
  background: #0b7dda;
}

.create-share-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  font-size: 14px;
}
</style>
