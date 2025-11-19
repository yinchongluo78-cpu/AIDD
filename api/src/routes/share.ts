import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth.js'
import crypto from 'crypto'
import { batchRenderMessages } from '../utils/renderMath.js'

const router = express.Router()
const prisma = new PrismaClient()

// 生成短随机ID（8位字母数字）
function generateShareId(): string {
  return crypto.randomBytes(4).toString('hex')
}

/**
 * 创建对话分享链接
 * POST /api/conversations/:id/share
 */
router.post('/:conversationId/share', authenticateToken, async (req: any, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.userId
    const { expiresIn } = req.body // 可选：过期时间（小时）

    // 验证对话是否属于当前用户
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在或无权访问' })
    }

    // 检查是否已经存在活跃的分享
    let existingShare = await prisma.sharedConversation.findFirst({
      where: {
        conversationId,
        isActive: true
      }
    })

    if (existingShare) {
      // 返回已存在的分享链接
      return res.json({
        shareId: existingShare.shareId,
        shareUrl: `${process.env.APP_URL || 'http://localhost:5173'}/share/${existingShare.shareId}`,
        createdAt: existingShare.createdAt,
        expiresAt: existingShare.expiresAt
      })
    }

    // 创建新的分享
    const shareId = generateShareId()
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
      : null

    const share = await prisma.sharedConversation.create({
      data: {
        conversationId,
        userId,
        shareId,
        title: conversation.title || '未命名对话',
        expiresAt
      }
    })

    res.json({
      shareId: share.shareId,
      shareUrl: `${process.env.APP_URL || 'http://localhost:5173'}/share/${share.shareId}`,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt
    })
  } catch (error) {
    console.error('创建分享失败:', error)
    res.status(500).json({ error: '创建分享失败' })
  }
})

/**
 * 获取对话的分享状态
 * GET /api/conversations/:id/share
 */
router.get('/:conversationId/share', authenticateToken, async (req: any, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.userId

    // 验证对话是否属于当前用户
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId
      }
    })

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在或无权访问' })
    }

    // 查找活跃的分享
    const share = await prisma.sharedConversation.findFirst({
      where: {
        conversationId,
        isActive: true
      }
    })

    if (!share) {
      return res.json({ shared: false })
    }

    res.json({
      shared: true,
      shareId: share.shareId,
      shareUrl: `${process.env.APP_URL || 'http://localhost:5173'}/share/${share.shareId}`,
      viewCount: share.viewCount,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt
    })
  } catch (error) {
    console.error('获取分享状态失败:', error)
    res.status(500).json({ error: '获取分享状态失败' })
  }
})

/**
 * 取消对话分享
 * DELETE /api/conversations/:id/share
 */
router.delete('/:conversationId/share', authenticateToken, async (req: any, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.userId

    // 验证对话是否属于当前用户
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId
      }
    })

    if (!conversation) {
      return res.status(404).json({ error: '对话不存在或无权访问' })
    }

    // 将所有分享设置为不活跃
    await prisma.sharedConversation.updateMany({
      where: {
        conversationId,
        isActive: true
      },
      data: {
        isActive: false
      }
    })

    res.json({ success: true, message: '已取消分享' })
  } catch (error) {
    console.error('取消分享失败:', error)
    res.status(500).json({ error: '取消分享失败' })
  }
})

/**
 * 获取分享的对话内容（公开访问，无需认证）
 * GET /api/shared/:shareId
 */
router.get('/public/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params

    // 查找分享记录
    const share = await prisma.sharedConversation.findUnique({
      where: { shareId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' }
            },
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    if (!share) {
      return res.status(404).json({ error: '分享不存在' })
    }

    if (!share.isActive) {
      return res.status(410).json({ error: '分享已失效' })
    }

    // 检查是否过期
    if (share.expiresAt && new Date() > share.expiresAt) {
      // 自动设置为不活跃
      await prisma.sharedConversation.update({
        where: { id: share.id },
        data: { isActive: false }
      })
      return res.status(410).json({ error: '分享已过期' })
    }

    // 增加访问计数
    await prisma.sharedConversation.update({
      where: { id: share.id },
      data: {
        viewCount: { increment: 1 }
      }
    })

    // 合并连续的同角色消息（主要是assistant消息，因为流式输出可能产生多条记录）
    const mergedMessages: any[] = []
    let lastMessage: any = null

    for (const msg of share.conversation.messages) {
      if (lastMessage && lastMessage.role === msg.role && msg.role === 'assistant') {
        // 合并连续的assistant消息
        lastMessage.content = (lastMessage.content || '') + (msg.content || '')
        // 合并后需要重新生成 htmlContent，所以先清空
        lastMessage.htmlContent = null
        // 合并citations
        if (msg.citations && Array.isArray(msg.citations)) {
          lastMessage.citations = [
            ...(Array.isArray(lastMessage.citations) ? lastMessage.citations : []),
            ...msg.citations
          ]
        }
      } else {
        // 新消息 - 🔥 包含 htmlContent 用于后端统一渲染
        const newMsg = {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          htmlContent: msg.htmlContent,  // 后端渲染的 HTML
          imageOssKey: msg.imageOssKey,
          citations: msg.citations,
          createdAt: msg.createdAt
        }
        mergedMessages.push(newMsg)
        lastMessage = newMsg
      }
    }

    // 🔥 使用 batchRenderMessages 确保所有消息都有 htmlContent（包括合并后重新生成的）
    const messagesWithHtml = batchRenderMessages(mergedMessages as any)

    // 返回对话数据（不包含敏感信息）
    res.json({
      title: share.title,
      createdAt: share.conversation.createdAt,
      messages: messagesWithHtml,  // 🔥 返回包含 htmlContent 的消息
      author: {
        name: share.conversation.user.profile?.name || '匿名用户',
        avatarUrl: share.conversation.user.profile?.avatarUrl
      }
    })
  } catch (error) {
    console.error('获取分享对话失败:', error)
    res.status(500).json({ error: '获取分享对话失败' })
  }
})

export default router
