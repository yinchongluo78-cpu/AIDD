import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import { getSignedUrl } from './oss'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

const prisma = new PrismaClient()

// 切片大小（约400字）
const CHUNK_SIZE = 400
const CHUNK_OVERLAP = 50 // 重叠部分，保证上下文连贯

/**
 * 解析并存储文档内容到chunks
 */
export async function parseAndStoreDocument(documentId: string, documentUrl: string) {
  try {
    console.log(`开始解析文档: ${documentId}`)

    // 获取文档信息，判断文件类型
    const document = await prisma.kbDocument.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      throw new Error('文档不存在')
    }

    const isPdf = document.fileExt?.toLowerCase() === '.pdf' ||
                  document.filename?.toLowerCase().endsWith('.pdf')
    const isDocx = document.fileExt?.toLowerCase().includes('wordprocessingml') ||
                   document.filename?.toLowerCase().endsWith('.docx')

    console.log(`文件类型: ${isPdf ? 'PDF' : isDocx ? 'DOCX' : '文本文件'}`)

    // 获取文档内容
    let content = ''

    // documentUrl 可能是：
    // 1. 完整的 OSS URL (http://xxx.aliyuncs.com/documents/xxx.docx)
    // 2. OSS key (documents/xxx.docx)
    // 3. 本地文件路径 (/uploads/xxx.docx)

    let ossKey = documentUrl
    let isOSSFile = false

    // 判断是否为 OSS 文件
    if (documentUrl.startsWith('http')) {
      // 完整的 OSS URL
      isOSSFile = true
      if (documentUrl.includes('aliyuncs.com/')) {
        ossKey = documentUrl.split('aliyuncs.com/')[1]
      }
    } else if (!documentUrl.startsWith('/')) {
      // 不是绝对路径，假设是 OSS key
      isOSSFile = true
    }

    if (isOSSFile) {
      // 从 OSS 下载文件
      console.log(`准备从 OSS 下载文件，key: ${ossKey}`)

      let signedUrl: string
      try {
        signedUrl = await getSignedUrl(ossKey, 3600)
        console.log('签名URL生成成功:', signedUrl.substring(0, 100) + '...')
      } catch (urlError) {
        console.error('生成签名URL失败:', urlError)
        throw new Error(`无法生成文件访问链接: ${(urlError as any).message}`)
      }

      try {
        if (isPdf) {
          // PDF文件：下载为buffer
          console.log('开始下载 PDF 文件...')
          const response = await axios.get(signedUrl, {
            responseType: 'arraybuffer',
            timeout: 60000, // PDF文件可能较大，增加超时时间
            maxContentLength: 100 * 1024 * 1024 // 100MB
          })
          console.log(`PDF文件下载完成，大小: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`)

          // 使用pdf-parse解析
          console.log('开始解析 PDF 文件...')
          const pdfData = await pdfParse(response.data)
          content = pdfData.text
          console.log(`PDF解析完成，提取文本长度: ${content.length}`)
          console.log(`PDF信息 - 页数: ${pdfData.numpages}, 文本预览: ${content.substring(0, 200)}`)
        } else if (isDocx) {
          // DOCX文件：下载为buffer
          console.log('开始下载 DOCX 文件...')
          const response = await axios.get(signedUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 100 * 1024 * 1024 // 100MB
          })
          console.log(`DOCX文件下载完成，大小: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`)

          // 使用mammoth解析
          console.log('开始解析 DOCX 文件...')
          const result = await mammoth.extractRawText({ buffer: response.data })
          content = result.value
          console.log(`DOCX解析完成，提取文本长度: ${content.length}`)
          console.log(`DOCX文本预览: ${content.substring(0, 200)}`)
        } else {
          // 文本文件：保持原有逻辑
          console.log('开始下载文本文件...')
          const response = await axios.get(signedUrl, {
            responseType: 'text',
            timeout: 30000,
            maxContentLength: 100 * 1024 * 1024 // 100MB
          })
          content = response.data
          console.log(`文本文件下载完成，内容长度: ${content.length}`)
        }
      } catch (downloadError) {
        console.error('下载或解析文件失败:', downloadError)
        if (axios.isAxiosError(downloadError)) {
          console.error('Axios错误详情:', {
            message: downloadError.message,
            code: downloadError.code,
            status: downloadError.response?.status,
            statusText: downloadError.response?.statusText
          })
        }
        throw new Error(`文件下载或解析失败: ${(downloadError as any).message}`)
      }
    } else {
      // 本地文件路径 - 需要处理相对路径
      const fs = require('fs').promises
      const path = require('path')

      let fullPath = documentUrl
      // 如果是相对路径，拼接完整路径
      if (documentUrl.startsWith('/uploads/')) {
        fullPath = path.join(__dirname, '../../', documentUrl)
      }

      console.log(`尝试读取文件: ${fullPath}`)

      if (isPdf) {
        // PDF文件：读取为buffer
        const dataBuffer = await fs.readFile(fullPath)
        const pdfData = await pdfParse(dataBuffer)
        content = pdfData.text
        console.log(`PDF解析完成，提取文本长度: ${content.length}`)
      } else if (isDocx) {
        // DOCX文件：读取为buffer
        const dataBuffer = await fs.readFile(fullPath)
        const result = await mammoth.extractRawText({ buffer: dataBuffer })
        content = result.value
        console.log(`DOCX解析完成，提取文本长度: ${content.length}`)
      } else {
        // 文本文件：保持原有逻辑
        content = await fs.readFile(fullPath, 'utf-8')
        console.log(`文件读取成功，内容长度: ${content.length}`)
      }
    }

    // 清理内容
    console.log(`开始清理文档内容，原始长度: ${content.length}`)
    try {
      content = cleanContent(content)
      console.log(`内容清理完成，清理后长度: ${content.length}`)
    } catch (cleanError) {
      console.error('清理内容失败:', cleanError)
      throw new Error(`内容清理失败: ${(cleanError as any).message}`)
    }

    // 创建文档切片
    console.log(`开始创建文档切片，CHUNK_SIZE: ${CHUNK_SIZE}, OVERLAP: ${CHUNK_OVERLAP}`)
    let chunks: string[]
    try {
      chunks = createChunks(content, CHUNK_SIZE, CHUNK_OVERLAP)
      console.log(`文档分割成 ${chunks.length} 个切片`)
      if (chunks.length > 0) {
        console.log(`切片预览（前3个）:`, chunks.slice(0, Math.min(3, chunks.length)).map((c, i) => `[${i}] ${c.substring(0, 50)}...`))
      }
    } catch (chunkError) {
      console.error('创建切片失败:', chunkError)
      throw new Error(`文档分割失败: ${(chunkError as any).message}`)
    }

    if (chunks.length === 0) {
      console.warn('警告：文档分割后没有产生任何切片')
      return 0
    }

    // 批量存储切片到数据库（分批处理，避免内存溢出）
    console.log(`开始存储切片到数据库，文档ID: ${documentId}`)
    try {
      const BATCH_SIZE = 10 // 每次处理10个切片
      let savedCount = 0

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map((chunk, batchIndex) =>
          prisma.kbChunk.create({
            data: {
              docId: documentId,
              content: chunk,
              seq: i + batchIndex
            }
          })
        )

        await Promise.all(batchPromises)
        savedCount += batch.length
        console.log(`进度: ${savedCount}/${chunks.length} 个切片已保存`)

        // 清理内存
        if (global.gc) {
          global.gc()
        }
      }

      console.log(`✅ 成功存储 ${chunks.length} 个切片到数据库`)
    } catch (dbError) {
      console.error('❌ 存储切片到数据库失败:', dbError)
      console.error('错误详情:', {
        message: (dbError as any).message,
        code: (dbError as any).code,
        meta: (dbError as any).meta
      })
      throw dbError
    }

    return chunks.length
  } catch (error) {
    console.error('解析文档失败:', error)
    throw error
  }
}

/**
 * 清理文档内容
 */
function cleanContent(content: string): string {
  // 移除常见的页眉页脚模式
  content = content.replace(/第\s*\d+\s*页/g, '')
  content = content.replace(/Page\s*\d+/gi, '')

  // 移除目录相关的点线
  content = content.replace(/\.{3,}/g, '')

  // 移除多余的换行(保留单换行和双换行)
  content = content.replace(/\n{3,}/g, '\n\n')

  // 只移除行首行尾的空白,不处理中间的空白(避免大文本性能问题)
  content = content.split('\n').map(line => line.trim()).join('\n')

  return content.trim()
}

/**
 * 将文档内容分割成切片
 */
function createChunks(content: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  let iterationCount = 0
  const maxIterations = Math.ceil(content.length / (chunkSize - overlap)) + 10 // 防止无限循环

  while (start < content.length && iterationCount < maxIterations) {
    iterationCount++
    let end = Math.min(start + chunkSize, content.length)

    // 尝试在句子边界结束
    if (end < content.length) {
      const lastPeriod = content.lastIndexOf('。', end)
      const lastExclamation = content.lastIndexOf('！', end)
      const lastQuestion = content.lastIndexOf('？', end)
      const lastNewline = content.lastIndexOf('\n', end)
      const lastDot = content.lastIndexOf('.', end) // 添加英文句号
      const lastQuestionMark = content.lastIndexOf('?', end) // 添加英文问号
      const lastExclamationMark = content.lastIndexOf('!', end) // 添加英文感叹号

      const boundaries = [lastPeriod, lastExclamation, lastQuestion, lastNewline,
                          lastDot, lastQuestionMark, lastExclamationMark]
        .filter(i => i > start && i < end) // 必须在 start 和 end 之间

      if (boundaries.length > 0) {
        end = Math.max(...boundaries) + 1
      }
    }

    const chunk = content.substring(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }

    // 下一个切片的起始位置（考虑重叠）
    // 确保至少前进一定距离，避免卡住
    const nextStart = end - overlap
    start = nextStart > start ? nextStart : start + chunkSize - overlap

    // 如果 start 没有前进，强制前进
    if (start <= chunks.length * chunkSize - chunks.length * overlap) {
      start = Math.max(start, end)
    }
  }

  if (iterationCount >= maxIterations) {
    console.warn(`createChunks 达到最大迭代次数 ${maxIterations}，已生成 ${chunks.length} 个切片`)
  }

  return chunks
}

/**
 * 计算文本相似度分数（改进的关键词匹配）
 */
function calculateRelevanceScore(query: string, content: string): number {
  const queryTokens = tokenize(query)
  const contentTokens = tokenize(content)

  if (queryTokens.length === 0 || contentTokens.length === 0) return 0

  let score = 0
  const contentLower = content.toLowerCase()

  queryTokens.forEach(token => {
    // 完全匹配得分更高
    const exactMatches = (contentLower.match(new RegExp(token, 'g')) || []).length
    score += exactMatches * 2

    // 部分匹配也给分
    contentTokens.forEach(cToken => {
      if (cToken.includes(token) || token.includes(cToken)) {
        score += 0.5
      }
    })
  })

  // 归一化分数（考虑查询长度）
  return score / queryTokens.length
}

/**
 * 分词函数（改进版 - 支持中文）
 */
function tokenize(text: string): string[] {
  const tokens: string[] = []

  // 清理文本,只保留中文、英文、数字
  const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')

  // 提取英文单词(按空格分割)
  const englishWords = cleaned.match(/[a-z0-9]+/g) || []
  tokens.push(...englishWords.filter(w => w.length > 1))

  // 提取中文词组(2-4字)
  const chineseText = cleaned.replace(/[a-z0-9\s]/g, '')
  for (let i = 0; i < chineseText.length; i++) {
    // 提取2字词
    if (i + 1 < chineseText.length) {
      tokens.push(chineseText.substring(i, i + 2))
    }
    // 提取3字词
    if (i + 2 < chineseText.length) {
      tokens.push(chineseText.substring(i, i + 3))
    }
    // 提取4字词
    if (i + 3 < chineseText.length) {
      tokens.push(chineseText.substring(i, i + 4))
    }
  }

  // 去重
  return [...new Set(tokens)]
}

/**
 * 搜索相关的文档切片（优化版）
 */
export async function searchDocumentChunks(
  query: string,
  categoryId?: string,
  userId?: string,
  limit: number = 5,
  documentIds?: string[]
): Promise<Array<{chunk: any, document: any, score: number}>> {
  try {
    console.log('=== 知识库检索 ===')
    console.log('查询:', query)
    console.log('分类ID:', categoryId || '无')
    console.log('文档IDs:', documentIds?.length || 0)

    // 构建查询条件
    const whereClause: any = {}

    if (categoryId || userId || documentIds) {
      whereClause.document = {}
      if (categoryId) {
        whereClause.document.categoryId = categoryId
      }
      if (userId) {
        whereClause.document.userId = userId
      }
      if (documentIds && documentIds.length > 0) {
        whereClause.document.id = {
          in: documentIds
        }
      }
      // 查询已经解析完成的文档（兼容 uploaded 和 ready 状态）
      // 旧版本文档使用 'uploaded' 状态但已有切片，新版本使用 'ready' 状态
      whereClause.document.status = {
        in: ['ready', 'uploaded']
      }
    }

    // 提取关键词
    const keywords = tokenize(query)
    console.log('提取关键词:', keywords)

    // 如果有关键词，添加内容匹配条件
    // 但如果用户明确指定了documentIds，即使没有关键词匹配也要返回文档内容
    if (keywords.length > 0 && !documentIds) {
      // 普通搜索：必须匹配关键词
      whereClause.OR = keywords.map(keyword => ({
        content: {
          contains: keyword,
          mode: 'insensitive'
        }
      }))
    }
    // 如果指定了documentIds，不添加关键词限制，返回文档的所有切片

    // 获取所有匹配的切片
    const chunks = await prisma.kbChunk.findMany({
      where: whereClause,
      include: {
        document: true
      },
      take: documentIds && documentIds.length > 0 ? limit * 10 : limit * 3, // 指定文档时取更多切片
    })

    console.log(`找到 ${chunks.length} 个初步匹配的切片`)

    // 计算相关性分数并排序
    const rankedChunks = chunks
      .map(chunk => ({
        chunk,
        document: chunk.document,
        score: calculateRelevanceScore(query, chunk.content)
      }))
      .sort((a, b) => b.score - a.score) // 按分数降序
      .slice(0, limit) // 取top N

    console.log('最终返回切片数:', rankedChunks.length)
    if (rankedChunks.length > 0) {
      console.log('最高分数:', rankedChunks[0].score)
      console.log('最高分切片预览:', rankedChunks[0].chunk.content.substring(0, 100))
    }

    return rankedChunks
  } catch (error) {
    console.error('搜索文档切片失败:', error)
    return []
  }
}