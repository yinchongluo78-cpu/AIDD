// 检查所有用户的会话数据
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsersSessions() {
  try {
    console.log('=== 检查所有用户的会话数据 ===\n')

    const users = await prisma.user.findMany({
      include: { profile: true }
    })

    console.log('数据库总用户数:', users.length, '\n')

    for (const user of users) {
      const sessions = await prisma.userSession.findMany({
        where: { userId: user.id },
        orderBy: { startTime: 'desc' }
      })

      const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0)
      const minutes = Math.floor(totalDuration / 60)
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60

      console.log('用户:', user.profile?.name || user.email)
      console.log('  邮箱:', user.email)
      console.log('  会话数:', sessions.length)
      console.log('  总时长:', hours, '小时', mins, '分钟')

      if (sessions.length > 0) {
        console.log('  最近会话:')
        sessions.slice(0, 3).forEach((s, i) => {
          const m = Math.floor(s.duration / 60)
          const sec = s.duration % 60
          console.log(`    ${i + 1}. ${s.startTime.toISOString().substring(0, 16)} - ${m}分${sec}秒`)
        })
      } else {
        console.log('  ⚠️  没有会话记录！')
      }
      console.log('')
    }

  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsersSessions()
