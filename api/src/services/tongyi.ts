import axios from 'axios'

const TONGYI_API_KEY = process.env.TONGYI_API_KEY || ''
const TONGYI_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

export async function analyzeImage(imageUrl: string, prompt: string = '请分析这张图片的内容'): Promise<string> {
  try {
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
                { image: imageUrl }
              ]
            }
          ]
        },
        parameters: {
          max_tokens: 1000
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TONGYI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.data.output && response.data.output.choices) {
      return response.data.output.choices[0].message.content[0].text
    }

    return '无法识别图片内容'
  } catch (error) {
    console.error('通义千问 API 错误:', error)
    return '图片识别服务暂时不可用'
  }
}

export async function analyzeHomework(imageUrl: string): Promise<string> {
  const prompt = `请仔细分析这张作业图片：
1. 识别题目内容
2. 分析题目类型（数学、语文、英语等）
3. 如果是习题，提供解题思路
4. 如果有错误，指出并解释
5. 给出学习建议

请用友好的语言，适合学生理解的方式回答。`

  return analyzeImage(imageUrl, prompt)
}