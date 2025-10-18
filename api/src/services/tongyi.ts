import axios from 'axios'

const TONGYI_API_KEY = process.env.TONGYI_API_KEY || ''
const TONGYI_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

export async function analyzeImage(imageUrl: string, prompt: string = '请分析这张图片的内容'): Promise<string> {
  try {
    console.log('=== 通义千问 OCR 请求 ===')
    console.log('API Key 状态:', TONGYI_API_KEY ? `存在 (${TONGYI_API_KEY.substring(0, 10)}...)` : '❌ 未配置')
    console.log('图片 URL:', imageUrl.substring(0, 100) + '...')

    const response = await axios.post(
      TONGYI_API_URL,
      {
        model: 'qwen-vl-max',  // 🚀 升级到 Max 版本，提升视觉推理能力
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
          max_tokens: 3000,      // 增加 token 限制，确保完整识别
          temperature: 0.1,      // 降低随机性，提高准确性
          top_p: 0.8            // 控制采样范围，平衡多样性与准确性
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TONGYI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      }
    )

    console.log('通义千问响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(response.data).substring(0, 200))

    if (response.data.output && response.data.output.choices) {
      const result = response.data.output.choices[0].message.content[0].text
      console.log('✅ OCR 成功，结果长度:', result.length)
      return result
    }

    console.error('❌ 响应格式不正确:', response.data)
    return '无法识别图片内容'
  } catch (error: any) {
    console.error('===  通义千问 API 错误详情 ===')
    console.error('错误类型:', error.name)
    console.error('错误消息:', error.message)
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', error.response.data)
    } else if (error.request) {
      console.error('请求已发送但无响应')
    } else {
      console.error('请求配置错误:', error.message)
    }
    console.error('API Key 配置:', TONGYI_API_KEY ? '已配置' : '❌ 未配置')
    return '图片识别服务暂时不可用，请稍后重试'
  }
}

export async function analyzeHomework(imageUrl: string, userQuestion: string = ''): Promise<string> {
  const prompt = `你是一个智能图片识别助手，这张图片可能包含：印刷体题目 + 手写解答过程。

【用户问题】
${userQuestion || '（用户未输入问题，请识别所有内容）'}

【智能识别策略】
根据用户的问题，智能判断识别重点：

🔍 **判断逻辑：**
- 如果用户问的是"题目是什么"、"帮我解题"、"这道题怎么做"等 → **优先识别印刷体题目**，手写内容可忽略
- 如果用户问的是"我做对了吗"、"解答正确吗"、"批改作业"等 → **需要识别印刷题目 + 手写解答**
- 如果用户未输入问题 → 识别所有内容（印刷+手写）

📝 **识别要求：**
1. 印刷体识别：
   - 完整识别题号、问题描述、条件、选项等
   - 准确识别数学公式、几何符号、化学方程式

2. 手写体识别（按需）：
   - 如果需要识别手写内容，尽力识别计算步骤和答案
   - 字迹不清晰的地方标注 [不清晰]

3. 输出格式：
   - 清晰区分【题目内容】和【手写解答】（如果需要）
   - 保持原有的题目结构和编号

⚠️ **重点**：根据用户问题智能输出，不要无脑全部识别！`

  return analyzeImage(imageUrl, prompt)
}