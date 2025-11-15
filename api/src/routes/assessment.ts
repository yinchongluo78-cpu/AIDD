import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// ==================== 1. 获取可用测评模块列表 ====================
router.get('/modules', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    if (!userId) {
      return res.status(401).json({ message: '未授权' })
    }

    // 获取所有激活的测评模块
    const modules = await prisma.assessmentModule.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        isRequired: true
      }
    })

    // 检查用户是否已完成各模块
    const attempts = await prisma.assessmentAttempt.findMany({
      where: {
        userId,
        completedAt: { not: null }
      },
      select: { moduleId: true }
    })

    const completedModuleIds = new Set(attempts.map(a => a.moduleId))

    const modulesWithStatus = modules.map(module => ({
      ...module,
      isCompleted: completedModuleIds.has(module.id)
    }))

    res.json(modulesWithStatus)
  } catch (error) {
    console.error('获取测评模块失败:', error)
    res.status(500).json({ message: '获取测评模块失败' })
  }
})

// ==================== 2. 获取某个模块的题目 ====================
router.get('/module/:slug/questions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params
    const userId = req.userId

    // 查找模块
    const module = await prisma.assessmentModule.findUnique({
      where: { slug }
    })

    if (!module) {
      return res.status(404).json({ message: '测评模块不存在' })
    }

    // 获取用户年级（用于知识点测评筛选）
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { grade: true }
    })

    const userGrade = profile?.grade

    // 提取年级段（小学/初中/高中）用于匹配
    const gradeLevel = userGrade?.includes('小学') ? '小学' :
                       userGrade?.includes('初中') ? '初中' :
                       userGrade?.includes('高中') ? '高中' : null

    // 获取题目（知识点测评需要按年级筛选）
    const questions = await prisma.assessmentQuestion.findMany({
      where: {
        moduleId: module.id,
        // 如果是知识掌握模块且用户有年级信息，则筛选匹配年级的题目
        ...(module.type === 'knowledge' && gradeLevel ? {
          OR: [
            { targetGrade: null }, // 通用题
            { targetGrade: { contains: gradeLevel } } // 匹配用户年级段的题
          ]
        } : {})
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        content: true,
        options: true,
        questionType: true,
        order: true
        // 不返回 correctKey（正确答案）给前端
      }
    })

    res.json({
      module: {
        id: module.id,
        slug: module.slug,
        name: module.name,
        type: module.type
      },
      questions
    })
  } catch (error) {
    console.error('获取测评题目失败:', error)
    res.status(500).json({ message: '获取测评题目失败' })
  }
})

// ==================== 3. 创建新的测评记录 ====================
router.post('/attempt', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { moduleId } = req.body

    if (!moduleId) {
      return res.status(400).json({ message: 'moduleId 是必填项' })
    }

    // 验证模块存在
    const module = await prisma.assessmentModule.findUnique({
      where: { id: moduleId }
    })

    if (!module) {
      return res.status(404).json({ message: '测评模块不存在' })
    }

    // 创建测评记录
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        userId,
        moduleId,
        isDaily: false
      }
    })

    res.json({ attemptId: attempt.id })
  } catch (error) {
    console.error('创建测评记录失败:', error)
    res.status(500).json({ message: '创建测评记录失败' })
  }
})

// ==================== 4. 提交答案（单题或多题） ====================
router.post('/attempt/:id/answers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: attemptId } = req.params
    const { answers } = req.body // answers: [{ questionId, answer }]

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'answers 必须是非空数组' })
    }

    // 验证测评记录存在且属于当前用户
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId }
    })

    if (!attempt) {
      return res.status(404).json({ message: '测评记录不存在' })
    }

    if (attempt.userId !== req.userId) {
      return res.status(403).json({ message: '无权操作此测评记录' })
    }

    if (attempt.completedAt) {
      return res.status(400).json({ message: '该测评已提交，无法再次作答' })
    }

    // 批量创建答案记录
    const answerRecords = answers.map(({ questionId, answer }) => ({
      attemptId,
      questionId,
      answer,
      isCorrect: null // 暂时不判断对错，提交时统一判断
    }))

    await prisma.assessmentAnswer.createMany({
      data: answerRecords,
      skipDuplicates: true
    })

    res.json({ success: true })
  } catch (error) {
    console.error('保存答案失败:', error)
    res.status(500).json({ message: '保存答案失败' })
  }
})

// ==================== 5. 提交测评（标记完成） ====================
router.post('/attempt/:id/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: attemptId } = req.params
    const userId = req.userId

    // 验证测评记录
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        module: true,
        answers: {
          include: {
            question: true
          }
        }
      }
    })

    if (!attempt) {
      return res.status(404).json({ message: '测评记录不存在' })
    }

    if (attempt.userId !== userId) {
      return res.status(403).json({ message: '无权操作此测评记录' })
    }

    if (attempt.completedAt) {
      return res.status(400).json({ message: '该测评已提交' })
    }

    // 计算得分和结果
    let score: number | null = null
    let resultJson: any = {}

    if (attempt.module.type === 'knowledge') {
      // 知识题：计算正确率
      let correctCount = 0
      let totalCount = 0

      for (const answerRecord of attempt.answers) {
        if (answerRecord.question.correctKey) {
          totalCount++
          const userAnswer = (answerRecord.answer as any).key || (answerRecord.answer as any).keys
          const isCorrect = Array.isArray(userAnswer)
            ? JSON.stringify(userAnswer.sort()) === JSON.stringify(answerRecord.question.correctKey.split(',').sort())
            : userAnswer === answerRecord.question.correctKey

          if (isCorrect) correctCount++

          // 更新答案记录的 isCorrect 字段
          await prisma.assessmentAnswer.update({
            where: { id: answerRecord.id },
            data: { isCorrect }
          })
        }
      }

      score = totalCount > 0 ? (correctCount / totalCount) * 100 : 0
      resultJson = {
        correctCount,
        totalCount,
        accuracy: score
      }
    } else {
      // 性格/能力/天赋测评：简单统计（后续会有大模型分析）
      const answerStats: any = {}
      for (const answerRecord of attempt.answers) {
        const answer = answerRecord.answer as any
        answerStats[answerRecord.questionId] = answer
      }
      resultJson = { answerStats }
    }

    // 更新测评记录为已完成
    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score,
        resultJson
      }
    })

    // 更新用户画像（调用内部函数）
    await updateAssessmentProfile(userId)

    res.json({ success: true, message: '测评已提交' })
  } catch (error) {
    console.error('提交测评失败:', error)
    res.status(500).json({ message: '提交测评失败' })
  }
})

// ==================== 6. 每日测评状态 ====================
router.get('/daily-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 查找今天的每日测评记录
    const todayAttempt = await prisma.assessmentAttempt.findFirst({
      where: {
        userId,
        isDaily: true,
        startedAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        module: true
      }
    })

    if (todayAttempt && todayAttempt.completedAt) {
      return res.json({
        hasCompleted: true,
        moduleName: todayAttempt.module.name,
        completedAt: todayAttempt.completedAt
      })
    } else {
      return res.json({
        hasCompleted: false
      })
    }
  } catch (error) {
    console.error('获取每日测评状态失败:', error)
    res.status(500).json({ message: '获取每日测评状态失败' })
  }
})

// ==================== 7. 每日测评题目 ====================
router.get('/daily/questions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!

    // 找到每日测评模块（约定 slug 为 'daily_knowledge'）
    const dailyModule = await prisma.assessmentModule.findFirst({
      where: {
        type: 'knowledge',
        slug: 'daily_knowledge'
      }
    })

    if (!dailyModule) {
      return res.status(404).json({ message: '每日测评模块未配置' })
    }

    // 获取用户年级
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { grade: true }
    })

    const userGrade = profile?.grade

    // 提取年级段（小学/初中/高中）用于匹配
    const gradeLevel = userGrade?.includes('小学') ? '小学' :
                       userGrade?.includes('初中') ? '初中' :
                       userGrade?.includes('高中') ? '高中' : null

    // 获取匹配年级的题目（随机抽取5道）
    const allQuestions = await prisma.assessmentQuestion.findMany({
      where: {
        moduleId: dailyModule.id,
        OR: [
          { targetGrade: null },
          { targetGrade: gradeLevel ? { contains: gradeLevel } : undefined }
        ]
      },
      select: {
        id: true,
        content: true,
        options: true,
        questionType: true
      }
    })

    // 随机抽取5道题
    const shuffled = allQuestions.sort(() => 0.5 - Math.random())
    const selectedQuestions = shuffled.slice(0, 5)

    // 创建每日测评记录
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        userId,
        moduleId: dailyModule.id,
        isDaily: true
      }
    })

    res.json({
      attemptId: attempt.id,
      module: {
        id: dailyModule.id,
        name: dailyModule.name
      },
      questions: selectedQuestions
    })
  } catch (error) {
    console.error('获取每日测评题目失败:', error)
    res.status(500).json({ message: '获取每日测评题目失败' })
  }
})

// ==================== 内部函数：更新用户画像 ====================
async function updateAssessmentProfile(userId: string) {
  try {
    // 获取用户所有已完成的测评
    const attempts = await prisma.assessmentAttempt.findMany({
      where: {
        userId,
        completedAt: { not: null }
      },
      include: {
        module: true,
        answers: {
          include: {
            question: true
          }
        }
      }
    })

    // 暂时使用简单规则汇总，后续会接入大模型分析
    const traitsJson: any = {}
    const learningStyleJson: any = {}
    const difficultyLevelJson: any = {}
    const dailyProgressJson: any[] = []

    for (const attempt of attempts) {
      if (attempt.module.type === 'personality') {
        // 性格测评结果（暂存原始数据）
        traitsJson.personality = attempt.resultJson
      } else if (attempt.module.type === 'talent') {
        // 天赋测评结果
        traitsJson.talent = attempt.resultJson
      } else if (attempt.module.type === 'cognition') {
        // 数理逻辑测评结果
        traitsJson.cognition = attempt.resultJson
      } else if (attempt.module.type === 'knowledge') {
        // 知识点测评结果
        if (attempt.isDaily) {
          // 每日测评：记录进度
          dailyProgressJson.push({
            date: attempt.completedAt?.toISOString().split('T')[0],
            score: attempt.score
          })
        } else {
          // 综合知识测评：记录水平
          difficultyLevelJson.overall = attempt.score
        }
      }
    }

    // 更新或创建用户画像
    await prisma.assessmentProfile.upsert({
      where: { userId },
      update: {
        traitsJson,
        learningStyleJson,
        difficultyLevelJson,
        dailyProgressJson,
        lastUpdated: new Date()
      },
      create: {
        userId,
        traitsJson,
        learningStyleJson,
        difficultyLevelJson,
        dailyProgressJson
      }
    })

    console.log(`用户 ${userId} 的画像已更新`)
  } catch (error) {
    console.error('更新用户画像失败:', error)
    // 不阻塞主流程
  }
}

// ==================== 8. 获取测评摘要 ====================
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    if (!userId) {
      return res.status(401).json({ message: '未授权' })
    }

    const { generateAssessmentSummary } = await import('../services/assessmentSummary')
    const summary = await generateAssessmentSummary(userId)

    res.json(summary)
  } catch (error) {
    console.error('获取测评摘要失败:', error)
    res.status(500).json({ message: '获取测评摘要失败' })
  }
})

export default router
