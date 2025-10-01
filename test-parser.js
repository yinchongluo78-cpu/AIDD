// 测试文档解析功能
const { parseAndStoreDocument } = require('./api/src/services/documentParser')

async function test() {
  try {
    // 创建一个模拟的文档ID
    const documentId = 'test-doc-id'
    const documentUrl = '/uploads/documents/test.txt'

    console.log('开始测试文档解析...')
    const chunkCount = await parseAndStoreDocument(documentId, documentUrl)
    console.log(`解析成功，生成了 ${chunkCount} 个切片`)
  } catch (error) {
    console.error('测试失败:', error)
  }
}

test()