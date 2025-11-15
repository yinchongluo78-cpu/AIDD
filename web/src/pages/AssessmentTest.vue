<template>
  <AppLayout @show-profile="showProfileModal = true">
    <div class="test-container">
      <!-- 测评头部信息 -->
      <div v-if="!loading && moduleInfo" class="test-header">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
          </svg>
          返回
        </button>
        <div class="header-info">
          <h1 class="test-title">{{ moduleInfo.name }}</h1>
          <p class="test-progress">题目 {{ currentQuestionIndex + 1 }} / {{ questions.length }}</p>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载测评题目中...</p>
      </div>

      <!-- 题目内容 -->
      <div v-else-if="!submitted" class="question-section">
        <div v-if="currentQuestion" class="question-card">
          <div class="question-header">
            <span class="question-number">第 {{ currentQuestionIndex + 1 }} 题</span>
            <span v-if="currentQuestion.questionType === 'multi_choice'" class="multi-tip">（可多选）</span>
          </div>

          <p class="question-content">{{ currentQuestion.content }}</p>

          <!-- 选择题选项 -->
          <div v-if="currentQuestion.options" class="options-list">
            <div
              v-for="option in currentQuestion.options"
              :key="option.key"
              class="option-item"
              :class="{
                selected: isOptionSelected(option.key),
                'multi-choice': currentQuestion.questionType === 'multi_choice'
              }"
              @click="selectOption(option.key)"
            >
              <div class="option-checkbox">
                <svg v-if="isOptionSelected(option.key)" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                </svg>
              </div>
              <span class="option-key">{{ option.key }}</span>
              <span class="option-text">{{ option.text }}</span>
            </div>
          </div>

          <!-- 量表选项 -->
          <div v-else-if="currentQuestion.questionType === 'scale'" class="scale-options">
            <button
              v-for="score in [1, 2, 3, 4, 5]"
              :key="score"
              class="scale-btn"
              :class="{ selected: currentAnswer?.score === score }"
              @click="selectScale(score)"
            >
              {{ score }}
            </button>
            <div class="scale-labels">
              <span>非常不同意</span>
              <span>非常同意</span>
            </div>
          </div>
        </div>

        <!-- 导航按钮 -->
        <div class="nav-buttons">
          <button
            v-if="currentQuestionIndex > 0"
            class="nav-btn prev-btn"
            @click="prevQuestion"
          >
            上一题
          </button>
          <button
            v-if="currentQuestionIndex < questions.length - 1"
            class="nav-btn next-btn"
            :disabled="!currentAnswer"
            @click="nextQuestion"
          >
            下一题
          </button>
          <button
            v-else
            class="nav-btn submit-btn"
            :disabled="!allAnswered"
            @click="submitTest"
          >
            提交测评
          </button>
        </div>
      </div>

      <!-- 提交成功 -->
      <div v-else class="success-state">
        <svg viewBox="0 0 24 24" width="80" height="80">
          <circle cx="12" cy="12" r="10" fill="#4caf50" opacity="0.2"/>
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#4caf50"/>
        </svg>
        <h2>测评提交成功！</h2>
        <p>您的答案已保存，稍后可查看分析报告</p>
        <button class="back-home-btn" @click="goBack">返回测评中心</button>
      </div>
    </div>

    <!-- 个人资料弹窗 -->
    <ProfileModal v-if="showProfileModal" @close="showProfileModal = false" />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import ProfileModal from '../components/ProfileModal.vue'
import api from '../api'

const router = useRouter()
const route = useRoute()
const showProfileModal = ref(false)

const loading = ref(true)
const submitted = ref(false)
const moduleInfo = ref<any>(null)
const questions = ref<any[]>([])
const answers = ref<Map<string, any>>(new Map())
const currentQuestionIndex = ref(0)
const attemptId = ref<string>('')

const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])
const currentAnswer = computed(() => answers.value.get(currentQuestion.value?.id))

// 检查是否所有题目都已回答
const allAnswered = computed(() => {
  return questions.value.every(q => answers.value.has(q.id))
})

// 检查选项是否被选中
const isOptionSelected = (key: string) => {
  const answer = currentAnswer.value
  if (!answer) return false

  if (currentQuestion.value.questionType === 'multi_choice') {
    return answer.keys?.includes(key)
  } else {
    return answer.key === key
  }
}

// 选择选项
const selectOption = (key: string) => {
  const qid = currentQuestion.value.id
  const qtype = currentQuestion.value.questionType

  if (qtype === 'multi_choice') {
    const existing = answers.value.get(qid)
    let keys = existing?.keys || []

    if (keys.includes(key)) {
      keys = keys.filter((k: string) => k !== key)
    } else {
      keys = [...keys, key]
    }

    if (keys.length > 0) {
      answers.value.set(qid, { keys })
    } else {
      answers.value.delete(qid)
    }
  } else {
    answers.value.set(qid, { key })
  }
}

// 选择量表分数
const selectScale = (score: number) => {
  const qid = currentQuestion.value.id
  answers.value.set(qid, { score })
}

// 上一题
const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

// 下一题
const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++
  }
}

// 返回
const goBack = () => {
  router.push('/assessment')
}

// 加载测评题目
const loadQuestions = async () => {
  try {
    const slug = route.params.slug as string

    // 获取题目
    const res = await api.get(`/assessment/module/${slug}/questions`)
    moduleInfo.value = res.data.module
    questions.value = res.data.questions

    // 创建测评记录
    const attemptRes = await api.post('/assessment/attempt', {
      moduleId: moduleInfo.value.id
    })
    attemptId.value = attemptRes.data.attemptId

    loading.value = false
  } catch (error) {
    console.error('加载测评失败:', error)
    alert('加载测评失败，请稍后重试')
    goBack()
  }
}

// 提交测评
const submitTest = async () => {
  if (!allAnswered.value) {
    alert('请回答所有题目后再提交')
    return
  }

  try {
    // 提交所有答案
    const answersArray = questions.value.map(q => ({
      questionId: q.id,
      answer: answers.value.get(q.id)
    }))

    await api.post(`/assessment/attempt/${attemptId.value}/answers`, {
      answers: answersArray
    })

    // 标记完成
    await api.post(`/assessment/attempt/${attemptId.value}/submit`)

    submitted.value = true
  } catch (error) {
    console.error('提交测评失败:', error)
    alert('提交失败，请稍后重试')
  }
}

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.test-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 40px;
  background: #0a0a0b;
}

/* 测评头部 */
.test-header {
  margin-bottom: 40px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.header-info {
  text-align: center;
}

.test-title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 10px 0;
}

.test-progress {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 215, 0, 0.1);
  border-top-color: #ffd700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
}

/* 题目区域 */
.question-section {
  max-width: 800px;
  margin: 0 auto;
}

.question-card {
  background: linear-gradient(145deg, rgba(26, 26, 29, 0.8), rgba(20, 20, 23, 0.9));
  border: 1px solid rgba(255, 215, 0, 0.1);
  border-radius: 16px;
  padding: 40px;
  margin-bottom: 30px;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.question-number {
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 237, 78, 0.1) 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 20px;
  color: #ffd700;
  font-size: 14px;
  font-weight: 600;
}

.multi-tip {
  color: rgba(255, 215, 0, 0.7);
  font-size: 13px;
}

.question-content {
  font-size: 18px;
  color: #ffffff;
  line-height: 1.8;
  margin: 0 0 30px 0;
}

/* 选项列表 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 215, 0, 0.3);
}

.option-item.selected {
  background: rgba(255, 215, 0, 0.08);
  border-color: #ffd700;
}

.option-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  color: #ffd700;
}

.option-item.selected .option-checkbox {
  background: #ffd700;
  border-color: #ffd700;
  color: #0a0a0b;
}

.option-key {
  font-size: 16px;
  font-weight: 600;
  color: #ffd700;
  min-width: 24px;
}

.option-text {
  font-size: 16px;
  color: #ffffff;
  line-height: 1.6;
}

/* 量表选项 */
.scale-options {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.scale-options > div:first-child {
  display: flex;
  gap: 16px;
}

.scale-btn {
  width: 60px;
  height: 60px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scale-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 215, 0, 0.5);
}

.scale-btn.selected {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border-color: #ffd700;
  color: #0a0a0b;
}

.scale-labels {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

/* 导航按钮 */
.nav-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.nav-btn {
  padding: 14px 32px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.prev-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.prev-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.next-btn {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #0a0a0b;
}

.next-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
}

.submit-btn {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: #ffffff;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.4);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 成功状态 */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 24px;
  text-align: center;
}

.success-state h2 {
  font-size: 28px;
  color: #ffffff;
  margin: 0;
}

.success-state p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.back-home-btn {
  padding: 14px 32px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border: none;
  border-radius: 8px;
  color: #0a0a0b;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 10px;
}

.back-home-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
}
</style>
