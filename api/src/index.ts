import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import conversationsRoutes from './routes/conversations'
import kbRoutes from './routes/kb'
import chatRoutes from './routes/chat'
import uploadRoutes from './routes/upload'
import adminRoutes from './routes/admin'
import diagnosticRoutes from './routes/diagnostic'

dotenv.config()

// 全局 BigInt 序列化支持
// @ts-ignore
BigInt.prototype.toJSON = function() {
  return Number(this)
}

const app = express()
const PORT = process.env.PORT || 3000
export const prisma = new PrismaClient()

const corsOptions = {
  origin: true, // 允许所有来源
  credentials: true
}

app.use(cors(corsOptions))
// 增加请求体大小限制到120MB，支持大文件上传
app.use(express.json({ limit: '120mb' }))
app.use(express.urlencoded({ limit: '120mb', extended: true }))

// 提供静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/conversations', conversationsRoutes)
app.use('/api/kb', kbRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/diagnostic', diagnosticRoutes)

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`)
})
