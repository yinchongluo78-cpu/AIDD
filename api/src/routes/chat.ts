import { Router, Request, Response } from 'express'
import axios from 'axios'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

console.log('Chat Route - DeepSeek API Key loaded:', DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 10)}...` : 'NOT FOUND')

// 简单的流式聊天端点，兼容前端调用
router.post('/stream', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    console.log('=== Chat Stream Request ===')
    console.log('Message:', message)

    // 设置 SSE 头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })

    // 构建请求
    const requestBody = {
      model: 'deepseek-chat',
      messages: [
        { 
          role: 'system', 
          content: `你是一个专业的AI学习助手，请用中文回答用户的问题。

【严格禁止HTML】
绝对不要输出任何HTML标签，包括但不限于：<p>、<div>、<span>、<strong>、<em>、<h1>、<h2>、<h3>、<br>、<ul>、<li>、<ol>等。

【输出格式要求】
1. 只使用纯文本和Markdown语法
2. 数学公式使用LaTeX：行内用$...$，块级用$$...$$
3. 粗体用**文字**，斜体用*文字*
4. 标题用# ## ###
5. 代码块用\`\`\`语言\n代码\n\`\`\`
6. 列表用- 或1. 

【示例输出】
正确：**这是粗体**，$x^2+1=0$，$$\\int_0^1 x dx$$
错误：<strong>这是粗体</strong>，<span>$x^2+1=0$</span>

请严格遵守以上规则，绝不输出HTML标签。` 
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

    response.data.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            console.log('Chat stream 结束')
            res.write(`data: ${JSON.stringify({ type: 'done', content: responseContent })}\n\n`)
            res.end()
          } else {
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                responseContent += content
                // 发送流式内容
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
      console.error('Chat stream 错误:', error)
      res.write(`data: ${JSON.stringify({ type: 'error', message: '生成响应时出错' })}\n\n`)
      res.end()
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

export default router