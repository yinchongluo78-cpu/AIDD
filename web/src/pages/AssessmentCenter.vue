<template>
  <AppLayout @show-profile="showProfileModal = true">
    <div class="assessment-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">测评中心</h1>
        <p class="page-subtitle">通过多维度测评，了解自己的学习特点和优势</p>
      </div>

      <!-- 每日测评提示卡片 -->
      <div class="daily-section">
        <div class="daily-card">
          <div class="daily-header">
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/>
            </svg>
            <div>
              <h3>每日知识测评</h3>
              <p>每天2分钟，巩固学习成果</p>
            </div>
          </div>

          <div v-if="dailyStatus.hasCompleted" class="daily-completed">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
            <span>今日已完成 - {{ dailyStatus.moduleName }}</span>
          </div>
          <button v-else class="daily-start-btn" @click="startDailyAssessment">
            开始今日测评
          </button>
        </div>
      </div>

      <!-- 测评模块卡片列表 -->
      <div class="modules-grid">
        <div
          v-for="module in modules.filter(m => m.slug !== 'daily_knowledge')"
          :key="module.id"
          class="module-card"
          :class="{ completed: module.isCompleted }"
        >
          <div class="module-icon">
            <svg v-if="module.type === 'personality'" viewBox="0 0 24 24" width="48" height="48">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="currentColor"/>
            </svg>
            <svg v-else-if="module.type === 'cognition'" viewBox="0 0 24 24" width="48" height="48">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </svg>
            <svg v-else-if="module.type === 'talent'" viewBox="0 0 24 24" width="48" height="48">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="48" height="48">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" fill="currentColor"/>
            </svg>
          </div>

          <h3 class="module-name">{{ module.name }}</h3>

          <div v-if="module.isCompleted" class="completion-badge">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
            <span>已完成</span>
          </div>
          <div v-else class="incomplete-badge">未完成</div>

          <p class="module-description">{{ getModuleDescription(module.type) }}</p>

          <button
            class="start-btn"
            @click="startAssessment(module.slug)"
          >
            {{ module.isCompleted ? '重新测评' : '开始测评' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 个人资料弹窗 -->
    <ProfileModal v-if="showProfileModal" @close="showProfileModal = false" />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import ProfileModal from '../components/ProfileModal.vue'
import api from '../api'

const router = useRouter()
const showProfileModal = ref(false)
const modules = ref<any[]>([])
const dailyStatus = ref<any>({ hasCompleted: false })

// 获取测评模块列表
const loadModules = async () => {
  try {
    const res = await api.get('/assessment/modules')
    modules.value = res.data
  } catch (error) {
    console.error('获取测评模块失败:', error)
    alert('获取测评模块失败，请稍后重试')
  }
}

// 获取每日测评状态
const loadDailyStatus = async () => {
  try {
    const res = await api.get('/assessment/daily-status')
    dailyStatus.value = res.data
  } catch (error) {
    console.error('获取每日测评状态失败:', error)
  }
}

// 获取模块描述
const getModuleDescription = (type: string) => {
  const descriptions: Record<string, string> = {
    personality: '了解你的性格特点和行为倾向',
    cognition: '评估数理逻辑和抽象思维能力',
    talent: '发现你的天赋优势和兴趣方向',
    knowledge: '检测各科知识点的掌握情况'
  }
  return descriptions[type] || '完善你的学习画像'
}

// 开始测评
const startAssessment = (slug: string) => {
  router.push(`/assessment/${slug}`)
}

// 开始每日测评
const startDailyAssessment = () => {
  router.push('/assessment/daily')
}

onMounted(() => {
  loadModules()
  loadDailyStatus()
})
</script>

<style scoped>
.assessment-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 40px;
  background: #0a0a0b;
}

/* 页面标题 */
.page-header {
  margin-bottom: 40px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 10px 0;
}

.page-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* 测评模块网格 */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.module-card {
  background: linear-gradient(145deg, rgba(26, 26, 29, 0.8), rgba(20, 20, 23, 0.9));
  border: 1px solid rgba(255, 215, 0, 0.1);
  border-radius: 16px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.module-card:hover {
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.15);
  transform: translateY(-4px);
}

.module-card.completed {
  border-color: rgba(76, 175, 80, 0.3);
}

.module-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: #ffd700;
}

.module-card.completed .module-icon {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(129, 199, 132, 0.1) 100%);
  color: #4caf50;
}

.module-name {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 12px 0;
}

.completion-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 20px;
  color: #4caf50;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 16px;
}

.completion-badge svg {
  flex-shrink: 0;
}

.incomplete-badge {
  padding: 6px 12px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 20px;
  color: rgba(255, 215, 0, 0.8);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 16px;
}

.module-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin: 0 0 24px 0;
  flex: 1;
}

.start-btn {
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border: none;
  border-radius: 8px;
  color: #0a0a0b;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
}

.start-btn:active {
  transform: translateY(0);
}

/* 每日测评区域 */
.daily-section {
  margin-bottom: 40px;
}

.daily-card {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(21, 101, 192, 0.05) 100%);
  border: 1px solid rgba(33, 150, 243, 0.2);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.daily-header {
  display: flex;
  align-items: center;
  gap: 20px;
  color: #2196f3;
}

.daily-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 6px 0;
}

.daily-header p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.daily-completed {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  color: #4caf50;
  font-size: 14px;
  font-weight: 500;
}

.daily-start-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.daily-start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(33, 150, 243, 0.4);
}

.daily-start-btn:active {
  transform: translateY(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .assessment-container {
    padding: 20px;
  }

  .modules-grid {
    grid-template-columns: 1fr;
  }

  .daily-card {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }

  .daily-header {
    flex-direction: column;
    text-align: center;
  }
}
</style>
