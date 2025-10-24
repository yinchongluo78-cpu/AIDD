import { PrismaClient } from '@prisma/client'
import axios from 'axios'

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

    // 获取文档内容
    let content = ''

    // 如果是OSS URL，直接下载内容
    if (documentUrl.startsWith('http')) {
      const response = await axios.get(documentUrl, {
        responseType: 'text',
        timeout: 30000
      })
      content = response.data
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
      content = await fs.readFile(fullPath, 'utf-8')
      console.log(`文件读取成功，内容长度: ${content.length}`)
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
  // 移除多余的空白字符
  content = content.replace(/\s+/g, ' ')

  // 移除常见的页眉页脚模式
  content = content.replace(/第\s*\d+\s*页/g, '')
  content = content.replace(/Page\s*\d+/gi, '')

  // 移除目录相关的点线
  content = content.replace(/\.{3,}/g, '')

  // 移除多余的换行
  content = content.replace(/\n{3,}/g, '\n\n')

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
 * 搜索相关的文档切片
 */
export async function searchDocumentChunks(
  query: string,
  categoryId?: string,
  userId?: string,
  limit: number = 5
): Promise<Array<{chunk: any, document: any}>> {
  try {
    // 构建查询条件
    const whereClause: any = {}

    if (categoryId || userId) {
      whereClause.document = {}
      if (categoryId) {
        whereClause.document.categoryId = categoryId
      }
      if (userId) {
        whereClause.document.userId = userId
      }
    }

    // 简单的关键词搜索（后续可以升级为向量搜索）
    // 由于PostgreSQL的全文搜索配置复杂，这里使用简单的LIKE查询
    const keywords = query.split(' ').filter(k => k.length > 1)

    if (keywords.length > 0) {
      whereClause.OR = keywords.map(keyword => ({
        content: {
          contains: keyword,
          mode: 'insensitive'
        }
      }))
    }

    const chunks = await prisma.kbChunk.findMany({
      where: whereClause,
      include: {
        document: true
      },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return chunks.map(chunk => ({
      chunk,
      document: chunk.document
    }))
  } catch (error) {
    console.error('搜索文档切片失败:', error)
    return []
  }
}