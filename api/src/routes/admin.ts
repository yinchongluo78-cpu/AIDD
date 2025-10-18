import express from 'express'
import { prisma } from '../index'
import { syncAllToFeishu } from '../services/feishuSync'
import OSS from 'ali-oss'

const router = express.Router()

// 概览统计
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalConversations, totalMessages, totalDocuments] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.kbDocument.count()
    ])

    res.json({
      totalUsers,
      totalConversations,
      totalMessages,
      totalDocuments
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    res.status(500).json({ message: '获取统计数据失败' })
  }
})

// 趋势数据（最近30天）
router.get('/trends', async (req, res) => {
  try {
    const days = Number(req.query.days) || 30
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // 获取所有用户、对话和会话数据
    const [allUsers, conversations, sessions] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }),
      prisma.conversation.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        select: {
          userId: true,
          createdAt: true
        }
      }),
      ((prisma as any).userSession ? (prisma as any).userSession.findMany({
        where: {
          startTime: {
            gte: startDate
          }
        },
        select: {
          userId: true,
          startTime: true,
          duration: true
        }
      }) : Promise.resolve([])) as Promise<any[]>
    ])

    // 初始化日期数组
    const dates: string[] = []
    const cumulativeUsers: number[] = []
    const activeUsers: number[] = []
    const conversationCounts: number[] = []
    const activeDurations: number[] = []

    // 生成最近N天的日期
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dates.push(dateStr)
    }

    // 计算每天的数据
    dates.forEach((dateStr, index) => {
      const date = new Date(dateStr)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)

      // 1. 累计用户数 - 截至当天的总用户数
      const cumulativeCount = allUsers.filter(user =>
        new Date(user.createdAt) <= nextDate
      ).length
      cumulativeUsers.push(cumulativeCount)

      // 2. 活跃用户数 - 当天有对话的用户数
      const activeUserIds = new Set(
        conversations
          .filter(conv => {
            const convDate = new Date(conv.createdAt)
            return convDate >= date && convDate < nextDate
          })
          .map(conv => conv.userId)
      )
      activeUsers.push(activeUserIds.size)

      // 3. 对话数 - 当天创建的对话数
      const dailyConversations = conversations.filter(conv => {
        const convDate = new Date(conv.createdAt)
        return convDate >= date && convDate < nextDate
      }).length
      conversationCounts.push(dailyConversations)

      // 4. 用户在线时长 - 当天所有会话的总时长（秒）
      const dailyDuration = sessions
        .filter(session => {
          const sessionDate = new Date(session.startTime)
          return sessionDate >= date && sessionDate < nextDate
        })
        .reduce((sum, session) => sum + session.duration, 0)
      activeDurations.push(dailyDuration)
    })

    res.json({
      dates,
      cumulativeUsers,
      activeUsers,
      conversationCounts,
      activeDurations
    })
  } catch (error) {
    console.error('获取趋势数据失败:', error)
    res.status(500).json({ message: '获取趋势数据失败' })
  }
})

// 最近活跃用户
router.get('/recent-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        profile: true
      }
    })

    res.json(users.map(user => ({
      id: user.id,
      name: user.profile?.name || user.email,
      email: user.email,
      lastActive: user.createdAt
    })))
  } catch (error) {
    console.error('获取最近用户失败:', error)
    res.status(500).json({ message: '获取最近用户失败' })
  }
})

// 最近对话
router.get('/recent-conversations', async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    res.json(conversations.map(conv => ({
      id: conv.id,
      userName: conv.user.profile?.name || conv.user.email,
      title: conv.title,
      createdAt: conv.createdAt
    })))
  } catch (error) {
    console.error('获取最近对话失败:', error)
    res.status(500).json({ message: '获取最近对话失败' })
  }
})

// 用户列表
router.get('/users', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search = '' } = req.query

    const where = search
      ? {
          OR: [
            { email: { contains: search as string, mode: 'insensitive' as any } },
            { profile: { name: { contains: search as string, mode: 'insensitive' as any } } }
          ]
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: {
          profile: true,
          conversations: {
            select: { id: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ])

    // 获取每个用户的会话数据
    const usersWithSessions = await Promise.all(
      users.map(async (user) => {
        const sessions = await ((prisma as any).userSession ? (prisma as any).userSession.findMany({
          where: { userId: user.id }
        }) : Promise.resolve([]))

        const sessionCount = sessions.length
        const totalActiveDuration = sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)

        return {
          id: user.id,
          name: user.profile?.name || '-',
          email: user.email,
          phone: user.profile?.phone,
          age: user.profile?.age,
          grade: user.profile?.grade,
          conversationCount: user.conversations.length,
          sessionCount,
          totalActiveDuration, // 总活跃时长（秒）
          createdAt: user.createdAt
        }
      })
    )

    res.json({
      data: usersWithSessions,
      total
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({ message: '获取用户列表失败' })
  }
})

// 导出用户数据 (必须在 :id 动态路由之前)
router.get('/users/export', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        conversations: {
          select: { id: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      data: users.map(user => ({
        name: user.profile?.name || '-',
        email: user.email,
        phone: user.profile?.phone,
        age: user.profile?.age,
        grade: user.profile?.grade,
        conversationCount: user.conversations.length,
        createdAt: user.createdAt
      }))
    })
  } catch (error) {
    console.error('导出用户数据失败:', error)
    res.status(500).json({ message: '导出用户数据失败' })
  }
})

// 用户详情
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        conversations: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            messages: {
              select: { id: true }
            }
          }
        },
        documents: {
          select: { id: true }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    const [messageCount, sessions] = await Promise.all([
      prisma.message.count({
        where: {
          conversation: {
            userId: id
          }
        }
      }),
      ((prisma as any).userSession ? (prisma as any).userSession.findMany({
        where: { userId: id }
      }) : Promise.resolve([]))
    ])

    const sessionCount = sessions.length
    const totalActiveDuration = sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)

    res.json({
      id: user.id,
      name: user.profile?.name || '-',
      email: user.email,
      phone: user.profile?.phone,
      age: user.profile?.age,
      grade: user.profile?.grade,
      conversationCount: user.conversations.length,
      messageCount,
      documentCount: user.documents.length,
      sessionCount,
      totalActiveDuration, // 总活跃时长（秒）
      createdAt: user.createdAt,
      recentConversations: user.conversations.map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messages.length,
        createdAt: conv.createdAt
      }))
    })
  } catch (error) {
    console.error('获取用户详情失败:', error)
    res.status(500).json({ message: '获取用户详情失败' })
  }
})

// 对话列表
router.get('/conversations', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search = '' } = req.query

    const where = search
      ? {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' as any } },
            { user: {
              OR: [
                { email: { contains: search as string, mode: 'insensitive' as any } },
                { profile: { name: { contains: search as string, mode: 'insensitive' as any } } }
              ]
            }}
          ]
        }
      : {}

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: {
          user: {
            include: {
              profile: true
            }
          },
          messages: {
            select: {
              id: true,
              citations: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.conversation.count({ where })
    ])

    res.json({
      data: conversations.map(conv => {
        // 检查是否有任何消息包含 citations（知识库引用）
        const hasKnowledgeBase = conv.messages.some(msg => {
          const citations = msg.citations as any

          // null 或 undefined 直接返回 false
          if (citations === null || citations === undefined) return false

          // 如果是字符串，尝试解析
          if (typeof citations === 'string') {
            try {
              const parsed = JSON.parse(citations)
              return Array.isArray(parsed) && parsed.length > 0
            } catch {
              return false
            }
          }

          // 如果已经是数组
          if (Array.isArray(citations)) {
            return citations.length > 0
          }

          return false
        })

        return {
          id: conv.id,
          userName: conv.user.profile?.name || conv.user.email,
          title: conv.title,
          messageCount: conv.messages.length,
          hasInstructions: !!conv.customInstructions,
          hasKnowledgeBase,
          createdAt: conv.createdAt
        }
      }),
      total
    })
  } catch (error) {
    console.error('获取对话列表失败:', error)
    res.status(500).json({ message: '获取对话列表失败' })
  }
})

// 导出对话数据 (必须在 :id 动态路由之前)
router.get('/conversations/export', async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        user: {
          include: {
            profile: true
          }
        },
        messages: {
          select: {
            id: true,
            citations: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      data: conversations.map(conv => {
        // 检查是否有任何消息包含 citations（知识库引用）
        const hasKnowledgeBase = conv.messages.some(msg => {
          const citations = msg.citations as any

          // null 或 undefined 直接返回 false
          if (citations === null || citations === undefined) return false

          // 如果是字符串，尝试解析
          if (typeof citations === 'string') {
            try {
              const parsed = JSON.parse(citations)
              return Array.isArray(parsed) && parsed.length > 0
            } catch {
              return false
            }
          }

          // 如果已经是数组
          if (Array.isArray(citations)) {
            return citations.length > 0
          }

          return false
        })

        return {
          userName: conv.user.profile?.name || conv.user.email,
          title: conv.title,
          messageCount: conv.messages.length,
          hasInstructions: !!conv.customInstructions,
          hasKnowledgeBase,
          createdAt: conv.createdAt
        }
      })
    })
  } catch (error) {
    console.error('导出对话数据失败:', error)
    res.status(500).json({ message: '导出对话数据失败' })
  }
})

// 对话详情
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ message: '对话不存在' })
    }

    // 创建OSS客户端
    const ossClient = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!
    })

    // 为每个有图片的消息生成预签名URL
    const messagesWithImages = await Promise.all(
      conversation.messages.map(async (msg) => {
        let imageUrl = null
        if (msg.imageOssKey) {
          try {
            // 生成预签名URL，有效期1小时
            imageUrl = ossClient.signatureUrl(msg.imageOssKey, { expires: 3600 })
          } catch (error) {
            console.error('生成图片URL失败:', error)
          }
        }
        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          imageUrl,
          createdAt: msg.createdAt
        }
      })
    )

    res.json({
      id: conversation.id,
      userName: conversation.user.profile?.name || conversation.user.email,
      title: conversation.title,
      customInstructions: conversation.customInstructions,
      messageCount: conversation.messages.length,
      createdAt: conversation.createdAt,
      messages: messagesWithImages
    })
  } catch (error) {
    console.error('获取对话详情失败:', error)
    res.status(500).json({ message: '获取对话详情失败' })
  }
})

// 知识库统计
router.get('/knowledge-base/stats', async (req, res) => {
  try {
    const [totalDocuments, totalCategories, totalChunks] = await Promise.all([
      prisma.kbDocument.count(),
      prisma.kbCategory.count(),
      prisma.kbChunk.count()
    ])

    res.json({
      totalDocuments,
      totalCategories,
      totalChunks
    })
  } catch (error) {
    console.error('获取知识库统计失败:', error)
    res.status(500).json({ message: '获取知识库统计失败' })
  }
})

// 知识库文档列表
router.get('/knowledge-base/documents', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query

    const [documents, total] = await Promise.all([
      prisma.kbDocument.findMany({
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: {
          user: {
            include: {
              profile: true
            }
          },
          category: true,
          chunks: {
            select: { id: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.kbDocument.count()
    ])

    res.json({
      data: documents.map(doc => ({
        id: doc.id,
        userName: doc.user.profile?.name || doc.user.email,
        fileName: doc.filename,
        categoryName: doc.category.name,
        chunkCount: doc.chunks.length,
        createdAt: doc.createdAt
      })),
      total
    })
  } catch (error) {
    console.error('获取知识库文档失败:', error)
    res.status(500).json({ message: '获取知识库文档失败' })
  }
})

// 知识库分类列表
router.get('/knowledge-base/categories', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query

    const [categories, total] = await Promise.all([
      prisma.kbCategory.findMany({
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: {
          user: {
            include: {
              profile: true
            }
          },
          documents: {
            select: { id: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.kbCategory.count()
    ])

    res.json({
      data: categories.map(cat => ({
        id: cat.id,
        userName: cat.user.profile?.name || cat.user.email,
        name: cat.name,
        documentCount: cat.documents.length,
        createdAt: cat.createdAt
      })),
      total
    })
  } catch (error) {
    console.error('获取知识库分类失败:', error)
    res.status(500).json({ message: '获取知识库分类失败' })
  }
})

// 知识库使用情况
router.get('/knowledge-base/usage', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        categories: {
          select: { id: true }
        },
        documents: {
          select: {
            id: true,
            fileSize: true,
            createdAt: true
          }
        }
      }
    })

    const usageData = await Promise.all(
      users.map(async user => {
        const chunkCount = await prisma.kbChunk.count({
          where: {
            document: {
              userId: user.id
            }
          }
        })

        const totalSize = user.documents.reduce((sum: number, doc: any) => sum + Number(doc.fileSize || 0), 0)
        const lastUpload = user.documents.length > 0
          ? user.documents.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
          : null

        return {
          id: user.id,
          userName: user.profile?.name || user.email,
          categoryCount: user.categories.length,
          documentCount: user.documents.length,
          chunkCount,
          totalSize,
          lastUploadAt: lastUpload
        }
      })
    )

    res.json({
      data: usageData.filter(u => u.documentCount > 0)
    })
  } catch (error) {
    console.error('获取知识库使用情况失败:', error)
    res.status(500).json({ message: '获取知识库使用情况失败' })
  }
})

// 下载文档
router.get('/knowledge-base/documents/:id/download', async (req, res) => {
  try {
    const { id } = req.params

    const document = await prisma.kbDocument.findUnique({
      where: { id },
      select: {
        ossKey: true,
        filename: true,
        fileExt: true
      }
    })

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    if (!document.ossKey) {
      return res.status(404).json({ message: '文档文件不存在' })
    }

    // 创建OSS客户端
    const ossClient = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!
    })

    // 生成预签名下载 URL，有效期 1 小时
    // 注意：OSS不允许覆盖content-type，只设置content-disposition来触发下载
    const url = ossClient.signatureUrl(document.ossKey, {
      expires: 3600
    } as any)

    res.json({ url })
  } catch (error: any) {
    console.error('生成下载链接失败:', error)
    res.status(500).json({ message: '生成下载链接失败', error: error.message })
  }
})

// 获取文档详情和内容
router.get('/knowledge-base/documents/:id', async (req, res) => {
  try {
    const { id } = req.params

    const document = await prisma.kbDocument.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        category: true,
        chunks: {
          orderBy: {
            seq: 'asc'
          }
        }
      }
    })

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    res.json({
      id: document.id,
      fileName: document.filename,
      fileSize: Number(document.fileSize),
      mimeType: (document as any).mimeType || null,
      status: document.status,
      userName: document.user.profile?.name || document.user.email,
      categoryName: document.category.name,
      createdAt: document.createdAt,
      chunks: document.chunks.map(chunk => ({
        id: chunk.id,
        index: chunk.seq,
        content: chunk.content
      }))
    })
  } catch (error: any) {
    console.error('获取文档详情失败:', error)
    console.error('错误详情:', error.message, error.stack)
    res.status(500).json({ message: '获取文档详情失败', error: error.message })
  }
})

// 系统统计
router.get('/system/stats', async (req, res) => {
  try {
    const [userCount, conversationCount, messageCount, chunkCount] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.kbChunk.count()
    ])

    // 这些数据需要根据实际日志系统来实现
    // 这里提供模拟数据
    const deepseekCalls = messageCount * 2 // 估算
    const ocrCalls = Math.floor(messageCount * 0.3) // 估算 30% 的消息使用了图片

    res.json({
      deepseekCalls,
      ocrCalls,
      ossStorage: 0, // 需要从 OSS API 获取
      totalFiles: 0, // 需要从 OSS API 获取
      deepseekCost: deepseekCalls * 0.0014, // DeepSeek 价格估算
      ocrCost: ocrCalls * 0.001, // OCR 价格估算
      ossCost: 0, // OSS 成本估算
      userCount,
      conversationCount,
      messageCount,
      chunkCount
    })
  } catch (error) {
    console.error('获取系统统计失败:', error)
    res.status(500).json({ message: '获取系统统计失败' })
  }
})

// API 调用日志（模拟数据）
router.get('/system/api-logs', async (req, res) => {
  try {
    const { limit = 20 } = req.query

    // 从消息表获取最近的 API 调用
    const messages = await prisma.message.findMany({
      take: Number(limit),
      where: {
        role: 'assistant'
      },
      include: {
        conversation: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      data: messages.map(msg => ({
        id: msg.id,
        type: 'deepseek',
        userName: msg.conversation.user.profile?.name || msg.conversation.user.email,
        model: 'deepseek-chat',
        tokens: msg.content.length, // 粗略估算
        cost: msg.content.length * 0.000001,
        duration: Math.floor(Math.random() * 2000) + 500, // 模拟
        createdAt: msg.createdAt
      }))
    })
  } catch (error) {
    console.error('获取 API 日志失败:', error)
    res.status(500).json({ message: '获取 API 日志失败' })
  }
})

// ========== 飞书同步接口 ==========

// 手动触发飞书同步
router.post('/feishu/sync', async (req, res) => {
  try {
    console.log('收到飞书同步请求')
    const result = await syncAllToFeishu()

    if (result.success) {
      res.json({ message: result.message })
    } else {
      res.status(500).json({ message: result.message })
    }
  } catch (error: any) {
    console.error('飞书同步失败:', error)
    res.status(500).json({ message: error.message || '飞书同步失败' })
  }
})

// 获取飞书同步配置状态
router.get('/feishu/status', async (req, res) => {
  try {
    const configured = !!(
      process.env.FEISHU_APP_ID &&
      process.env.FEISHU_APP_SECRET &&
      process.env.FEISHU_TABLE_APP_TOKEN &&
      process.env.FEISHU_USER_TABLE_ID
    )

    res.json({
      configured,
      config: {
        hasAppId: !!process.env.FEISHU_APP_ID,
        hasAppSecret: !!process.env.FEISHU_APP_SECRET,
        hasTableAppToken: !!process.env.FEISHU_TABLE_APP_TOKEN,
        hasUserTableId: !!process.env.FEISHU_USER_TABLE_ID,
        hasDailyStatsTableId: !!process.env.FEISHU_DAILY_STATS_TABLE_ID
      }
    })
  } catch (error) {
    console.error('获取飞书配置状态失败:', error)
    res.status(500).json({ message: '获取飞书配置状态失败' })
  }
})

export default router
