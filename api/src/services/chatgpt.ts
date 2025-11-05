import axios from 'axios'

const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY || ''
const CHATGPT_PROXY_URL = process.env.CHATGPT_PROXY_URL || 'https://api.openai.com'
const CHATGPT_API_URL = `${CHATGPT_PROXY_URL}/v1/chat/completions`

console.log('ChatGPT Service - API Key loaded:', CHATGPT_API_KEY ? `${CHATGPT_API_KEY.substring(0, 10)}...` : 'NOT FOUND')
console.log('ChatGPT Service - Using URL:', CHATGPT_API_URL)

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

/**
 * 流式聊天 - 返回一个异步生成器
 */
async function* streamChat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): AsyncGenerator<string, void, unknown> {
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 2000
  } = options

  if (!CHATGPT_API_KEY) {
    throw new Error('CHATGPT_API_KEY 未配置')
  }

  try {
    const response = await axios.post(
      CHATGPT_API_URL,
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      },
      {
        headers: {
          'Authorization': `Bearer ${CHATGPT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: 0
      }
    )

    let buffer = ''

    // 处理流式数据
    for await (const chunk of response.data) {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()

          if (data === '[DONE]') {
            return
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content

            if (content) {
              yield content
            }
          } catch (e) {
            // 忽略解析错误
            console.error('ChatGPT 流数据解析错误:', e)
          }
        }
      }
    }
  } catch (error: any) {
    console.error('ChatGPT API 错误:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || error.message || 'ChatGPT API 调用失败')
  }
}

export const chatgptService = {
  streamChat
}
