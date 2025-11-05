import { ref, Ref } from 'vue'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// 引导步骤定义
export interface TutorialStep {
  id: string
  title: string
  description: string
  target?: string  // CSS选择器，指向需要高亮的元素
  placement?: 'top' | 'bottom' | 'left' | 'right'
  action?: () => void  // 可选的动作回调
}

// 对话页面引导步骤
export const chatTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: '👋 欢迎使用智能少年学习助手',
    description: '你好！很高兴见到你～让我带你快速了解如何使用这个学习工具，让学习变得更加轻松有趣！'
  },
  {
    id: 'ai-models',
    title: '🤖 智能对话，双模型加持',
    description: '我们为你准备了两个强大的AI模型：DeepSeek（快速响应）和 ChatGPT（顶尖模型）。你可以根据需要随时切换，享受最智能的学习辅导！',
    target: '.model-selector-btn',
    placement: 'top'
  },
  {
    id: 'image-upload',
    title: '📸 拍照上传，错题秒解',
    description: '遇到不会的题目？拍张照片上传就行！支持 PNG/JPG 格式，单张图片最大 100MB。记得拍清楚一点哦，这样AI才能更准确地帮你分析～',
    target: '.input-tools button[title="上传图片"]',
    placement: 'top'
  },
  {
    id: 'knowledge-base',
    title: '📚 知识库，你的私人资料库',
    description: '你可以上传学习资料（PDF/DOCX/TXT），建立自己的知识库。文件最大 100MB，如果是扫描版PDF，建议选择OCR识别效果更好的文档。AI会从这些资料中找到答案帮助你！',
    target: '.kb-selector-container',
    placement: 'bottom'
  },
  {
    id: 'get-started',
    title: '✨ 接下来，了解知识库',
    description: '对话功能介绍完毕！接下来带你了解如何使用知识库。你可以上传学习资料，AI会从这些资料中找到答案。点击"下一步"跳转到知识库页面继续引导。',
    target: '.input-box',
    placement: 'top'
  }
]

// 知识库页面引导步骤
export const kbTutorialSteps: TutorialStep[] = [
  {
    id: 'kb-intro',
    title: '📚 欢迎来到知识库',
    description: '这里是你的私人资料库！你可以按学科分类上传学习资料（教材、笔记、练习题等），AI会从这些资料中找答案帮助你学习。'
  },
  {
    id: 'create-category',
    title: '📁 第一步：创建分类',
    description: '点击这个按钮创建分类，比如"数学"、"语文"、"英语"等。分类帮助你更好地组织学习资料，在对话时可以选择特定分类来精准检索。',
    target: '.new-category-btn',
    placement: 'right'
  },
  {
    id: 'upload-document',
    title: '📤 第二步：上传文档',
    description: '创建分类后，点击这里上传学习资料。支持PDF、Word、TXT格式，单个文件最大100MB。⚠️ 注意：只支持文字版PDF，扫描版需要先用OCR转换。',
    target: '.upload-btn',
    placement: 'left'
  },
  {
    id: 'view-documents',
    title: '📖 管理你的文档',
    description: '上传的文档会显示在这里。点击文档可以预览内容，右键可以删除。文档解析完成后，就可以在对话页选择知识库来提问啦！',
    target: '.document-grid',
    placement: 'top'
  },
  {
    id: 'kb-complete',
    title: '🎉 知识库设置完成',
    description: '现在你可以开始上传学习资料了！上传后，回到对话页，选择对应的知识库分类，AI就能根据你的资料来回答问题。祝你学习进步！'
  }
]

// 教程引导功能
export function useTutorial() {
  const currentStep = ref(0)
  const isActive = ref(false)
  const currentSteps: Ref<TutorialStep[]> = ref([])
  const hasCompletedTutorial = ref(false)
  const tutorialStep = ref(0)

  // 获取用户引导状态
  const fetchTutorialStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await axios.get(`${API_BASE}/api/diagnostic/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      hasCompletedTutorial.value = response.data.hasCompleted || false
      tutorialStep.value = response.data.currentStep || 0
    } catch (error) {
      console.error('获取引导状态失败:', error)
    }
  }

  // 更新引导状态
  const updateTutorialStatus = async (step?: number, completed?: boolean) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // 如果标记为完成，调用完成接口
      if (completed) {
        await axios.post(`${API_BASE}/api/diagnostic/onboarding/complete`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        hasCompletedTutorial.value = true
        tutorialStep.value = 5
      }
      // 否则更新进度
      else if (step !== undefined) {
        await axios.post(`${API_BASE}/api/diagnostic/onboarding/progress`,
          { step },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        tutorialStep.value = step
      }
    } catch (error) {
      console.error('更新引导状态失败:', error)
    }
  }

  // 开始引导
  const startTutorial = (steps: TutorialStep[]) => {
    currentSteps.value = steps
    currentStep.value = 0
    isActive.value = true
  }

  // 下一步
  const nextStep = () => {
    if (currentStep.value < currentSteps.value.length - 1) {
      currentStep.value++
      updateTutorialStatus(currentStep.value)
    } else {
      completeTutorial()
    }
  }

  // 上一步
  const prevStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--
      updateTutorialStatus(currentStep.value)
    }
  }

  // 跳过引导
  const skipTutorial = () => {
    isActive.value = false
    updateTutorialStatus(0, true)
  }

  // 完成引导
  const completeTutorial = () => {
    isActive.value = false
    updateTutorialStatus(currentSteps.value.length, true)
  }

  // 开始完整教程
  const startFullTutorial = () => {
    startTutorial(chatTutorialSteps)
  }

  // 开始知识库教程
  const startKbTutorial = () => {
    startTutorial(kbTutorialSteps)
  }

  // 重置引导状态（用于测试）
  const resetTutorial = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      await axios.post(`${API_BASE}/api/diagnostic/onboarding/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      hasCompletedTutorial.value = false
      tutorialStep.value = 0
      isActive.value = false
      currentStep.value = 0
    } catch (error) {
      console.error('重置引导状态失败:', error)
    }
  }

  // 重新开始引导（用于"重新查看引导"功能）
  const restartTutorial = async () => {
    console.log('📚 restartTutorial 被调用')
    await resetTutorial()
    console.log('✅ 引导状态已重置')
    // 重置后启动引导
    startFullTutorial()
    console.log('🚀 已调用 startFullTutorial()')
  }

  return {
    currentStep,
    isActive,
    currentSteps,
    hasCompletedTutorial,
    tutorialStep,
    fetchTutorialStatus,
    updateTutorialStatus,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    startFullTutorial,
    startKbTutorial,
    resetTutorial,
    restartTutorial
  }
}
