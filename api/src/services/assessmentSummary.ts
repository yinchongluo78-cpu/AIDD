import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 生成用户测评摘要JSON
 * 汇总所有测评数据，生成结构化的学生画像
 */
export async function generateAssessmentSummary(userId: string) {
  try {
    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    // 获取所有已完成的测评记录
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
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    // 初始化摘要结构
    const summary: any = {
      userId: user.id,
      userInfo: {
        name: user.profile?.name || user.email.split('@')[0],
        age: user.profile?.age,
        grade: user.profile?.grade,
        email: user.email
      },
      assessmentStatus: {
        totalCompleted: attempts.length,
        lastAssessmentDate: attempts[0]?.completedAt || null,
        completedModules: [] as string[]
      },
      personality: null,
      cognition: null,
      talent: null,
      knowledge: null,
      dailyProgress: [],
      summary: '', // AI生成的综合评价（后续添加）
      recommendations: [] as string[], // 学习建议（后续添加）
      generatedAt: new Date()
    }

    // 按模块类型分类处理测评结果
    for (const attempt of attempts) {
      const moduleType = attempt.module.type
      const moduleName = attempt.module.name

      // 记录已完成的模块
      if (!summary.assessmentStatus.completedModules.includes(moduleName)) {
        summary.assessmentStatus.completedModules.push(moduleName)
      }

      if (moduleType === 'personality') {
        // 性格测评结果分析
        summary.personality = analyzePersonality(attempt)
      } else if (moduleType === 'cognition') {
        // 数理逻辑测评结果分析
        summary.cognition = analyzeCognition(attempt)
      } else if (moduleType === 'talent') {
        // 天赋测评结果分析
        summary.talent = analyzeTalent(attempt)
      } else if (moduleType === 'knowledge') {
        if (attempt.isDaily) {
          // 每日测评进度
          summary.dailyProgress.push({
            date: attempt.completedAt?.toISOString().split('T')[0],
            score: attempt.score,
            correctCount: (attempt.resultJson as any)?.correctCount || 0,
            totalCount: (attempt.resultJson as any)?.totalCount || 0
          })
        } else {
          // 知识点掌握测评
          summary.knowledge = analyzeKnowledge(attempt)
        }
      }
    }

    // 计算每日测评平均分
    if (summary.dailyProgress.length > 0) {
      const avgScore = summary.dailyProgress.reduce((sum: number, p: any) => sum + (p.score || 0), 0) / summary.dailyProgress.length
      summary.dailyProgress = {
        totalDays: summary.dailyProgress.length,
        averageScore: Math.round(avgScore * 10) / 10,
        recentTests: summary.dailyProgress.slice(0, 7) // 最近7天
      }
    } else {
      summary.dailyProgress = {
        totalDays: 0,
        averageScore: 0,
        recentTests: []
      }
    }

    return summary
  } catch (error) {
    console.error('生成测评摘要失败:', error)
    throw error
  }
}

/**
 * 分析性格测评结果
 */
function analyzePersonality(attempt: any) {
  const answers = attempt.answers
  const resultJson = attempt.resultJson as any

  // 统计各个维度的答案分布
  const dimensions = {
    extroversion: 0, // 外向性
    conscientiousness: 0, // 责任心
    emotionalStability: 0, // 情绪稳定性
    creativity: 0, // 创造力
    cooperation: 0 // 合作性
  }

  // 简单规则：A选项偏外向/主动，D选项偏内向/被动
  // 实际应用中需要根据具体题目设计更精确的算法
  answers.forEach((ans: any) => {
    const answer = ans.answer as any
    const key = answer.key || answer.keys?.[0]

    // 这里是简化的计分逻辑，实际需要根据题目内容细化
    if (key === 'A') {
      dimensions.extroversion += 2
      dimensions.creativity += 1
    } else if (key === 'B') {
      dimensions.extroversion += 1
      dimensions.cooperation += 1
    } else if (key === 'C') {
      dimensions.conscientiousness += 1
      dimensions.emotionalStability += 1
    } else if (key === 'D') {
      dimensions.emotionalStability += 2
      dimensions.conscientiousness += 1
    }
  })

  // 计算各维度百分比
  const total = Object.values(dimensions).reduce((sum, val) => sum + val, 0)
  const result: any = {}
  for (const [key, value] of Object.entries(dimensions)) {
    result[key] = total > 0 ? Math.round((value / total) * 100) : 0
  }

  return {
    completedAt: attempt.completedAt,
    dimensions: result,
    mainTraits: getMainTraits(result),
    description: generatePersonalityDescription(result)
  }
}

/**
 * 分析数理逻辑测评结果
 */
function analyzeCognition(attempt: any) {
  const score = attempt.score || 0
  const resultJson = attempt.resultJson as any

  let level = '待提升'
  if (score >= 80) level = '优秀'
  else if (score >= 60) level = '良好'
  else if (score >= 40) level = '中等'

  return {
    completedAt: attempt.completedAt,
    score: Math.round(score),
    level,
    correctCount: resultJson?.correctCount || 0,
    totalCount: resultJson?.totalCount || 0,
    strengths: [], // 后续可以根据具体题目类型分析
    weaknesses: []
  }
}

/**
 * 分析天赋测评结果
 */
function analyzeTalent(attempt: any) {
  const answers = attempt.answers

  // 统计天赋倾向（艺术、科学、运动、社交等）
  const talents = {
    artistic: 0,
    scientific: 0,
    athletic: 0,
    social: 0,
    linguistic: 0,
    logical: 0
  }

  // 简化的分析逻辑
  answers.forEach((ans: any, index: number) => {
    const answer = ans.answer as any
    const score = answer.score || (answer.key === 'A' ? 3 : answer.key === 'B' ? 2 : 1)

    // 根据题目位置分配到不同天赋类别（简化处理）
    const category = index % 6
    const keys = Object.keys(talents)
    if (keys[category]) {
      (talents as any)[keys[category]] += score
    }
  })

  // 找出得分最高的天赋
  const sortedTalents = Object.entries(talents)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return {
    completedAt: attempt.completedAt,
    topTalents: sortedTalents.map(([name, score]) => ({
      name: translateTalent(name),
      score: Math.round((score / answers.length) * 20) // 转换为20分制
    })),
    allScores: talents
  }
}

/**
 * 分析知识点掌握测评结果
 */
function analyzeKnowledge(attempt: any) {
  const score = attempt.score || 0
  const resultJson = attempt.resultJson as any

  let level = '基础'
  if (score >= 90) level = '精通'
  else if (score >= 75) level = '熟练'
  else if (score >= 60) level = '掌握'

  return {
    completedAt: attempt.completedAt,
    overallScore: Math.round(score),
    level,
    correctCount: resultJson?.correctCount || 0,
    totalCount: resultJson?.totalCount || 0,
    accuracy: resultJson?.accuracy || 0,
    weakTopics: [], // 后续可以细化到具体知识点
    strongTopics: []
  }
}

/**
 * 获取主要性格特征
 */
function getMainTraits(dimensions: any): string[] {
  const traits = []

  if (dimensions.extroversion > 60) traits.push('外向活泼')
  else if (dimensions.extroversion < 40) traits.push('内向沉稳')

  if (dimensions.conscientiousness > 60) traits.push('认真负责')
  if (dimensions.creativity > 60) traits.push('富有创造力')
  if (dimensions.cooperation > 60) traits.push('善于合作')
  if (dimensions.emotionalStability > 60) traits.push('情绪稳定')

  return traits.length > 0 ? traits : ['性格均衡']
}

/**
 * 生成性格描述
 */
function generatePersonalityDescription(dimensions: any): string {
  const traits = getMainTraits(dimensions)
  return `该学生${traits.join('、')}，适合${traits.includes('外向活泼') ? '团队协作和交流型' : '独立思考型'}的学习方式。`
}

/**
 * 翻译天赋类别
 */
function translateTalent(talent: string): string {
  const map: any = {
    artistic: '艺术创作',
    scientific: '科学探索',
    athletic: '运动竞技',
    social: '人际交往',
    linguistic: '语言表达',
    logical: '逻辑思维'
  }
  return map[talent] || talent
}

/**
 * 获取用户测评摘要（带缓存）
 */
export async function getUserAssessmentSummary(userId: string) {
  // 先尝试从 assessmentProfile 获取
  const profile = await prisma.assessmentProfile.findUnique({
    where: { userId }
  })

  // 如果profile存在且最近更新（24小时内），直接返回
  if (profile && profile.lastUpdated) {
    const hoursSinceUpdate = (Date.now() - profile.lastUpdated.getTime()) / (1000 * 60 * 60)
    if (hoursSinceUpdate < 24) {
      // 返回缓存的摘要
      return {
        ...profile.traitsJson,
        dailyProgress: profile.dailyProgressJson,
        learningStyle: profile.learningStyleJson,
        difficultyLevel: profile.difficultyLevelJson
      }
    }
  }

  // 否则重新生成
  return await generateAssessmentSummary(userId)
}
