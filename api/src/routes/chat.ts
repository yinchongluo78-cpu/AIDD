import { Router, Request, Response } from 'express'
import axios from 'axios'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { analyzeImage } from '../services/tongyi'
import { generateAssessmentSummary } from '../services/assessmentSummary'
import { prisma } from '../index'
import { normalizeMathForStudents } from '../utils/normalizeMathForStudents'
import { getFullMathStyleSpec } from '../prompts/mathStyle'

const router = Router()

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

console.log('Chat Route - DeepSeek API Key loaded:', DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 10)}...` : 'NOT FOUND')

// 简单的流式聊天端点，兼容前端调用
router.post('/stream', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    let { message, imageUrl } = req.body

    if (!message && !imageUrl) {
      return res.status(400).json({ error: 'Message or imageUrl is required' })
    }

    console.log('=== Chat Stream Request ===')
    console.log('UserId:', userId)
    console.log('Message:', message)
    console.log('ImageUrl:', imageUrl)

    // 获取用户 Profile，检查是否有自定义系统提示词
    const profile = await prisma.profile.findUnique({
      where: { userId }
    })

    let systemPrompt = ''

    if (profile?.customSystemPrompt) {
      // 如果管理员设置了自定义提示词，优先使用
      systemPrompt = profile.customSystemPrompt
      console.log('使用管理员自定义的系统提示词')
    } else {
      // 否则使用基于测评的自动生成提示词
      let assessmentContext = ''
      try {
        const summary = await generateAssessmentSummary(userId)
        assessmentContext = buildAssessmentContext(summary)
        console.log('测评上下文已加载')
      } catch (error) {
        console.log('未获取到测评数据，使用通用教学模式')
        assessmentContext = ''
      }

      // 构建完整的系统提示词
      systemPrompt = `你是一个专业的AI学习助手，专门辅导中国8-15岁学生的学习问题。请用中文回答用户的问题。

${assessmentContext}

【严格禁止HTML】
绝对不要输出任何HTML标签，包括但不限于：<p>、<div>、<span>、<strong>、<em>、<h1>、<h2>、<h3>、<br>、<ul>、<li>、<ol>等。

${getFullMathStyleSpec()}

【输出格式要求】
1. 只使用纯文本和Markdown语法
2. **结构化输出：**
   - 粗体用 **文字**，斜体用 *文字*
   - 标题用 ### （三级标题分隔不同知识点）
   - 代码块用 \`\`\`语言\\n代码\\n\`\`\`
   - 列表用 - 或 1.
   - 每个知识点之间加空行
3. **回答要求：**
   - 如果涉及多个公式或情景，必须全部列出，不要遗漏
   - 突出 **易错点** 和 **注意事项**
   - 答案要完整、准确

【示例输出】
### 二次方程求根公式

求解方程 ax^2 + bx + c = 0 时，使用求根公式：

x = \\frac{-b ± \\sqrt{b^2-4ac}}{2a}

**注意事项：**
- 判别式 Δ = b^2 - 4ac 决定根的性质
- Δ > 0 时有两个不相等的实根
- Δ = 0 时有两个相等的实根
- Δ < 0 时无实根

请严格遵守以上规则，绝不输出HTML标签。`
    }

    // 如果有图片，先进行OCR识别
    if (imageUrl) {
      try {
        console.log('开始OCR识别...')
        const ocrResult = await analyzeImage(imageUrl, '请识别图片中的所有文字内容，包括题目、公式、文字说明等。如果有数学公式，请用LaTeX格式表示。')
        console.log('OCR识别完成:', ocrResult)

        // 将OCR结果拼接到消息中
        if (message) {
          message = `【用户上传了一张图片，图片内容识别结果如下】\n${ocrResult}\n\n【用户的问题】\n${message}`
        } else {
          message = `【用户上传了一张图片，图片内容识别结果如下】\n${ocrResult}\n\n请分析并回答这张图片中的问题。`
        }
      } catch (error: any) {
        console.error('OCR识别失败:', error)
        message = message || '图片识别失败，请稍后重试。'
      }
    }

    console.log('最终发送的消息:', message)

    // 设置 SSE 头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })

    console.log('=== 系统提示词 ===')
    console.log(systemPrompt)
    console.log('===================')

    const requestBody = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
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
    let streamEnded = false // 标记流是否已结束
    let lastDataTime = Date.now() // 记录最后一次收到数据的时间

    // 超时检测：如果30秒没有收到新数据，主动结束流
    const timeoutCheck = setInterval(() => {
      const timeSinceLastData = Date.now() - lastDataTime
      if (timeSinceLastData > 30000 && !streamEnded) {
        console.warn('⚠️ Chat流传输超时（30秒无数据），主动结束')
        clearInterval(timeoutCheck)
        streamEnded = true

        if (!res.writableEnded) {
          if (responseContent.trim()) {
            res.write(`data: ${JSON.stringify({ type: 'done', content: responseContent })}\n\n`)
          } else {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI响应超时，请重试' })}\n\n`)
          }
          res.end()
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
            console.log('✅ Chat流式传输正常结束（收到 [DONE]）')
            clearInterval(timeoutCheck)
            streamEnded = true

            if (!res.writableEnded) {
              // 对响应内容进行LaTeX后处理
              const processedContent = normalizeMathForStudents(responseContent)
              res.write(`data: ${JSON.stringify({ type: 'done', content: processedContent })}\n\n`)
              res.end()
            }
          } else {
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                responseContent += content
                // 发送流式内容
                if (!res.writableEnded) {
                  res.write(`data: ${JSON.stringify({ type: 'stream', content })}\n\n`)
                }
              }
            } catch (e) {
              console.error('❌ Chat解析流数据错误:', e)
            }
          }
        }
      }
    })

    response.data.on('error', (error: any) => {
      console.error('❌ Chat DeepSeek流错误:', error)
      clearInterval(timeoutCheck)
      streamEnded = true

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '生成响应时出错' })}\n\n`)
        res.end()
      }
    })

    // 🔥 新增：监听流正常结束事件
    response.data.on('end', () => {
      console.log('📡 Chat DeepSeek流连接正常结束')
      clearInterval(timeoutCheck)

      // 如果流结束但没有收到 [DONE] 标记，需要兜底处理
      if (!streamEnded) {
        console.warn('⚠️ Chat流结束但未收到 [DONE] 标记，执行兜底处理')
        streamEnded = true

        if (!res.writableEnded) {
          if (responseContent.trim()) {
            const processedContent = normalizeMathForStudents(responseContent)
            res.write(`data: ${JSON.stringify({ type: 'done', content: processedContent })}\n\n`)
          } else {
            console.error('❌ Chat流结束但没有收到任何内容')
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI未返回任何内容，请重试' })}\n\n`)
          }
          res.end()
        }
      }
    })

    // 🔥 新增：监听流异常关闭事件
    response.data.on('close', () => {
      console.log('🔌 Chat DeepSeek流连接关闭')
      clearInterval(timeoutCheck)

      // 如果连接关闭但流还没结束，需要兜底处理
      if (!streamEnded) {
        console.warn('⚠️ Chat连接异常关闭，执行兜底处理')
        streamEnded = true

        if (!res.writableEnded) {
          if (responseContent.trim()) {
            const processedContent = normalizeMathForStudents(responseContent)
            res.write(`data: ${JSON.stringify({ type: 'done', content: processedContent })}\n\n`)
          } else {
            res.write(`data: ${JSON.stringify({ type: 'error', message: '连接中断，请重试' })}\n\n`)
          }
          res.end()
        }
      }
    })

  } catch (error: any) {
    console.error('Chat stream API 错误:', error)

    // 如果还没有设置响应头，设置错误响应
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server error',
        message: error.response?.data?.error?.message || error.message || '服务器错误'
      })
    } else {
      // 如果已经开始流式响应，发送错误事件
      res.write(`data: ${JSON.stringify({ type: 'error', message: '服务器错误' })}\n\n`)
      res.end()
    }
  }
})

/**
 * 根据用户测评摘要构建个性化教学上下文
 */
function buildAssessmentContext(summary: any): string {
  if (!summary || summary.assessmentStatus.totalCompleted === 0) {
    return ''
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

export default router