import axios from 'axios'

const TONGYI_API_KEY = process.env.TONGYI_API_KEY || ''
const TONGYI_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

console.log('TongYi Service - API Key loaded:', TONGYI_API_KEY ? `${TONGYI_API_KEY.substring(0, 10)}...` : 'NOT FOUND')

// 将图片URL转换为base64
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    console.log('下载图片:', imageUrl)
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300
    })

    const base64 = Buffer.from(response.data, 'binary').toString('base64')
    const contentType = response.headers['content-type'] || 'image/jpeg'

    console.log('图片转换成功，类型:', contentType, '大小:', base64.length, '字符')
    return `data:${contentType};base64,${base64}`
  } catch (error: any) {
    console.error('图片下载失败 - URL:', imageUrl)
    console.error('错误详情:', error.response?.status, error.response?.statusText, error.message)
    throw new Error(`图片下载失败: ${error.message}`)
  }
}

export async function analyzeImage(imageUrl: string, prompt: string = '请分析这张图片的内容'): Promise<string> {
  try {
    // 将图片转换为base64
    const base64Image = await imageUrlToBase64(imageUrl)

    console.log('调用通义千问API...')
    const response = await axios.post(
      TONGYI_API_URL,
      {
        model: 'qwen-vl-plus',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { text: prompt },
                { image: base64Image }
              ]
            }
          ]
        },
        parameters: {
          max_tokens: 1500
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TONGYI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    )

    if (response.data.output && response.data.output.choices) {
      const result = response.data.output.choices[0].message.content[0].text
      console.log('OCR识别成功，结果长度:', result.length)
      return result
    }

    throw new Error('API返回格式错误')
  } catch (error: any) {
    console.error('通义千问 API 错误:', error.response?.data || error.message)
    throw new Error(`图片识别失败: ${error.response?.data?.message || error.message}`)
  }
}

export async function analyzeHomework(imageUrl: string, userQuestion?: string): Promise<string> {
  let prompt = `请识别这张图片中的所有文字内容，包括题目、公式、文字说明等。如果有数学公式，请用LaTeX格式表示。`

  if (userQuestion) {
    prompt += `\n\n用户的问题：${userQuestion}`
  }

  return analyzeImage(imageUrl, prompt)
}