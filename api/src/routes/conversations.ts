import { Router } from 'express'
import axios from 'axios'
import { prisma } from '../index'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { analyzeHomework } from '../services/tongyi'
import { searchDocumentChunks } from '../services/documentParser'
import { getSignedUrl } from '../services/oss'

const router = Router()

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

console.log('DeepSeek API Key loaded:', DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 10)}...` : 'NOT FOUND')

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    res.json(conversations)
  } catch (error) {
    console.error('获取对话列表错误:', error)
    res.status(500).json({ message: '获取对话列表失败' })
  }
})

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.userId!,
        title: '新对话'
      }
    })

    res.json(conversation)
  } catch (error) {
    console.error('创建对话错误:', error)
    res.status(500).json({ message: '创建对话失败' })
  }
})

router.get('/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        conversationId: req.params.id,
        conversation: { userId: req.userId }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json(messages)
  } catch (error) {
    console.error('获取消息错误:', error)
    res.status(500).json({ message: '获取消息失败' })
  }
})

// 流式响应端点
router.post('/:id/messages/stream', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content, imageUrl, categoryId, documentIds } = req.body
    const conversationId = req.params.id

    console.log('=== 流式响应接收到的参数 ===')
    console.log('content长度:', content?.length || 0)
    console.log('categoryId:', categoryId || 'none')
    console.log('documentIds:', documentIds || 'none')

    // 设置 SSE 头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })

    // 保存用户消息（稍后会在检索后更新引用信息）
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
        imageOssKey: imageUrl
      }
    })

    // 发送用户消息确认
    res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`)

    // 获取历史消息
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10
    })

    const apiMessages = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))

    // 如果有图片，先进行图片识别
    let fullContent = content
    let citations: string[] = []

    if (imageUrl) {
      try {
        // 从OSS URL中提取key（去掉域名部分）
        let ossKey = imageUrl
        if (imageUrl.includes('aliyuncs.com/')) {
          ossKey = imageUrl.split('aliyuncs.com/')[1]
        }

        // 生成带签名的临时URL（1小时有效期）
        const signedUrl = await getSignedUrl(ossKey, 3600)
        console.log('生成签名URL用于OCR:', signedUrl.substring(0, 100) + '...')

        // 使用签名URL调用OCR
        const imageAnalysis = await analyzeHomework(signedUrl)
        // 将图片分析结果加入到消息中
        fullContent = content ?
          `${content}\n\n[图片分析]: ${imageAnalysis}` :
          `请根据以下图片分析结果回答问题：\n${imageAnalysis}`
      } catch (error) {
        console.error('图片识别失败:', error)
        fullContent = content || '图片识别失败，请重新上传'
      }
    }

    // 如果有知识库引用，检索相关内容
    if ((categoryId || documentIds) && content) {
      console.log('开始知识库检索...')
      const relevantChunks = await searchDocumentChunks(
        content,
        categoryId,
        req.userId,
        5, // 最多返回5个相关片段
        documentIds // 支持精确指定文档ID
      )

      if (relevantChunks.length > 0) {
        console.log(`找到 ${relevantChunks.length} 个相关文档片段`)

        // 构建知识库上下文
        let kbContext = '\n\n===== 知识库参考内容 =====\n'
        relevantChunks.forEach((item, index) => {
          kbContext += `\n【文档${index + 1}：${item.document.filename}】\n`
          kbContext += item.chunk.content + '\n'

          // 记录引用信息
          citations.push(`${item.document.filename} - 片段${index + 1}`)
        })
        kbContext += '\n===== 知识库内容结束 =====\n'

        // 将知识库内容加入到用户消息中
        fullContent = `${fullContent}\n${kbContext}\n请基于以上知识库内容回答问题。`
      } else {
        console.log('未找到相关文档片段')
      }
    }

    // 限制发送给DeepSeek API的内容大小，避免413错误
    // DeepSeek API限制请求体约在1MB左右，我们控制在500KB以内
    const maxContentLength = 15000 // 减小初始内容限制
    if (fullContent.length > maxContentLength) {
      console.log(`内容过长(${fullContent.length}字符)，截取前${maxContentLength}字符`)
      fullContent = fullContent.substring(0, maxContentLength) + '\n\n[注意：文档内容过长，已截取部分内容进行分析]'
    }

    // 构建消息数组并检查总大小
    const apiRequestMessages = [
      { role: 'system', content: '你是一个专业的AI学习助手，请用中文回答用户的问题。' },
      ...apiMessages.slice(-10), // 保留最近10条历史消息（根据用户要求）
      { role: 'user', content: fullContent }
    ]

    // 检查请求JSON的总大小
    const requestBody = {
      model: 'deepseek-chat',
      messages: apiRequestMessages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    }

    const requestSize = JSON.stringify(requestBody).length
    console.log(`请求JSON大小: ${requestSize} 字符`)

    if (requestSize > 50000) { // 进一步减小阈值到50KB
      console.log('请求过大，进一步截取内容')
      fullContent = fullContent.substring(0, 8000) + '\n\n[注意：内容已大幅截取]'
      apiRequestMessages[apiRequestMessages.length - 1].content = fullContent

      // 再次检查大小
      const newRequestSize = JSON.stringify({
        ...requestBody,
        messages: apiRequestMessages
      }).length
      console.log(`截取后请求大小: ${newRequestSize} 字符`)
    }

    // 调用 DeepSeek API with stream
    const response = await axios.post(
      DEEPSEEK_API_URL,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: 0 // 无超时限制
      }
    )

    let responseContent = ''
    let buffer = ''

    response.data.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            console.log('流式传输结束')
            // 流结束，保存完整的助手消息（包含引用信息）
            prisma.message.create({
              data: {
                conversationId,
                role: 'assistant',
                content: responseContent,
                citations: citations.length > 0 ? citations : undefined
              }
            }).then(assistantMessage => {
              res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`)
              res.end()
            })
          } else {
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                responseContent += content
                // 发送流式内容
                console.log('发送流式片段:', content.substring(0, 20))
                res.write(`data: ${JSON.stringify({ type: 'stream', content })}\n\n`)
              }
            } catch (e) {
              console.error('解析流数据错误:', e)
            }
          }
        }
      }
    })

    response.data.on('error', (error: any) => {
      console.error('流错误:', error)
      res.write(`data: ${JSON.stringify({ type: 'error', message: '生成响应时出错' })}\n\n`)
      res.end()
    })

    // 生成标题
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (conversation?.title === '新对话' || conversation?.title === '') {
      // 异步生成标题，不阻塞响应
      generateTitle(conversationId, content)
    }

  } catch (error: any) {
    console.error('流式响应错误:', error)
    res.write(`data: ${JSON.stringify({ type: 'error', message: '服务器错误' })}\n\n`)
    res.end()
  }
})

// 辅助函数：生成标题
async function generateTitle(conversationId: string, content: string) {
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个标题生成助手。根据用户的问题，生成一个简洁的中文标题，不超过10个字。只返回标题文字，不要有引号、标点或其他任何额外内容。' },
          { role: 'user', content: `请为这个问题生成一个简短的标题（5-10个字），只返回标题文字：${content}` }
        ],
        temperature: 0.3,
        max_tokens: 20
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const title = response.data.choices[0].message.content.trim().replace(/["''']/g, '')
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title }
    })
  } catch (error) {
    console.error('生成标题错误:', error)
    const fallbackTitle = content.length > 10 ? content.substring(0, 10) + '...' : content
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: fallbackTitle }
    })
  }
}

// 原始的非流式消息端点
router.post('/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content, imageUrl } = req.body
    const conversationId = req.params.id

    // 保存用户消息
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
        imageOssKey: imageUrl
      }
    })

    let aiResponse = ''
    let messages: any[] = []

    // 如果有图片，先进行图片识别
    if (imageUrl) {
      // 从OSS URL中提取key
      let ossKey = imageUrl
      if (imageUrl.includes('aliyuncs.com/')) {
        ossKey = imageUrl.split('aliyuncs.com/')[1]
      }

      // 生成签名URL
      const signedUrl = await getSignedUrl(ossKey, 3600)
      let imageAnalysis = await analyzeHomework(signedUrl)

      // 限制图片分析结果的长度
      const maxAnalysisLength = 45000
      if (imageAnalysis.length > maxAnalysisLength) {
        console.log(`图片分析结果过长(${imageAnalysis.length}字符)，截取前${maxAnalysisLength}字符`)
        imageAnalysis = imageAnalysis.substring(0, maxAnalysisLength) + '\n\n[注意：分析结果过长，已截取部分内容]'
      }

      aiResponse = imageAnalysis

      // 如果还有文字内容，结合图片分析和文字进行回复
      if (content) {
        messages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          take: 10
        })

        const apiMessages = [
          ...messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          {
            role: 'system',
            content: `图片分析结果：${imageAnalysis}`
          },
          {
            role: 'user',
            content: content
          }
        ]

        try {
          const response = await axios.post(
            DEEPSEEK_API_URL,
            {
              model: 'deepseek-chat',
              messages: apiMessages,
              temperature: 0.7,
              max_tokens: 2000
            },
            {
              headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          )

          aiResponse = response.data.choices[0].message.content
        } catch (apiError) {
          console.error('DeepSeek API 错误:', apiError)
        }
      }
    } else {
      // 只有文字内容，使用 DeepSeek
      messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 10
      })

      const apiMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      try {
        const response = await axios.post(
          DEEPSEEK_API_URL,
          {
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: '你是一个专业的AI学习助手，请用中文回答用户的问题。' },
              ...apiMessages
            ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: false
          },
          {
            headers: {
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 60秒超时
          }
        )

        aiResponse = response.data.choices[0].message.content
      } catch (apiError: any) {
        console.error('DeepSeek API 错误详情:', {
          message: apiError.message,
          code: apiError.code,
          response: apiError.response?.data,
          status: apiError.response?.status
        })
        console.error('API Key 状态:', DEEPSEEK_API_KEY ? 'Key exists' : 'Key missing')

        // 根据错误类型返回不同的提示
        if (apiError.code === 'ECONNABORTED' || apiError.message === 'aborted' || apiError.message.includes('timeout')) {
          aiResponse = '抱歉，AI 响应超时，请稍后重试。'
        } else if (apiError.response?.status === 401) {
          aiResponse = '抱歉，API 密钥无效。'
        } else if (apiError.response?.status === 429) {
          aiResponse = '抱歉，请求过于频繁，请稍后再试。'
        } else {
          aiResponse = '抱歉，AI 服务暂时不可用。请稍后再试。'
        }
      }
    }

    // 保存 AI 回复
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse
      }
    })

    // 获取当前对话的所有消息用于判断是否生成标题
    if (messages.length === 0) {
      messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' }
      })
    }

    // 如果是第一轮对话，生成标题
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (conversation?.title === '新对话' || conversation?.title === '') {
      // 异步生成标题，不阻塞响应
      generateTitle(conversationId, content)
    }

    res.json(assistantMessage)
  } catch (error) {
    console.error('发送消息错误:', error)
    res.status(500).json({ message: '发送消息失败' })
  }
})

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title } = req.body

    const conversation = await prisma.conversation.update({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      data: { title }
    })

    res.json(conversation)
  } catch (error) {
    console.error('更新对话错误:', error)
    res.status(500).json({ message: '更新对话失败' })
  }
})

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.conversation.delete({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('删除对话错误:', error)
    res.status(500).json({ message: '删除对话失败' })
  }
})

export default router