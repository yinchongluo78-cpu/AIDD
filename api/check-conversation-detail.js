// 检查特定对话的详细数据
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkConversationDetail() {
  try {
    console.log('=== 查找包含"总结这个文档"的对话 ===\n')

    // 查找包含关键词的消息
    const messages = await prisma.message.findMany({
      where: {
        content: {
          contains: '总结这'
        }
      },
      include: {
        conversation: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    console.log(`找到 ${messages.length} 条相关消息\n`)

    for (const msg of messages) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('对话ID:', msg.conversationId)
      console.log('用户:', msg.conversation.user.profile?.name || msg.conversation.user.email)
      console.log('消息时间:', msg.createdAt)
      console.log('用户问题:', msg.content)
      console.log('')

      // 获取这条消息之后的AI回复
      const aiReply = await prisma.message.findFirst({
        where: {
          conversationId: msg.conversationId,
          createdAt: {
            gt: msg.createdAt
          },
          role: 'assistant'
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      if (aiReply) {
        console.log('AI回复:')
        console.log(aiReply.content.substring(0, 300) + '...')
        console.log('')
        console.log('Citations:', aiReply.citations || 'null')
      }

      // 获取对话的知识库信息
      const conv = await prisma.conversation.findUnique({
        where: { id: msg.conversationId }
      })

      console.log('自定义指令:', conv?.customInstructions ? '有' : '无')
      console.log('')

      // 查找这个用户的知识库文档
      const docs = await prisma.kbDocument.findMany({
        where: {
          userId: msg.conversation.userId
        },
        include: {
          chunks: {
            select: { id: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      })

      console.log(`用户知识库文档 (最近5个):`)
      docs.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.filename} - ${doc.status} - ${doc.chunks.length} 个切片`)
      })
      console.log('')
    }

  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkConversationDetail()
