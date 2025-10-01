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

    // 如果是OSS URL，需要先生成签名URL再下载
    if (documentUrl.startsWith('http')) {
      // 从OSS URL中提取key
      let ossKey = documentUrl
      if (documentUrl.includes('aliyuncs.com/')) {
        ossKey = documentUrl.split('aliyuncs.com/')[1]
      }

      // 生成签名URL（1小时有效期）
      const signedUrl = await getSignedUrl(ossKey, 3600)
      console.log('使用签名URL下载文档:', signedUrl.substring(0, 100) + '...')

      if (isPdf) {
        // PDF文件：下载为buffer
        const response = await axios.get(signedUrl, {
          responseType: 'arraybuffer',
          timeout: 60000 // PDF文件可能较大，增加超时时间
        })
        console.log(`PDF文件下载完成，大小: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`)

        // 使用pdf-parse解析
        const pdfData = await pdfParse(response.data)
        content = pdfData.text
        console.log(`PDF解析完成，提取文本长度: ${content.length}`)
        console.log(`PDF信息 - 页数: ${pdfData.numpages}, 文本预览: ${content.substring(0, 200)}`)
      } else if (isDocx) {
        // DOCX文件：下载为buffer
        const response = await axios.get(signedUrl, {
          responseType: 'arraybuffer',
          timeout: 60000
        })
        console.log(`DOCX文件下载完成，大小: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`)

        // 使用mammoth解析
        const result = await mammoth.extractRawText({ buffer: response.data })
        content = result.value
        console.log(`DOCX解析完成，提取文本长度: ${content.length}`)
        console.log(`DOCX文本预览: ${content.substring(0, 200)}`)
      } else {
        // 文本文件：保持原有逻辑
        const response = await axios.get(signedUrl, {
          responseType: 'text',
          timeout: 30000
        })
        content = response.data
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
    content = cleanContent(content)

    // 创建文档切片
    const chunks = createChunks(content, CHUNK_SIZE, CHUNK_OVERLAP)

    console.log(`文档分割成 ${chunks.length} 个切片`)

    // 批量存储切片到数据库
    const chunkPromises = chunks.map((chunk, index) =>
      prisma.kbChunk.create({
        data: {
          docId: documentId,
          content: chunk,
          seq: index
        }
      })
    )

    await Promise.all(chunkPromises)
    console.log(`成功存储 ${chunks.length} 个切片到数据库`)

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

  while (start < content.length) {
    let end = start + chunkSize

    // 尝试在句子边界结束
    if (end < content.length) {
      const lastPeriod = content.lastIndexOf('。', end)
      const lastExclamation = content.lastIndexOf('！', end)
      const lastQuestion = content.lastIndexOf('？', end)
      const lastNewline = content.lastIndexOf('\n', end)

      const boundaries = [lastPeriod, lastExclamation, lastQuestion, lastNewline].filter(i => i > start)

      if (boundaries.length > 0) {
        end = Math.max(...boundaries) + 1
      }
    }

    const chunk = content.substring(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }

    // 下一个切片的起始位置（考虑重叠）
    start = end - overlap
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
    }

    // 提取关键词
    const keywords = tokenize(query)
    console.log('提取关键词:', keywords)

    if (keywords.length > 0) {
      // 使用OR条件匹配任意关键词
      whereClause.OR = keywords.map(keyword => ({
        content: {
          contains: keyword,
          mode: 'insensitive'
        }
      }))
    }

    // 获取所有匹配的切片
    const chunks = await prisma.kbChunk.findMany({
      where: whereClause,
      include: {
        document: true
      },
      take: limit * 3, // 先取更多结果，后面重新排序
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