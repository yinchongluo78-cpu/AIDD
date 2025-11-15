import { Router } from 'express'
import axios from 'axios'
import { prisma } from '../index'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { analyzeHomework } from '../services/tongyi'
import { searchDocumentChunks } from '../services/documentParser'
import { getSignedUrl } from '../services/oss'
import { chatgptService } from '../services/chatgpt'

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

    // 为带有图片的消息生成预签名 URL，并清理用户消息中的系统提示
    const messagesWithSignedUrls = await Promise.all(
      messages.map(async (msg) => {
        let cleanedContent = msg.content

        // 🔥 清理用户消息中的知识库上下文（系统提示），只保留用户实际输入的内容
        if (msg.role === 'user') {
          // 移除从分隔线开始的整个知识库上下文块（包括 emoji、【用户选择的学习资料】等）
          // 格式: ━━━...📚 【用户选择的学习资料】 📚 ━━━...
          cleanedContent = cleanedContent.replace(/\n*[━─]{3,}[\s\S]*?【用户选择的学习资料】[\s\S]*?(?====== 图片识别结果 =====|\n===== 图片识别结果 =====|$)/g, '')

          // 移除可能残留的其他系统提示格式
          cleanedContent = cleanedContent.replace(/\n*✅.*?(?:知识库分类|用户已明确选择)[\s\S]*?(?====== 图片识别结果 =====|$)/g, '')

          // 移除【资料...】标记
          cleanedContent = cleanedContent.replace(/【资料\s*\d+\/\d+[：:][^】]*】[\s\S]*?(?=【资料|====== 图片识别结果 =====|$)/g, '')

          // 移除【来源:...】标记
          cleanedContent = cleanedContent.replace(/【来源[：:][^】]*】/g, '')

          // 移除多余的换行和空白
          cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim()
        }

        if (msg.imageOssKey) {
          try {
            const signedUrl = await getSignedUrl(msg.imageOssKey, 3600) // 1小时有效期
            return {
              ...msg,
              content: cleanedContent,
              imageUrl: signedUrl
            }
          } catch (error) {
            console.error('生成图片预签名URL失败:', error)
            return { ...msg, content: cleanedContent }
          }
        }
        return { ...msg, content: cleanedContent }
      })
    )

    res.json(messagesWithSignedUrls)
  } catch (error) {
    console.error('获取消息错误:', error)
    res.status(500).json({ message: '获取消息失败' })
  }
})

// 流式响应端点
router.post('/:id/messages/stream', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content, imageUrl, categoryId, documentIds, model } = req.body
    const conversationId = req.params.id
    const aiModel = model || 'deepseek' // 默认使用DeepSeek

    console.log('=== 流式响应接收到的参数 ===')
    console.log('conversationId:', conversationId, 'type:', typeof conversationId)
    console.log('content长度:', content?.length || 0)
    console.log('categoryId:', categoryId || 'none')
    console.log('documentIds:', documentIds || 'none')
    console.log('AI模型:', aiModel)

    // 设置 SSE 头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })

    // 如果传入的是完整的 OSS URL，先提取出 key；否则按原样保存为 key
    let initialOssKey: string | undefined = undefined
    if (imageUrl) {
      if (imageUrl.includes('aliyuncs.com/')) {
        // 提取域名后的路径部分，去掉查询参数（签名URL会有?Expires=...等参数）
        const pathPart = imageUrl.split('aliyuncs.com/')[1]
        initialOssKey = pathPart.split('?')[0] // 去掉查询参数
      } else {
        initialOssKey = imageUrl
      }
    }

    // 保存用户消息（记录 imageOssKey，兼容生产库字段）
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
        imageOssKey: initialOssKey
      }
    })

    // 发送用户消息确认
    res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`)

    // 获取对话信息（包含自定义指令）
    const currentConversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    console.log('=== 对话信息 ===')
    console.log('对话ID:', currentConversation?.id)
    console.log('对话标题:', currentConversation?.title)
    console.log('自定义指令存在:', !!currentConversation?.customInstructions)
    console.log('自定义指令长度:', currentConversation?.customInstructions?.length || 0)
    if (currentConversation?.customInstructions) {
      console.log('自定义指令内容（前100字）:', currentConversation.customInstructions.substring(0, 100) + '...')
    }

    // 获取历史消息（支持最多50轮对话，即100条消息）
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100
    })

    const apiMessages = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))

    // 初始化内容和引用
    let fullContent = content || ''
    let citations: string[] = []
    let ocrResult = ''  // 保存OCR结果
    let kbContext = ''   // 保存知识库上下文

    // 1. 如果有图片，先进行图片识别
    if (imageUrl) {
      console.log('=== 开始图片识别 ===')
      try {
        // 如果不是常见位图格式，跳过OCR，给出提示以避免外部服务报错
        // 修复：URL可能带查询参数，需要去掉查询参数再检测
        const urlWithoutQuery = imageUrl.split('?')[0]
        const isRasterImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(urlWithoutQuery)
        if (!isRasterImage) {
          console.log('非位图格式，跳过OCR:', imageUrl)
          ocrResult = '当前图片格式不支持OCR，请上传 PNG/JPG/WebP 等常见图片格式。'
        } else {
          // 从OSS URL中提取key（去掉域名部分和查询参数）
          let ossKey = imageUrl
          if (imageUrl.includes('aliyuncs.com/')) {
            const pathPart = imageUrl.split('aliyuncs.com/')[1]
            ossKey = pathPart.split('?')[0] // 去掉查询参数，只保留key路径
          }

          console.log('提取的OSS key:', ossKey)

          // 生成新的带签名的临时URL（1小时有效期）
          const signedUrl = await getSignedUrl(ossKey, 3600)
          console.log('生成签名URL用于OCR:', signedUrl.substring(0, 100) + '...')

          // 使用签名URL调用OCR，传入用户问题以智能识别
          ocrResult = await analyzeHomework(signedUrl, content || '')
          console.log(`✅ OCR识别完成，结果长度: ${ocrResult.length}`)
        }
      } catch (error) {
        console.error('❌ 图片识别失败:', error)
        ocrResult = '图片识别失败，请重新上传'
      }
    }

    // 2. 如果有知识库引用，检索相关内容
    if (categoryId || (documentIds && documentIds.length > 0)) {
      console.log('=== 开始知识库检索 ===')
      console.log('categoryId:', categoryId)
      console.log('documentIds:', documentIds)
      console.log('documentIds数量:', documentIds?.length || 0)
      console.log('content:', content || '(无用户输入文字)')

      // 🔥 新增：智能查询优化 - 检测模糊查询意图
      let searchQuery = content || '请总结文档的主要内容'
      let useStructuredRetrieval = false // 是否使用结构化检索（按顺序取切片）

      // 检测用户是否要求"总结文档"或"前N个单元/章节"
      const summaryPattern = /(总结|概括|介绍|讲[一下解])(这个)?文档|前\s*\d+\s*(个)?(单元|章节|部分)/
      const chapterPattern = /第?\s*(\d+|[一二三四五六七八九十]+)\s*(个)?\s*(单元|章节|课|部分)/

      if (content) {
        if (summaryPattern.test(content)) {
          console.log('🎯 检测到总结/概括类查询')
          useStructuredRetrieval = true
        }

        // 提取具体的单元/章节编号
        const chapterMatch = content.match(chapterPattern)
        if (chapterMatch) {
          console.log('🎯 检测到具体章节查询:', chapterMatch[0])
          // 将中文数字转换为阿拉伯数字
          const chapterNum = chapterMatch[1]
          searchQuery = `第${chapterNum}单元 第${chapterNum}章 第${chapterNum}课 ${chapterNum}`
          console.log('优化后的搜索查询:', searchQuery)
        }

        // 如果查询非常模糊（太短且没有实质内容），使用结构化检索
        if (content.length < 15 && summaryPattern.test(content)) {
          console.log('⚠️ 查询过于模糊，将使用结构化检索（按顺序返回切片）')
          useStructuredRetrieval = true
        }
      }

      const relevantChunks = await searchDocumentChunks(
        searchQuery,
        categoryId,
        req.userId,
        useStructuredRetrieval ? 15 : 8, // 结构化检索时返回更多切片以覆盖文档开头部分
        documentIds // 支持精确指定文档ID
      )

      if (relevantChunks.length > 0) {
        console.log(`✅ 找到 ${relevantChunks.length} 个相关文档片段`)

        // 🔥 修复：根据是否明确选择文档，使用不同的提示词策略
        const isExplicitSelection = documentIds && documentIds.length > 0

        // 构建知识库上下文
        kbContext = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'

        if (isExplicitSelection) {
          // 用户明确选择了文档，应该直接使用这些内容
          kbContext += '📚  【用户选择的学习资料】 📚\n'
          kbContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
          kbContext += '✅ 用户已明确选择以下文档作为学习资料：\n'
          kbContext += '请根据用户的问题和对话历史，判断是回答题目还是讲解知识点。\n'
          kbContext += '- 如果用户在答题/练习，请优先根据对话上下文批改，谨慎使用资料\n'
          kbContext += '- 如果用户要求"总结"、"讲一下"、"介绍"等，请充分使用以下资料\n\n'
        } else {
          // 搜索模式，谨慎使用
          kbContext += '⚠️  【备用资料库 - 仅在明确要求时使用】 ⚠️\n'
          kbContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
          kbContext += '🚨 重要警告：\n'
          kbContext += '以下内容是用户上传的学习资料，仅供需要时参考。\n'
          kbContext += '❌ 如果正在答题/练习/测验，请完全忽略这些内容！\n'
          kbContext += '❌ 不要看到关键词就自动开始讲解！\n'
          kbContext += '✅ 只有用户明确说"讲一下XXX"时，才使用这些资料。\n\n'
        }

        relevantChunks.forEach((item, index) => {
          kbContext += `【资料 ${index + 1}/${relevantChunks.length}：${item.document.filename}】\n`
          kbContext += item.chunk.content + '\n\n'

          // 🔥 修复：记录引用信息，确保不重复
          const citationText = `${item.document.filename} - 片段${index + 1}`
          if (!citations.includes(citationText)) {
            citations.push(citationText)
          }
        })
        kbContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'

        if (isExplicitSelection) {
          kbContext += '✅  用户选择的资料结束 - 请根据需要使用以上内容  ✅\n'
        } else {
          kbContext += '⚠️  备用资料结束 - 请根据对话上下文判断是否使用  ⚠️\n'
        }
        kbContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'

        console.log(`📌 记录了 ${citations.length} 条引用信息`)
      } else {
        console.log('❌ 未找到相关文档片段')

        // 🔥 改进：如果用户明确选择了文档但没找到切片，给出详细提示
        if (documentIds && documentIds.length > 0) {
          console.error('⚠️ 严重问题：用户选择了文档，但没有检索到任何内容！')

          // 检查文档状态，提供更准确的提示
          const docs = await prisma.kbDocument.findMany({
            where: { id: { in: documentIds } },
            select: {
              id: true,
              filename: true,
              status: true,
              _count: { select: { chunks: true } }
            }
          })

          console.log('文档状态检查:', docs.map(d => ({
            filename: d.filename,
            status: d.status,
            chunks: d._count.chunks
          })))

          const allDocsPending = docs.every(d => d.status === 'pending')
          const hasEmptyDocs = docs.some(d => d._count.chunks === 0)

          if (allDocsPending) {
            // 所有文档都在解析中
            kbContext = '\n\n⚠️ 【重要提示】用户选择的文档正在后台解析中，预计需要1-2分钟。\n'
            kbContext += '请友好地告知用户："您选择的文档正在处理中，请稍等片刻后刷新页面重试。"\n'
            kbContext += '❌ 不要编造任何内容，不要猜测文档内容。\n\n'
            citations.push('[文档解析中]')
          } else if (hasEmptyDocs) {
            // 部分文档解析失败或为空
            kbContext = '\n\n⚠️ 【重要提示】用户选择的文档可能解析失败或为空。\n'
            kbContext += '请友好地告知用户："抱歉，所选文档似乎解析失败或没有可用内容，请尝试重新上传文档。"\n'
            kbContext += '❌ 不要编造任何内容。\n\n'
            citations.push('[文档解析失败]')
          } else {
            // 文档已就绪但关键词不匹配
            kbContext = '\n\n⚠️ 【重要提示】用户选择了文档，但您的问题可能过于模糊，系统无法找到相关内容。\n'
            kbContext += '请友好地询问用户："您想了解文档中的哪个具体章节或知识点呢？请提供更详细的问题，比如\'第1单元\'或\'二次根式的概念\'。"\n'
            kbContext += '❌ 不要编造文档内容，不要猜测。\n\n'
            citations.push('[检索失败-需明确问题]')
          }
        } else {
          console.log('可能原因：1) 文档未解析 2) 文档没有内容 3) 查询关键词不匹配')
        }
      }
    }

    // 3. 组合所有内容（用户输入 + OCR结果 + 知识库上下文）
    console.log('=== 组合所有内容 ===')
    console.log('- 用户输入文字:', content ? `${content.length}字符` : '无')
    console.log('- OCR结果:', ocrResult ? `${ocrResult.length}字符` : '无')
    console.log('- 知识库上下文:', kbContext ? `${kbContext.length}字符` : '无')

    // 按照优先级组合内容
    if (content) {
      fullContent = content
    }

    if (ocrResult) {
      if (fullContent) {
        fullContent += `\n\n===== 图片识别结果 =====\n${ocrResult}\n===== 图片识别结束 =====`
      } else {
        fullContent = `请根据以下图片识别结果回答问题：\n\n${ocrResult}`
      }
    }

    // 🔥 重要：只保存用户输入 + OCR 结果到数据库（不包括 kbContext）
    // 这样确保后续对话能看到图片内容，但不会显示系统提示给用户
    if (ocrResult) {
      const contentForDB = content + (ocrResult ? `\n\n【图片识别内容】\n${ocrResult}` : '')
      await prisma.message.update({
        where: { id: userMessage.id },
        data: { content: contentForDB }
      })
      console.log('✅ 已更新用户消息，包含 OCR 结果')
    }

    // kbContext 只添加到发送给 AI 的内容中，不保存到数据库
    if (kbContext) {
      if (fullContent) {
        fullContent += `\n${kbContext}\n注意：以上参考资料仅供辅助，请优先根据对话上下文理解我的意图。`
      } else {
        fullContent = `${kbContext}\n请根据以上文档内容，总结主要信息并回答我的问题。`
      }
    }

    console.log(`✅ 最终内容组合完成，总长度: ${fullContent.length}字符`)

    // 限制发送给DeepSeek API的内容大小，避免413错误
    // DeepSeek API限制请求体约在1MB左右，我们控制在500KB以内
    const maxContentLength = 15000 // 减小初始内容限制
    if (fullContent.length > maxContentLength) {
      console.log(`内容过长(${fullContent.length}字符)，截取前${maxContentLength}字符`)
      fullContent = fullContent.substring(0, maxContentLength) + '\n\n[注意：文档内容过长，已截取部分内容进行分析]'
    }

    // 使用自定义指令或默认系统消息
    const defaultSystemMessage = `你是AI学习助手，专门辅导中国8-15岁学生的学习问题，用中文自然地与用户对话。

【核心原则：对话连贯性 + 自然交流】

**回复前的判断流程：**

1️⃣ 先看历史对话，我上一条消息是什么？
   - 如果我刚出了**具体的填空题/选择题**（如"圆有（）条半径"），且用户回复简短（如"无数 半径 16"）
   → 这是答题！直接批改答案，继续后续流程

   - 如果用户说"我想学XXX" / "讲一下XXX" / "给我介绍一下XXX"
   → 这是学习请求！正常开始教学，不要用"批改"格式

   - 如果用户是日常对话（如"你先列举一下课程大纲"）
   → 正常对话！不要用"批改"格式

2️⃣ 关于回复格式：
   ✅ **只有用户在回答具体题目时**，才使用简洁的批改格式
   ❌ 用户提学习请求、日常对话时，直接自然回复，不要加"🚨 批改反馈 🚨"

3️⃣ 知识库使用：
   - 下方如果有【备用资料库】内容，只在用户明确要学习时使用
   - 答题/测验时完全忽略知识库内容

4️⃣ **数学公式输出规范（非常重要！必须严格遵守）：**
   - ⚠️ **所有数学公式必须用美元符号包裹，否则小学生看不懂！**
   - 行内公式：用单个美元符号包裹，如 $E=mc^2$、$\\frac{OF}{OE}$
   - 独立公式：用两个美元符号包裹，如 $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
   - ❌ **错误示例**（小学生看不懂）：\\frac{OF}{OE} = \\frac{AB}{\\frac{n}{2}}
   - ✅ **正确示例**（小学生能看懂）：$\\frac{OF}{OE} = \\frac{AB}{\\frac{n}{2}}$
   - 化学式用 LaTeX：$\\ce{H2O}$、$\\ce{CO2}$
   - 如果知识点涉及多个公式或情景，必须全部列出，不要遗漏
   - 突出 **易错点** 和 **注意事项**

5️⃣ **知识库内容使用要求：**
   - 如果下方提供了【备用资料库】内容，且用户明确要求学习某知识点
   - 必须**综合所有资料片段**回答，不要只用前1-2个片段
   - 如果某知识点有多个公式/定理/例题，必须全部包含
   - 示例：如果资料中有5条公式，回答时要列出所有5条，而不是只说2条

6. **回复格式与排版规范：**

   - 回答要层次清晰、结构分明，便于阅读
   - 如果需要分点说明，使用合理的层级结构
   - 避免过度嵌套，保持简洁自然
   - 格式要像正常对话一样流畅，不要太机械

---

**记住：自然对话 > 机械批改。让对话像真人老师一样流畅。**`

    const systemMessage = currentConversation?.customInstructions || defaultSystemMessage

    console.log('=== 系统提示词 ===')
    console.log('使用自定义指令:', !!currentConversation?.customInstructions)
    console.log('系统消息长度:', systemMessage.length)
    console.log('系统消息内容（前200字）:', systemMessage.substring(0, 200) + (systemMessage.length > 200 ? '...' : ''))
    console.log('===================')

    // 构建消息数组并检查总大小
    const apiRequestMessages = [
      { role: 'system', content: systemMessage },
      ...apiMessages.slice(-15), // 保留最近15条历史消息，提供更完整的上下文
      { role: 'user', content: fullContent }
    ]

    // 检查请求JSON的总大小
    const requestBody = {
      model: 'deepseek-reasoner',  // 🚀 升级到 DeepSeek R1，推理能力更强
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

    // 根据模型选择调用不同的 API
    let response: any

    // 兼容前端发送的 'gpt5' 和 'chatgpt'
    if (aiModel === 'chatgpt' || aiModel === 'gpt5') {
      // 调用 ChatGPT API
      console.log('✅ 使用 ChatGPT API (通过API2D中转)')
      try {
        const chatgptMessages = apiRequestMessages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        }))

        const streamGenerator = await chatgptService.streamChat(chatgptMessages, {
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2000
        })

        let responseContent = ''

        // 处理 ChatGPT 流式响应
        for await (const content of streamGenerator) {
          responseContent += content
          console.log('发送ChatGPT流式片段:', content.substring(0, 20))
          res.write(`data: ${JSON.stringify({ type: 'stream', content })}\n\n`)
        }

        // 保存助手消息
        const assistantMessage = await prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: responseContent,
            citations: citations.length > 0 ? (JSON.stringify(citations) as any) : null
          }
        })

        res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`)
        res.end()

        // 生成标题
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        })

        if (conversation?.title === '新对话' || conversation?.title === '') {
          generateTitle(conversationId, content)
        }

        return
      } catch (error: any) {
        console.error('ChatGPT API 错误:', error)
        // 如果ChatGPT失败，回退到DeepSeek
        console.log('ChatGPT调用失败，回退到DeepSeek')
        // 继续执行DeepSeek调用
      }
    }

    // 调用 DeepSeek API with stream
    response = await axios.post(
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
    let streamEnded = false // 标记流是否已结束，避免重复处理
    let lastDataTime = Date.now() // 记录最后一次收到数据的时间

    // 超时检测：如果30秒没有收到新数据，主动结束流
    const timeoutCheck = setInterval(() => {
      const timeSinceLastData = Date.now() - lastDataTime
      if (timeSinceLastData > 30000 && !streamEnded) {
        console.warn('⚠️ 流传输超时（30秒无数据），主动结束')
        clearInterval(timeoutCheck)
        streamEnded = true

        // 如果已经有部分内容，保存并通知前端
        if (responseContent.trim()) {
          prisma.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: responseContent + '\n\n[注意：响应因超时被截断]',
              citations: citations.length > 0 ? (JSON.stringify(citations) as any) : null
            }
          }).then(assistantMessage => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`)
              res.end()
            }
          }).catch(err => {
            console.error('保存超时消息失败:', err)
            if (!res.writableEnded) {
              res.end()
            }
          })
        } else {
          // 没有内容，直接通知前端错误
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI响应超时，请重试' })}\n\n`)
            res.end()
          }
        }
      }
    }, 5000) // 每5秒检查一次

    response.data.on('data', (chunk: Buffer) => {
      lastDataTime = Date.now() // 更新最后收到数据的时间
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            console.log('✅ 流式传输正常结束（收到 [DONE]）')
            clearInterval(timeoutCheck)
            streamEnded = true

            // 流结束，保存完整的助手消息（包含引用信息）
            prisma.message.create({
              data: {
                conversationId,
                role: 'assistant',
                content: responseContent,
                citations: citations.length > 0 ? (JSON.stringify(citations) as any) : null
              }
            }).then(assistantMessage => {
              if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`)
                res.end()
              }
            }).catch(err => {
              console.error('❌ 保存消息失败:', err)
              if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: 'error', message: '保存消息失败' })}\n\n`)
                res.end()
              }
            })
          } else {
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                responseContent += content
                // 发送流式内容
                console.log('📤 发送流式片段:', content.substring(0, 20))
                if (!res.writableEnded) {
                  res.write(`data: ${JSON.stringify({ type: 'stream', content })}\n\n`)
                }
              }
            } catch (e) {
              console.error('❌ 解析流数据错误:', e, '原始数据:', data.substring(0, 100))
            }
          }
        }
      }
    })

    response.data.on('error', (error: any) => {
      console.error('❌ DeepSeek 流错误:', error)
      clearInterval(timeoutCheck)
      streamEnded = true

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '生成响应时出错' })}\n\n`)
        res.end()
      }
    })

    // 🔥 新增：监听流正常结束事件
    response.data.on('end', () => {
      console.log('📡 DeepSeek 流连接正常结束')
      clearInterval(timeoutCheck)

      // 如果流结束但没有收到 [DONE] 标记，需要兜底处理
      if (!streamEnded) {
        console.warn('⚠️ 流结束但未收到 [DONE] 标记，执行兜底处理')
        streamEnded = true

        if (responseContent.trim()) {
          // 有内容，保存并通知前端
          prisma.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: responseContent,
              citations: citations.length > 0 ? (JSON.stringify(citations) as any) : null
            }
          }).then(assistantMessage => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`)
              res.end()
            }
          }).catch(err => {
            console.error('❌ 兜底保存消息失败:', err)
            if (!res.writableEnded) {
              res.end()
            }
          })
        } else {
          // 没有内容，通知前端错误
          console.error('❌ 流结束但没有收到任何内容')
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI未返回任何内容，请重试' })}\n\n`)
            res.end()
          }
        }
      }
    })

    // 🔥 新增：监听流异常关闭事件
    response.data.on('close', () => {
      console.log('🔌 DeepSeek 流连接关闭')
      clearInterval(timeoutCheck)

      // 如果连接关闭但流还没结束，需要兜底处理
      if (!streamEnded) {
        console.warn('⚠️ 连接异常关闭，执行兜底处理')
        streamEnded = true

        if (responseContent.trim()) {
          // 有部分内容，保存并通知前端
          prisma.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: responseContent,
              citations: citations.length > 0 ? (JSON.stringify(citations) as any) : null
            }
          }).then(assistantMessage => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`)
              res.end()
            }
          }).catch(err => {
            console.error('❌ 关闭时保存消息失败:', err)
            if (!res.writableEnded) {
              res.end()
            }
          })
        } else {
          // 没有内容
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: '连接中断，请重试' })}\n\n`)
            res.end()
          }
        }
      }
    })

    // 生成标题 - 获取对话信息
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })
    
    if (conversation?.title === '新对话' || conversation?.title === '') {
      // 异步生成标题，不阻塞响应
      generateTitle(conversationId, content)
    }

  } catch (error: any) {
    console.error('流式响应错误:', error)
    // 兜底：返回用户友好的完成消息，避免“服务器错误”直接展示
    try {
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: req.params.id,
          role: 'assistant',
          content: '抱歉，图片解析或生成回复时出现问题。请换一张更清晰的图片，或直接用文字描述问题，我会继续帮你。'
        }
      })
      res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`)
      res.end()
    } catch (e) {
      // 如果数据库写入也失败，退回到错误事件
      console.error('兜底消息写入失败:', e)
      res.write(`data: ${JSON.stringify({ type: 'error', message: '服务暂时不可用，请稍后重试' })}\n\n`)
      res.end()
    }
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
    let initialOssKey: string | undefined = undefined
    if (imageUrl) {
      if (imageUrl.includes('aliyuncs.com/')) {
        // 提取域名后的路径部分，去掉查询参数（签名URL会有?Expires=...等参数）
        const pathPart = imageUrl.split('aliyuncs.com/')[1]
        initialOssKey = pathPart.split('?')[0] // 去掉查询参数
      } else {
        initialOssKey = imageUrl
      }
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
        imageOssKey: initialOssKey
      }
    })

    let aiResponse = ''
    let messages: any[] = []

    // 如果有图片，先进行图片识别
    if (imageUrl) {
      // 从OSS URL中提取key（去掉域名部分和查询参数）
      let ossKey = imageUrl
      if (imageUrl.includes('aliyuncs.com/')) {
        const pathPart = imageUrl.split('aliyuncs.com/')[1]
        ossKey = pathPart.split('?')[0] // 去掉查询参数，只保留key路径
      }

      console.log('提取的OSS key:', ossKey)

      // 生成新的签名URL
      const signedUrl = await getSignedUrl(ossKey, 3600)
      let imageAnalysis = await analyzeHomework(signedUrl, content || '')

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
    console.log('===== 收到更新对话请求 =====')
    console.log('对话ID:', req.params.id)
    console.log('用户ID:', req.userId)
    console.log('请求体:', req.body)

    const { title, customInstructions } = req.body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (customInstructions !== undefined) updateData.customInstructions = customInstructions || null

    console.log('将要更新的数据:', updateData)

    const conversation = await prisma.conversation.update({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      data: updateData
    })

    console.log('更新成功，返回:', conversation)
    res.json(conversation)
  } catch (error: any) {
    console.error('更新对话错误:', error)
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    })
    res.status(500).json({ message: '更新对话失败', error: error.message })
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