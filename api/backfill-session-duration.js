// 回填旧会话数据的 duration 字段
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function backfillSessionDuration() {
  try {
    console.log('=== 开始回填旧会话数据的 duration 字段 ===\n')

    // 查询所有 duration 为 0 且有 endTime 的会话
    const sessions = await prisma.userSession.findMany({
      where: {
        duration: 0,
        endTime: { not: null }
      }
    })

    console.log('找到', sessions.length, '条需要回填的会话记录\n')

    if (sessions.length === 0) {
      console.log('✅ 没有需要回填的数据')
      return
    }

    let updatedCount = 0
    let totalDuration = 0

    for (const session of sessions) {
      // 计算时长（秒）
      const duration = Math.floor(
        (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000
      )

      // 只更新时长大于 0 的记录
      if (duration > 0) {
        await prisma.userSession.update({
          where: { id: session.id },
          data: { duration }
        })

        updatedCount++
        totalDuration += duration

        console.log(`✓ 会话 ${session.id.substring(0, 8)}... 更新为 ${duration} 秒 (${Math.floor(duration / 60)} 分钟)`)
      }
    }

    console.log(`\n=== 回填完成 ===`)
    console.log('成功更新:', updatedCount, '条记录')
    console.log('总时长:', Math.floor(totalDuration / 60), '分钟 (', totalDuration, '秒)')
    console.log('平均时长:', updatedCount > 0 ? Math.floor(totalDuration / updatedCount / 60) : 0, '分钟')

  } catch (error) {
    console.error('回填失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfillSessionDuration()
