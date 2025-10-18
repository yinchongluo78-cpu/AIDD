// 检查特定用户的详细数据
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserDetail() {
  try {
    const email = '1029615645@qq.com'

    console.log('=== 检查用户详细数据 ===')
    console.log('邮箱:', email, '\n')

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        conversations: {
          include: {
            messages: {
              select: { id: true, createdAt: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      console.log('❌ 用户不存在')
      return
    }

    console.log('✅ 用户信息:')
    console.log('  ID:', user.id)
    console.log('  姓名:', user.profile?.name || '未设置')
    console.log('  创建时间:', user.createdAt)
    console.log('')

    // 查询会话记录
    const sessions = await prisma.userSession.findMany({
      where: { userId: user.id },
      orderBy: { startTime: 'desc' }
    })

    console.log('📊 会话统计:')
    console.log('  会话总数:', sessions.length)

    if (sessions.length > 0) {
      const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0)
      console.log('  总时长:', Math.floor(totalDuration / 60), '分钟')
      console.log('')
      console.log('  最近会话:')
      sessions.slice(0, 5).forEach((s, i) => {
        console.log(`    ${i + 1}. 开始: ${s.startTime.toISOString().substring(0, 19)}`)
        console.log(`       结束: ${s.endTime ? s.endTime.toISOString().substring(0, 19) : '未结束'}`)
        console.log(`       时长: ${Math.floor(s.duration / 60)}分${s.duration % 60}秒`)
      })
    } else {
      console.log('  ⚠️  没有会话记录！')
    }
    console.log('')

    // 查询对话记录
    console.log('💬 对话统计:')
    console.log('  对话总数:', user.conversations.length)

    if (user.conversations.length > 0) {
      const totalMessages = user.conversations.reduce((sum, c) => sum + c.messages.length, 0)
      console.log('  消息总数:', totalMessages)
      console.log('')
      console.log('  最近对话:')
      user.conversations.slice(0, 5).forEach((c, i) => {
        console.log(`    ${i + 1}. 标题: ${c.title || '新对话'}`)
        console.log(`       消息数: ${c.messages.length}`)
        console.log(`       创建时间: ${c.createdAt.toISOString().substring(0, 19)}`)
        if (c.messages.length > 0) {
          const firstMsg = c.messages[0]
          const lastMsg = c.messages[c.messages.length - 1]
          console.log(`       首条消息: ${firstMsg.createdAt.toISOString().substring(0, 19)}`)
          console.log(`       末条消息: ${lastMsg.createdAt.toISOString().substring(0, 19)}`)

          // 计算对话时长
          const duration = Math.floor((new Date(lastMsg.createdAt) - new Date(firstMsg.createdAt)) / 1000)
          console.log(`       对话时长: ${Math.floor(duration / 60)}分${duration % 60}秒`)
        }
      })
    }

  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserDetail()
