import axios from 'axios'
import { prisma } from '../index'

/**
 * 飞书多维表格同步服务
 *
 * 使用前需要配置环境变量：
 * - FEISHU_APP_ID: 飞书应用 ID
 * - FEISHU_APP_SECRET: 飞书应用密钥
 * - FEISHU_TABLE_APP_TOKEN: 多维表格 app_token
 * - FEISHU_USER_TABLE_ID: 用户统计表 table_id
 * - FEISHU_DAILY_STATS_TABLE_ID: 每日统计表 table_id
 */

interface FeishuAuth {
  tenant_access_token: string
  expire: number
}

let cachedAuth: FeishuAuth | null = null

/**
 * 获取飞书租户访问令牌
 */
async function getTenantAccessToken(): Promise<string> {
  // 检查缓存
  if (cachedAuth && Date.now() < cachedAuth.expire) {
    return cachedAuth.tenant_access_token
  }

  const appId = process.env.FEISHU_APP_ID
  const appSecret = process.env.FEISHU_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error('飞书配置缺失：需要配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET')
  }

  try {
    const response = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: appId,
        app_secret: appSecret
      }
    )

    if (response.data.code !== 0) {
      throw new Error(`获取飞书令牌失败: ${response.data.msg}`)
    }

    // 缓存令牌（提前5分钟过期）
    cachedAuth = {
      tenant_access_token: response.data.tenant_access_token,
      expire: Date.now() + (response.data.expire - 300) * 1000
    }

    return cachedAuth.tenant_access_token
  } catch (error) {
    console.error('获取飞书令牌失败:', error)
    throw error
  }
}

/**
 * 格式化时长（秒 -> 小时）
 */
function formatDuration(seconds: number): string {
  const hours = (seconds / 3600).toFixed(2)
  return `${hours}小时`
}

/**
 * 同步用户统计数据到飞书多维表格
 */
export async function syncUsersToFeishu(): Promise<void> {
  const tableAppToken = process.env.FEISHU_TABLE_APP_TOKEN
  const userTableId = process.env.FEISHU_USER_TABLE_ID

  if (!tableAppToken || !userTableId) {
    console.warn('飞书多维表格配置缺失，跳过同步')
    return
  }

  try {
    const token = await getTenantAccessToken()

    // 获取所有用户数据
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        conversations: {
          select: { id: true }
        },
        sessions: true,
        documents: {
          select: { id: true }
        }
      }
    })

    // 计算每个用户的统计数据
    const userStats = await Promise.all(
      users.map(async (user) => {
        const messageCount = await prisma.message.count({
          where: {
            conversation: {
              userId: user.id
            }
          }
        })

        const totalActiveDuration = user.sessions.reduce((sum, session) => sum + session.duration, 0)

        return {
          fields: {
            '用户ID': user.id,
            '姓名': user.profile?.name || '未设置',
            '邮箱': user.email,
            '年级': user.profile?.grade || '-',
            '年龄': user.profile?.age?.toString() || '-',
            '对话数': user.conversations.length,
            '消息数': messageCount,
            '会话次数': user.sessions.length,
            '活跃时长': formatDuration(totalActiveDuration),
            '知识库文档': user.documents.length,
            '注册时间': user.createdAt.toISOString(),
            '最后更新': new Date().toISOString()
          }
        }
      })
    )

    // 清空现有数据（可选，或者采用更新策略）
    // 这里采用简单的批量插入策略
    console.log(`准备同步 ${userStats.length} 个用户数据到飞书...`)

    // 分批插入（飞书 API 限制每次最多 500 条）
    const batchSize = 100
    for (let i = 0; i < userStats.length; i += batchSize) {
      const batch = userStats.slice(i, i + batchSize)

      await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableAppToken}/tables/${userTableId}/records/batch_create`,
        {
          records: batch
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log(`已同步 ${Math.min(i + batchSize, userStats.length)}/${userStats.length} 条用户数据`)
    }

    console.log('用户数据同步完成！')
  } catch (error) {
    console.error('同步用户数据到飞书失败:', error)
    throw error
  }
}

/**
 * 同步每日统计数据到飞书
 */
export async function syncDailyStatsToFeishu(): Promise<void> {
  const tableAppToken = process.env.FEISHU_TABLE_APP_TOKEN
  const dailyStatsTableId = process.env.FEISHU_DAILY_STATS_TABLE_ID

  if (!tableAppToken || !dailyStatsTableId) {
    console.warn('飞书多维表格配置缺失，跳过每日统计同步')
    return
  }

  try {
    const token = await getTenantAccessToken()

    // 获取今日统计数据
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      totalConversations,
      totalMessages,
      totalDocuments,
      todayNewUsers,
      todayConversations,
      todayMessages
    ] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.kbDocument.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.conversation.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.message.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      })
    ])

    // 计算今日活跃用户（有会话记录的用户）
    const todayActiveSessions = await prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        startTime: {
          gte: today
        }
      }
    })

    const todayActiveUsers = todayActiveSessions.length

    // 插入今日统计
    await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableAppToken}/tables/${dailyStatsTableId}/records`,
      {
        fields: {
          '日期': today.toISOString().split('T')[0],
          '总用户数': totalUsers,
          '总对话数': totalConversations,
          '总消息数': totalMessages,
          '总文档数': totalDocuments,
          '今日新增用户': todayNewUsers,
          '今日对话数': todayConversations,
          '今日消息数': todayMessages,
          '今日活跃用户': todayActiveUsers,
          '更新时间': new Date().toISOString()
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('每日统计数据同步完成！')
  } catch (error) {
    console.error('同步每日统计到飞书失败:', error)
    throw error
  }
}

/**
 * 执行完整同步
 */
export async function syncAllToFeishu(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('开始同步数据到飞书...')

    // 同步用户统计
    await syncUsersToFeishu()

    // 同步每日统计
    await syncDailyStatsToFeishu()

    return {
      success: true,
      message: '数据同步成功'
    }
  } catch (error: any) {
    console.error('同步到飞书失败:', error)
    return {
      success: false,
      message: error.message || '同步失败'
    }
  }
}
