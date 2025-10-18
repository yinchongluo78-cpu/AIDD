// 根据对话记录回填会话数据
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function backfillSessionsFromConversations() {
  try {
    console.log('=== 根据对话记录回填会话数据 ===\n')

    // 获取所有用户
    const users = await prisma.user.findMany({
      include: {
        profile: true
      }
    })

    console.log('总用户数:', users.length, '\n')

    let totalCreatedSessions = 0
    let totalEstimatedDuration = 0

    for (const user of users) {
      console.log(`处理用户: ${user.profile?.name || user.email}`)

      // 检查该用户是否已有会话记录
      const existingSessions = await prisma.userSession.findMany({
        where: { userId: user.id }
      })

      if (existingSessions.length > 0) {
        console.log(`  ✓ 已有 ${existingSessions.length} 条会话记录，跳过`)
        console.log('')
        continue
      }

      // 获取该用户的所有对话
      const conversations = await prisma.conversation.findMany({
        where: { userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      if (conversations.length === 0) {
        console.log('  - 没有对话记录，跳过')
        console.log('')
        continue
      }

      console.log(`  找到 ${conversations.length} 个对话`)

      // 将对话按日期分组，同一天的对话算作一个会话
      const sessionsByDate = new Map()

      for (const conv of conversations) {
        if (conv.messages.length === 0) continue

        const firstMsg = conv.messages[0]
        const lastMsg = conv.messages[conv.messages.length - 1]

        // 按日期分组（年-月-日）
        const dateKey = firstMsg.createdAt.toISOString().substring(0, 10)

        if (!sessionsByDate.has(dateKey)) {
          sessionsByDate.set(dateKey, {
            startTime: firstMsg.createdAt,
            endTime: lastMsg.createdAt,
            conversations: []
          })
        }

        const session = sessionsByDate.get(dateKey)
        session.conversations.push(conv)

        // 更新会话的开始和结束时间
        if (firstMsg.createdAt < session.startTime) {
          session.startTime = firstMsg.createdAt
        }
        if (lastMsg.createdAt > session.endTime) {
          session.endTime = lastMsg.createdAt
        }
      }

      console.log(`  分组为 ${sessionsByDate.size} 个会话（按日期）`)

      // 为每个分组创建会话记录
      let userCreatedSessions = 0

      for (const [date, session] of sessionsByDate.entries()) {
        const duration = Math.floor(
          (session.endTime.getTime() - session.startTime.getTime()) / 1000
        )

        // 只创建时长大于 0 的会话
        if (duration > 0) {
          await prisma.userSession.create({
            data: {
              userId: user.id,
              startTime: session.startTime,
              endTime: session.endTime,
              duration: duration
            }
          })

          userCreatedSessions++
          totalCreatedSessions++
          totalEstimatedDuration += duration

          const minutes = Math.floor(duration / 60)
          console.log(`    ✓ ${date}: ${session.conversations.length} 个对话, 时长 ${minutes} 分钟`)
        }
      }

      console.log(`  ✓ 成功创建 ${userCreatedSessions} 条会话记录`)
      console.log('')
    }

    console.log('=== 回填完成 ===')
    console.log('成功创建会话数:', totalCreatedSessions)
    console.log('总估算时长:', Math.floor(totalEstimatedDuration / 60), '分钟')
    console.log('平均每会话时长:', totalCreatedSessions > 0 ? Math.floor(totalEstimatedDuration / totalCreatedSessions / 60) : 0, '分钟')

  } catch (error) {
    console.error('回填失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfillSessionsFromConversations()
