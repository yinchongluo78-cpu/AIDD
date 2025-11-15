import express from 'express'
import { prisma } from '../index'
import { syncAllToFeishu } from '../services/feishuSync'
import { generateAssessmentSummary } from '../services/assessmentSummary'
import OSS from 'ali-oss'

const router = express.Router()

// 概览统计
router.get('/stats', async (req, res) => {
  try {
    // 获取基础统计数据
    const [totalUsers, totalConversations, totalMessages, totalDocuments] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.kbDocument.count()
    ])

    // 获取趋势数据（最近30天）
    const days = 30
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

    // 生成最近30天的日期
    const userTrend: { date: string; count: number }[] = []
    const activeUserTrend: { date: string; count: number }[] = []
    const conversationTrend: { date: string; count: number }[] = []
    const durationTrend: { date: string; hours: number }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      // 1. 累计用户数 - 截至当天的总用户数
      const cumulativeCount = allUsers.filter(user =>
        new Date(user.createdAt) <= nextDate
      ).length
      userTrend.push({ date: dateStr, count: cumulativeCount })

      // 2. 活跃用户数 - 当天有对话的用户数
      const activeUserIds = new Set(
        conversations
          .filter(conv => {
            const convDate = new Date(conv.createdAt)
            return convDate >= date && convDate < nextDate
          })
          .map(conv => conv.userId)
      )
      activeUserTrend.push({ date: dateStr, count: activeUserIds.size })

      // 3. 对话数 - 当天创建的对话数
      const dailyConversations = conversations.filter(conv => {
        const convDate = new Date(conv.createdAt)
        return convDate >= date && convDate < nextDate
      }).length
      conversationTrend.push({ date: dateStr, count: dailyConversations })

      // 4. 用户在线时长 - 当天所有会话的总时长（秒）
      const dailyDuration = sessions
        .filter(session => {
          const sessionDate = new Date(session.startTime)
          return sessionDate >= date && sessionDate < nextDate
        })
        .reduce((sum, session) => sum + session.duration, 0)
      durationTrend.push({ date: dateStr, hours: dailyDuration })
    }

    res.json({
      totalUsers,
      totalConversations,
      totalMessages,
      totalDocuments,
      userTrend,
      activeUserTrend,
      conversationTrend,
      durationTrend
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

    // 从完整URL中提取文件路径
    let objectKey = document.ossKey
    if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
      const url = new URL(objectKey)
      objectKey = url.pathname.substring(1)
    }

    // 根据文件扩展名获取 MIME 类型
    const getMimeType = (ext: string): string => {
      const mimeTypes: { [key: string]: string } = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      }
      return mimeTypes[ext.toLowerCase()] || 'application/octet-stream'
    }

    // 创建OSS客户端
    const ossClient = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!
    })

    // 从 OSS 获取文件流
    const result = await ossClient.get(objectKey)

    // 设置响应头
    const mimeType = getMimeType(document.fileExt)
    const filename = `${document.filename}.${document.fileExt}`

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', result.res.headers['content-length'] || '')

    // 发送文件内容
    res.send(result.content)
  } catch (error: any) {
    console.error('下载文件失败:', error)
    res.status(500).json({ message: '下载文件失败', error: error.message })
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

// ==================== 系统提示词管理 ====================

// 获取学生的系统提示词（自动生成 + 自定义）
router.get('/users/:id/system-prompt', async (req, res) => {
  try {
    const { id: userId } = req.params

    // 获取用户信息和自定义提示词
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 生成基于测评的自动提示词
    let autoGeneratedPrompt = ''
    let assessmentContext = ''
    try {
      const summary = await generateAssessmentSummary(userId)
      assessmentContext = buildAssessmentContextForAdmin(summary)
      autoGeneratedPrompt = buildFullSystemPrompt(assessmentContext)
    } catch (error) {
      console.log('该用户暂无测评数据')
      autoGeneratedPrompt = buildFullSystemPrompt('')
    }

    // 获取自定义提示词
    const customPrompt = user.profile?.customSystemPrompt || null

    // 返回结果
    res.json({
      userId: user.id,
      userName: user.profile?.name || user.email.split('@')[0],
      userEmail: user.email,
      assessmentContext, // 测评上下文（学生画像部分）
      autoGeneratedPrompt, // 完整的自动生成提示词
      customPrompt, // 管理员自定义的提示词
      activePrompt: customPrompt || autoGeneratedPrompt // 实际使用的提示词
    })
  } catch (error) {
    console.error('获取系统提示词失败:', error)
    res.status(500).json({ message: '获取系统提示词失败' })
  }
})

// 更新学生的自定义系统提示词
router.put('/users/:id/system-prompt', async (req, res) => {
  try {
    const { id: userId } = req.params
    const { customPrompt } = req.body

    // 验证用户存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 更新或创建 Profile，设置自定义提示词
    await prisma.profile.upsert({
      where: { userId },
      update: {
        customSystemPrompt: customPrompt || null,
        updatedAt: new Date()
      },
      create: {
        userId,
        customSystemPrompt: customPrompt || null
      }
    })

    console.log(`用户 ${userId} 的自定义系统提示词已更新`)
    res.json({
      success: true,
      message: '系统提示词已更新',
      customPrompt: customPrompt || null
    })
  } catch (error) {
    console.error('更新系统提示词失败:', error)
    res.status(500).json({ message: '更新系统提示词失败' })
  }
})

// ==================== 辅助函数 ====================

/**
 * 根据用户测评摘要构建个性化教学上下文（用于管理后台展示）
 */
function buildAssessmentContextForAdmin(summary: any): string {
  if (!summary || summary.assessmentStatus.totalCompleted === 0) {
    return '该学生尚未完成任何测评'
  }

  const parts: string[] = []
  parts.push('【学生画像】')

  // 基本信息
  if (summary.userInfo) {
    const info = summary.userInfo
    parts.push(`学生姓名：${info.name}，年级：${info.grade || '未设置'}，年龄：${info.age || '未设置'}岁`)
  }

  // 性格特征
  if (summary.personality) {
    const traits = summary.personality.mainTraits || []
    if (traits.length > 0) {
      parts.push(`\n**性格特点：** ${traits.join('、')}`)
      if (summary.personality.description) {
        parts.push(`${summary.personality.description}`)
      }
    }
  }

  // 认知能力
  if (summary.cognition) {
    parts.push(`\n**数理逻辑能力：** ${summary.cognition.level}（得分：${summary.cognition.score}分）`)
  }

  // 天赋倾向
  if (summary.talent && summary.talent.topTalents && summary.talent.topTalents.length > 0) {
    const talents = summary.talent.topTalents.map((t: any) => t.name).join('、')
    parts.push(`\n**天赋优势：** ${talents}`)
  }

  // 知识掌握
  if (summary.knowledge) {
    parts.push(`\n**知识掌握水平：** ${summary.knowledge.level}（正确率：${summary.knowledge.accuracy.toFixed(1)}%）`)
  }

  // 每日测评表现
  if (summary.dailyProgress && summary.dailyProgress.totalDays > 0) {
    parts.push(`\n**每日测评：** 已完成${summary.dailyProgress.totalDays}天，平均分${summary.dailyProgress.averageScore}分`)
  }

  parts.push('\n\n【教学建议】')
  parts.push('请根据以上学生画像，调整你的教学方式：')

  // 根据性格给建议
  if (summary.personality?.mainTraits?.includes('外向活泼')) {
    parts.push('- 学生性格外向，可以多用互动式、讨论式的教学方法')
  } else if (summary.personality?.mainTraits?.includes('内向沉稳')) {
    parts.push('- 学生性格内向，讲解时要更有耐心，鼓励学生思考')
  }

  // 根据认知能力给建议
  if (summary.cognition) {
    if (summary.cognition.level === '优秀') {
      parts.push('- 数理逻辑能力优秀，可以适当增加难度，引导深度思考')
    } else if (summary.cognition.level === '待提升') {
      parts.push('- 数理逻辑能力待提升，讲解时要分步骤、多举例、重复关键点')
    } else {
      parts.push('- 讲解时注意循序渐进，用具体例子帮助理解抽象概念')
    }
  }

  // 根据天赋给建议
  if (summary.talent?.topTalents?.[0]?.name === '艺术创作') {
    parts.push('- 学生有艺术天赋，可以用图形化、可视化的方式讲解知识点')
  } else if (summary.talent?.topTalents?.[0]?.name === '科学探索') {
    parts.push('- 学生有科学探索天赋，可以多讲原理、多用实验思维引导')
  }

  // 根据知识掌握给建议
  if (summary.knowledge) {
    if (summary.knowledge.level === '基础') {
      parts.push('- 知识掌握处于基础阶段，讲解要详细、基础概念要夯实')
    } else if (summary.knowledge.level === '精通') {
      parts.push('- 知识掌握精通，可以拓展延伸、引入更深层次的内容')
    }
  }

  parts.push('\n请在不直接提及这些数据的前提下，自然地调整你的教学风格和内容深度。')

  return parts.join('\n')
}

/**
 * 构建完整的系统提示词
 */
function buildFullSystemPrompt(assessmentContext: string): string {
  return `你是一个专业的AI学习助手，专门辅导中国8-15岁学生的学习问题。请用中文回答用户的问题。

${assessmentContext}

【严格禁止HTML】
绝对不要输出任何HTML标签，包括但不限于：<p>、<div>、<span>、<strong>、<em>、<h1>、<h2>、<h3>、<br>、<ul>、<li>、<ol>等。

【输出格式要求】
1. 只使用纯文本和Markdown语法
2. **数学公式统一使用LaTeX格式：**
   - 行内公式用 $...$ （例如：$E=mc^2$）
   - 独立公式用 $$...$$ （例如：$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$）
   - 化学式用 LaTeX（例如：$\\ce{H2O}$、$\\ce{CO2}$）
3. **结构化输出：**
   - 粗体用 **文字**，斜体用 *文字*
   - 标题用 ### （三级标题分隔不同知识点）
   - 代码块用 \`\`\`语言\\n代码\\n\`\`\`
   - 列表用 - 或 1.
   - 每个知识点之间加空行
4. **回答要求：**
   - 如果涉及多个公式或情景，必须全部列出，不要遗漏
   - 突出 **易错点** 和 **注意事项**
   - 答案要完整、准确

【示例输出】
### 二次方程求根公式

求解方程 $ax^2+bx+c=0$ 时，使用求根公式：

$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

**注意事项：**
- 判别式 $\\Delta = b^2-4ac$ 决定根的性质
- $\\Delta > 0$ 时有两个不相等的实根
- $\\Delta = 0$ 时有两个相等的实根
- $\\Delta < 0$ 时无实根

请严格遵守以上规则，绝不输出HTML标签。`
}

// ==================== 测评报告生成 ====================

// 生成学生测评报告
router.post('/users/:id/assessment-report', async (req, res) => {
  try {
    const { id: userId } = req.params

    // 验证用户存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 获取测评摘要
    let summary
    try {
      summary = await generateAssessmentSummary(userId)
    } catch (error) {
      return res.status(400).json({ message: '该学生尚未完成测评，无法生成报告' })
    }

    // 检查是否有足够的测评数据
    if (summary.assessmentStatus.totalCompleted === 0) {
      return res.status(400).json({ message: '该学生尚未完成测评，无法生成报告' })
    }

    // 构建提示词，让大模型生成报告
    const reportPrompt = buildReportPrompt(summary)

    // 调用 DeepSeek API 生成报告
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的教育评估专家，擅长分析学生的测评数据并生成详细的教育报告。'
          },
          {
            role: 'user',
            content: reportPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error('DeepSeek API 调用失败')
    }

    const data: any = await response.json()
    const report = data.choices?.[0]?.message?.content

    if (!report) {
      throw new Error('报告生成失败')
    }

    // 保存报告到数据库
    const savedReport = await prisma.assessmentReport.create({
      data: {
        userId,
        studentName: summary.userInfo.name,
        studentGrade: summary.userInfo.grade || '未设置',
        report,
        generatedBy: 'system' // 可以改为管理员ID（如果有认证）
      }
    })

    res.json({
      success: true,
      report,
      reportId: savedReport.id,
      generatedAt: savedReport.createdAt.toISOString(),
      studentName: summary.userInfo.name,
      studentGrade: summary.userInfo.grade
    })
  } catch (error: any) {
    console.error('生成测评报告失败:', error)
    res.status(500).json({ message: '生成测评报告失败', error: error.message })
  }
})

/**
 * 构建测评报告生成提示词
 */
function buildReportPrompt(summary: any): string {
  const parts: string[] = []

  parts.push('请根据以下学生的测评数据，生成一份详细的学习评估报告（600-1000字）。')
  parts.push('\n【学生基本信息】')
  parts.push(`姓名：${summary.userInfo.name}`)
  parts.push(`年级：${summary.userInfo.grade || '未设置'}`)
  parts.push(`年龄：${summary.userInfo.age || '未设置'}岁`)

  // 测评完成情况
  parts.push(`\n【测评完成情况】`)
  parts.push(`已完成测评：${summary.assessmentStatus.totalCompleted}个模块`)
  if (summary.assessmentStatus.completedModules.length > 0) {
    parts.push(`完成的模块：${summary.assessmentStatus.completedModules.join('、')}`)
  }

  // 性格特征
  if (summary.personality) {
    parts.push(`\n【性格特征】`)
    if (summary.personality.mainTraits && summary.personality.mainTraits.length > 0) {
      parts.push(`主要特点：${summary.personality.mainTraits.join('、')}`)
    }
    if (summary.personality.description) {
      parts.push(summary.personality.description)
    }
    if (summary.personality.dimensions) {
      const dims = summary.personality.dimensions
      parts.push(`性格维度得分：`)
      parts.push(`- 外向性：${dims.extroversion}/5`)
      parts.push(`- 尽责性：${dims.conscientiousness}/5`)
      parts.push(`- 亲和性：${dims.agreeableness}/5`)
      parts.push(`- 情绪稳定性：${dims.neuroticism}/5`)
      parts.push(`- 开放性：${dims.openness}/5`)
    }
  }

  // 认知能力
  if (summary.cognition) {
    parts.push(`\n【数理逻辑能力】`)
    parts.push(`水平：${summary.cognition.level}`)
    parts.push(`得分：${summary.cognition.score}分`)
  }

  // 天赋倾向
  if (summary.talent && summary.talent.topTalents && summary.talent.topTalents.length > 0) {
    parts.push(`\n【天赋倾向】`)
    summary.talent.topTalents.forEach((t: any, index: number) => {
      parts.push(`${index + 1}. ${t.name}（${t.score}分）`)
    })
  }

  // 知识掌握
  if (summary.knowledge) {
    parts.push(`\n【知识掌握情况】`)
    parts.push(`掌握水平：${summary.knowledge.level}`)
    parts.push(`正确率：${summary.knowledge.accuracy.toFixed(1)}%`)
    parts.push(`答对题数：${summary.knowledge.correctCount}/${summary.knowledge.totalCount}`)
  }

  // 每日测评表现
  if (summary.dailyProgress && summary.dailyProgress.totalDays > 0) {
    parts.push(`\n【每日测评表现】`)
    parts.push(`累计完成：${summary.dailyProgress.totalDays}天`)
    parts.push(`平均分：${summary.dailyProgress.averageScore}分`)
  }

  parts.push(`\n\n【报告要求】`)
  parts.push(`请基于以上数据，生成一份结构化的学习评估报告，报告应包含以下部分：`)
  parts.push(`1. **学生概况**（100字左右）：简要总结学生的整体表现和特点`)
  parts.push(`2. **优势与特长**（150-200字）：详细分析学生的突出优势，包括性格、能力、天赋等方面`)
  parts.push(`3. **需要关注的方面**（150-200字）：指出需要改进的领域和潜在挑战`)
  parts.push(`4. **学科学习建议**（150-200字）：针对各学科给出具体的学习方法和策略建议`)
  parts.push(`5. **家庭辅导建议**（150-200字）：给家长提供实用的辅导方法和亲子互动建议`)
  parts.push(`\n报告要求：`)
  parts.push(`- 语言专业、客观，避免过度夸张或消极评价`)
  parts.push(`- 建议要具体、可操作，避免空泛的建议`)
  parts.push(`- 使用Markdown格式，用 ### 标记各个部分的标题`)
  parts.push(`- 总字数控制在600-1000字之间`)

  return parts.join('\n')
}

// ==================== 测评统计概览 ====================

// 获取测评统计概览
router.get('/assessment/overview', async (req, res) => {
  try {
    // 1. 学生总数
    const totalStudents = await prisma.user.count({
      where: { role: 'user' }
    })

    // 2. 已完成测评的学生数（至少完成一个模块）
    const studentsWithAssessments = await prisma.assessmentAttempt.groupBy({
      by: ['userId'],
      where: {
        completedAt: { not: null }
      }
    })
    const studentsCompletedCount = studentsWithAssessments.length

    // 3. 测评模块完成情况统计
    const moduleCompletionStats = await prisma.assessmentModule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            attempts: {
              where: {
                completedAt: { not: null }
              }
            }
          }
        }
      }
    })

    const moduleStats = moduleCompletionStats.map(module => ({
      moduleName: module.name,
      slug: module.slug,
      completedCount: module._count.attempts,
      completionRate: totalStudents > 0
        ? ((module._count.attempts / totalStudents) * 100).toFixed(1) + '%'
        : '0%'
    }))

    // 4. 测评报告总数
    const totalReports = await prisma.assessmentReport.count()

    // 5. 最近7天生成的报告数
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentReports = await prisma.assessmentReport.count({
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    })

    // 6. 每日测评完成情况（最近7天）
    const dailyAttempts = await prisma.assessmentAttempt.findMany({
      where: {
        isDaily: true,
        completedAt: { not: null },
        startedAt: { gte: sevenDaysAgo }
      },
      select: {
        startedAt: true
      }
    })

    // 按日期分组统计
    const dailyStats: Record<string, number> = {}
    dailyAttempts.forEach(attempt => {
      const date = attempt.startedAt.toISOString().split('T')[0]
      dailyStats[date] = (dailyStats[date] || 0) + 1
    })

    const dailyProgressData = Object.entries(dailyStats).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date))

    res.json({
      success: true,
      data: {
        totalStudents,
        studentsCompletedCount,
        completionRate: totalStudents > 0
          ? ((studentsCompletedCount / totalStudents) * 100).toFixed(1) + '%'
          : '0%',
        moduleStats,
        totalReports,
        recentReports,
        dailyProgress: dailyProgressData
      }
    })
  } catch (error: any) {
    console.error('获取测评统计概览失败:', error)
    res.status(500).json({ message: '获取测评统计概览失败', error: error.message })
  }
})

// 获取测评报告历史列表
router.get('/assessment/reports', async (req, res) => {
  try {
    const { page = '1', limit = '20', startDate, endDate, userId } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // 构建查询条件
    const where: any = {}

    // 按用户筛选
    if (userId) {
      where.userId = userId as string
    }

    // 按日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string)
      }
      if (endDate) {
        const endDateTime = new Date(endDate as string)
        endDateTime.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDateTime
      }
    }

    // 查询报告列表
    const reports = await prisma.assessmentReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        userId: true,
        studentName: true,
        studentGrade: true,
        generatedBy: true,
        createdAt: true
        // report 字段太大，列表不返回
      }
    })

    // 统计总数
    const total = await prisma.assessmentReport.count({ where })

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    })
  } catch (error: any) {
    console.error('获取测评报告列表失败:', error)
    res.status(500).json({ message: '获取测评报告列表失败', error: error.message })
  }
})

// 获取单个报告详情
router.get('/assessment/reports/:id', async (req, res) => {
  try {
    const { id } = req.params

    const report = await prisma.assessmentReport.findUnique({
      where: { id }
    })

    if (!report) {
      return res.status(404).json({ message: '报告不存在' })
    }

    res.json({
      success: true,
      data: report
    })
  } catch (error: any) {
    console.error('获取报告详情失败:', error)
    res.status(500).json({ message: '获取报告详情失败', error: error.message })
  }
})

// 获取学生测评完成度详情（按学生分组）
router.get('/assessment/completion', async (req, res) => {
  try {
    // 获取所有学生
    const users = await prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            name: true,
            grade: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 获取所有测评模块
    const modules = await prisma.assessmentModule.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: 'asc' }
    })

    // 获取所有学生的测评完成记录
    const allAttempts = await prisma.assessmentAttempt.findMany({
      where: {
        completedAt: { not: null }
      },
      select: {
        userId: true,
        moduleId: true,
        completedAt: true,
        score: true
      }
    })

    // 构建每个学生的完成情况
    const studentCompletionData = users.map(user => {
      const userAttempts = allAttempts.filter(a => a.userId === user.id)
      const completedModuleIds = new Set(userAttempts.map(a => a.moduleId))

      const moduleDetails = modules.map(module => {
        const attempt = userAttempts.find(a => a.moduleId === module.id)
        return {
          moduleName: module.name,
          slug: module.slug,
          isCompleted: completedModuleIds.has(module.id),
          completedAt: attempt?.completedAt?.toISOString() || null,
          score: attempt?.score || null
        }
      })

      return {
        userId: user.id,
        studentName: user.profile?.name || '未设置',
        studentGrade: user.profile?.grade || '未设置',
        email: user.email,
        totalModules: modules.length,
        completedModules: completedModuleIds.size,
        completionRate: modules.length > 0
          ? ((completedModuleIds.size / modules.length) * 100).toFixed(1) + '%'
          : '0%',
        moduleDetails
      }
    })

    res.json({
      success: true,
      data: studentCompletionData
    })
  } catch (error: any) {
    console.error('获取学生测评完成度失败:', error)
    res.status(500).json({ message: '获取学生测评完成度失败', error: error.message })
  }
})

// 导出测评报告为PDF
router.get('/assessment/reports/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params

    const report = await prisma.assessmentReport.findUnique({
      where: { id }
    })

    if (!report) {
      return res.status(404).json({ message: '报告不存在' })
    }

    const { generateReportPDF } = await import('../services/pdfGenerator')

    const pdfBuffer = await generateReportPDF({
      studentName: report.studentName,
      studentGrade: report.studentGrade || undefined,
      createdAt: report.createdAt.toISOString(),
      report: report.report
    })

    const filename = `测评报告_${report.studentName}_${new Date().toISOString().split('T')[0]}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    res.end(pdfBuffer, 'binary')
  } catch (error: any) {
    console.error('生成PDF失败:', error)
    res.status(500).json({ message: '生成PDF失败', error: error.message })
  }
})

export default router
