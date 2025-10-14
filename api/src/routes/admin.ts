import express from 'express'
import { prisma } from '../index'
import { syncAllToFeishu } from '../services/feishuSync'

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
          },
          sessions: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ])

    res.json({
      data: users.map(user => {
        const totalActiveDuration = user.sessions.reduce((sum, session) => sum + session.duration, 0)
        return {
          id: user.id,
          name: user.profile?.name || '-',
          email: user.email,
          phone: user.profile?.phone,
          age: user.profile?.age,
          grade: user.profile?.grade,
          conversationCount: user.conversations.length,
          sessionCount: user.sessions.length,
          totalActiveDuration, // 总活跃时长（秒）
          createdAt: user.createdAt
        }
      }),
      total
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({ message: '获取用户列表失败' })
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
        },
        sessions: {
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    const messageCount = await prisma.message.count({
      where: {
        conversation: {
          userId: id
        }
      }
    })

    // 计算总活跃时长（秒）
    const totalActiveDuration = user.sessions.reduce((sum, session) => sum + session.duration, 0)

    // 计算会话次数
    const sessionCount = user.sessions.length

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

// 导出用户数据
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
            select: { id: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.conversation.count({ where })
    ])

    res.json({
      data: conversations.map(conv => ({
        id: conv.id,
        userName: conv.user.profile?.name || conv.user.email,
        title: conv.title,
        messageCount: conv.messages.length,
        hasInstructions: !!conv.customInstructions,
        hasKnowledgeBase: false, // 需要从消息中检查
        createdAt: conv.createdAt
      })),
      total
    })
  } catch (error) {
    console.error('获取对话列表失败:', error)
    res.status(500).json({ message: '获取对话列表失败' })
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

    res.json({
      id: conversation.id,
      userName: conversation.user.profile?.name || conversation.user.email,
      title: conversation.title,
      customInstructions: conversation.customInstructions,
      messageCount: conversation.messages.length,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        imageUrl: msg.imageOssKey,
        createdAt: msg.createdAt
      }))
    })
  } catch (error) {
    console.error('获取对话详情失败:', error)
    res.status(500).json({ message: '获取对话详情失败' })
  }
})

// 导出对话数据
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
          select: { id: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      data: conversations.map(conv => ({
        userName: conv.user.profile?.name || conv.user.email,
        title: conv.title,
        messageCount: conv.messages.length,
        hasInstructions: !!conv.customInstructions,
        hasKnowledgeBase: false,
        createdAt: conv.createdAt
      }))
    })
  } catch (error) {
    console.error('导出对话数据失败:', error)
    res.status(500).json({ message: '导出对话数据失败' })
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
