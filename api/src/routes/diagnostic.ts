import { Router } from 'express'
import { prisma } from '../index'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

// 获取新手引导状态
router.get('/onboarding/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        hasCompletedTutorial: true,
        tutorialStep: true
      }
    })

    if (!profile) {
      return res.json({
        hasCompleted: false,
        currentStep: 0,
        shouldShowTestModal: true  // 新用户显示引导
      })
    }

    res.json({
      hasCompleted: profile.hasCompletedTutorial,
      currentStep: profile.tutorialStep,
      shouldShowTestModal: !profile.hasCompletedTutorial  // 未完成教程时显示
    })
  } catch (error) {
    console.error('获取引导状态错误:', error)
    res.status(500).json({ message: '获取引导状态失败' })
  }
})

// 更新新手引导进度
router.post('/onboarding/progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { step } = req.body

    await prisma.profile.upsert({
      where: { userId },
      update: {
        tutorialStep: step
      },
      create: {
        userId,
        tutorialStep: step,
        hasCompletedTutorial: false
      }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('更新引导进度错误:', error)
    res.status(500).json({ message: '更新引导进度失败' })
  }
})

// 标记新手引导完成
router.post('/onboarding/complete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!

    await prisma.profile.upsert({
      where: { userId },
      update: {
        hasCompletedTutorial: true,
        tutorialStep: 5 // 5步引导全部完成
      },
      create: {
        userId,
        hasCompletedTutorial: true,
        tutorialStep: 5
      }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('标记引导完成错误:', error)
    res.status(500).json({ message: '标记引导完成失败' })
  }
})

// 重置新手引导（用于重新查看）
router.post('/onboarding/reset', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!

    await prisma.profile.update({
      where: { userId },
      data: {
        hasCompletedTutorial: false,
        tutorialStep: 0
      }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('重置引导错误:', error)
    res.status(500).json({ message: '重置引导失败' })
  }
})

// 获取诊断测试状态
router.get('/my-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // 暂时返回空的测试状态
    // TODO: 未来可以从数据库查询用户的诊断测试完成情况
    res.json({
      completionRate: 0,
      allCompleted: false,
      tests: []
    })
  } catch (error) {
    console.error('获取诊断测试状态错误:', error)
    res.status(500).json({ message: '获取诊断测试状态失败' })
  }
})

export default router
