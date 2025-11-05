<template>
  <teleport to="body">
    <transition name="tutorial-fade">
      <div v-if="isActive && currentSteps.length > 0" class="tutorial-overlay">
        <!-- 遮罩层 -->
        <div class="tutorial-backdrop" @click="skipTutorial"></div>

        <!-- 高亮目标元素 -->
        <div
          v-if="currentSteps[currentStep].target"
          class="tutorial-highlight"
          :style="highlightStyle"
        ></div>

        <!-- 提示框 -->
        <div class="tutorial-tooltip" :style="tooltipStyle">
          <div class="tutorial-header">
            <h3 class="tutorial-title">{{ currentSteps[currentStep].title }}</h3>
            <button class="tutorial-close" @click="skipTutorial" aria-label="关闭引导">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="tutorial-content">
            <p class="tutorial-description">{{ currentSteps[currentStep].description }}</p>
          </div>

          <div class="tutorial-footer">
            <div class="tutorial-progress">
              <span>{{ currentStep + 1 }} / {{ currentSteps.length }}</span>
            </div>
            <div class="tutorial-actions">
              <button
                v-if="currentStep > 0"
                @click="prevStep"
                class="tutorial-btn tutorial-btn-secondary"
              >
                上一步
              </button>
              <button
                @click="currentStep < currentSteps.length - 1 ? nextStep() : completeTutorial()"
                class="tutorial-btn tutorial-btn-primary"
              >
                {{ currentStep < currentSteps.length - 1 ? '下一步' : '完成' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { TutorialStep } from '../composables/useTutorial'

const props = defineProps<{
  isActive: boolean
  currentStep: number
  currentSteps: TutorialStep[]
}>()

const emit = defineEmits<{
  nextStep: []
  prevStep: []
  skipTutorial: []
  completeTutorial: []
}>()

const highlightStyle = ref({})
const tooltipStyle = ref({})

// 计算高亮和提示框位置
const updatePositions = () => {
  const currentStepData = props.currentSteps[props.currentStep]

  if (!currentStepData?.target) {
    // 没有目标元素时，提示框居中显示
    tooltipStyle.value = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10002
    }
    return
  }

  const targetElement = document.querySelector(currentStepData.target)
  if (!targetElement) {
    console.warn(`找不到引导目标元素: ${currentStepData.target}`)
    return
  }

  const rect = targetElement.getBoundingClientRect()
  const padding = 8

  // 高亮区域样式
  highlightStyle.value = {
    position: 'fixed',
    top: `${rect.top - padding}px`,
    left: `${rect.left - padding}px`,
    width: `${rect.width + padding * 2}px`,
    height: `${rect.height + padding * 2}px`,
    zIndex: 10001
  }

  // 提示框位置（根据 placement 调整）
  const tooltipWidth = 420
  const tooltipHeight = 250  // 增加高度以适应内容
  const placement = currentStepData.placement || 'bottom'
  const gap = 30  // 增加间距，避免遮挡

  let top = 0
  let left = 0

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  switch (placement) {
    case 'top':
      // 显示在上方，确保不遮挡高亮区域
      top = rect.top - tooltipHeight - gap
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      // 如果上方空间不够，尝试显示在下方
      if (top < 10) {
        top = rect.bottom + gap
      }
      break
    case 'bottom':
      // 显示在下方，确保不遮挡高亮区域
      top = rect.bottom + gap
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      // 如果下方空间不够，尝试显示在上方
      if (top + tooltipHeight > viewportHeight - 10) {
        top = rect.top - tooltipHeight - gap
      }
      break
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.left - tooltipWidth - gap
      // 如果左侧空间不够，尝试显示在右侧
      if (left < 10) {
        left = rect.right + gap
      }
      break
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.right + gap
      // 如果右侧空间不够，尝试显示在左侧
      if (left + tooltipWidth > viewportWidth - 10) {
        left = rect.left - tooltipWidth - gap
      }
      break
  }

  // 确保提示框在视口内
  if (left < 10) left = 10
  if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10
  if (top < 10) top = 10
  if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10

  tooltipStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 10002
  }
}

// 监听步骤变化，更新位置
watch(() => props.currentStep, () => {
  setTimeout(updatePositions, 100)  // 给DOM更新一点时间
})

watch(() => props.isActive, (newValue) => {
  if (newValue) {
    setTimeout(updatePositions, 100)
  }
})

// 窗口大小变化时重新计算位置
onMounted(() => {
  window.addEventListener('resize', updatePositions)
  updatePositions()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePositions)
})

const nextStep = () => emit('nextStep')
const prevStep = () => emit('prevStep')
const skipTutorial = () => emit('skipTutorial')
const completeTutorial = () => emit('completeTutorial')
</script>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
  pointer-events: none;
}

.tutorial-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);  /* 降低遮罩透明度，让背景更亮 */
  z-index: 10000;
  pointer-events: auto;
}

.tutorial-highlight {
  border: 4px solid #fbbf24;
  border-radius: 10px;
  box-shadow:
    0 0 0 9999px rgba(0, 0, 0, 0.55),  /* 降低外部遮罩透明度，让背景更亮 */
    0 0 30px rgba(251, 191, 36, 0.8),  /* 金色外发光 */
    inset 0 0 60px rgba(251, 191, 36, 0.15),  /* 内部金色光晕 */
    inset 0 0 0 2000px rgba(255, 255, 255, 0.08);  /* 内部提亮 */
  pointer-events: none;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);  /* 渐变提亮背景 */
  z-index: 10001;
}

.tutorial-tooltip {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(251, 191, 36, 0.1);
  max-width: 420px;
  min-width: 360px;
  pointer-events: auto;
  backdrop-filter: blur(10px);
}

.tutorial-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 18px;
}

.tutorial-title {
  font-size: 19px;
  font-weight: 600;
  color: #f9fafb;
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.tutorial-close {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  color: #d1d5db;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-left: 12px;
}

.tutorial-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #f9fafb;
  border-color: rgba(255, 255, 255, 0.2);
}

.tutorial-content {
  margin-bottom: 24px;
}

.tutorial-description {
  font-size: 15px;
  line-height: 1.7;
  color: #d1d5db;
  margin: 0;
}

.tutorial-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tutorial-progress {
  font-size: 14px;
  color: #9ca3af;
  font-weight: 500;
}

.tutorial-actions {
  display: flex;
  gap: 10px;
}

.tutorial-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.tutorial-btn-primary {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #111827;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
}

.tutorial-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(251, 191, 36, 0.5);
}

.tutorial-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #d1d5db;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.tutorial-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: #f9fafb;
}

/* 动画 */
.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: opacity 0.3s ease;
}

.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
}
</style>
