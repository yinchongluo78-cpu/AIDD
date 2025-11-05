<template>
  <div v-if="show" class="modal-overlay" @click.self="handleSkip">
    <div class="modal-container">
      <div class="modal-header">
        <h2>👋 欢迎使用智能学习助手！</h2>
        <button class="close-btn" @click="handleSkip">×</button>
      </div>

      <div class="modal-body">
        <div class="intro-section">
          <p class="intro-text">
            为了给你提供更个性化的学习体验，我们准备了4个简短的测试，
            帮助AI老师更好地了解你的学习特点。
          </p>
        </div>

        <div class="tests-grid">
          <div v-for="module in modules" :key="module.slug" class="test-card">
            <div class="test-icon">{{ module.icon }}</div>
            <h3>{{ module.name }}</h3>
            <p class="test-duration">⏱️ 约{{ module.estimatedDuration }}分钟</p>
            <p class="test-desc">{{ module.description }}</p>
          </div>
        </div>

        <div class="benefits">
          <h3>✨ 完成测试后，你将获得：</h3>
          <ul>
            <li>📚 个性化的学习计划</li>
            <li>🤖 专属的AI老师教学风格</li>
            <li>🎯 针对性的学习建议</li>
          </ul>
        </div>

        <div class="note">
          <p>💡 测试结果仅用于优化学习体验，不会影响你的正常使用。你也可以稍后在个人中心完成测试。</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="handleSkip">稍后再说</button>
        <button class="btn-primary" @click="handleStart">开始测试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

interface DiagnosticModule {
  id: string
  name: string
  slug: string
  icon: string
  estimatedDuration: number
  description: string
  importance: number
}

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'skip'): void
  (e: 'start'): void
}>()

const router = useRouter()
const modules = ref<DiagnosticModule[]>([])

// 获取测试模块列表
const fetchModules = async () => {
  try {
    const response = await api.get('/api/diagnostic/modules')
    modules.value = response.modules
  } catch (error) {
    console.error('获取测试模块失败:', error)
  }
}

const handleSkip = async () => {
  try {
    // 记录用户跳过了测试弹窗
    await api.post('/api/diagnostic/onboarding/skip')
    emit('skip')
    emit('close')
  } catch (error) {
    console.error('记录跳过失败:', error)
    emit('skip')
    emit('close')
  }
}

const handleStart = async () => {
  try {
    // 记录用户开始测试
    await api.post('/api/diagnostic/onboarding/start')
    emit('start')
    emit('close')
    // 跳转到第一个测试
    if (modules.value.length > 0) {
      router.push(`/diagnostic/${modules.value[0].slug}`)
    }
  } catch (error) {
    console.error('开始测试失败:', error)
  }
}

onMounted(() => {
  if (props.show) {
    fetchModules()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 24px 28px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 28px;
}

.intro-section {
  margin-bottom: 24px;
}

.intro-text {
  font-size: 16px;
  line-height: 1.6;
  color: #666;
  margin: 0;
}

.tests-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.test-card {
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s;
}

.test-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.test-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.test-card h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
}

.test-duration {
  font-size: 13px;
  color: #999;
  margin: 0 0 8px 0;
}

.test-desc {
  font-size: 13px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.benefits {
  background: #f8f9ff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.benefits h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.benefits ul {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.benefits li {
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.benefits li:last-child {
  margin-bottom: 0;
}

.note {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
  padding: 12px 16px;
}

.note p {
  margin: 0;
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
}

.modal-footer {
  padding: 20px 28px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary, .btn-primary {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-secondary:hover {
  background: #e8e8e8;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

@media (max-width: 640px) {
  .tests-grid {
    grid-template-columns: 1fr;
  }

  .modal-container {
    width: 95%;
    max-height: 95vh;
  }

  .modal-header h2 {
    font-size: 20px;
  }
}
</style>
