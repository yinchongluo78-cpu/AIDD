import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import conversationsRoutes from './routes/conversations'
import kbRoutes from './routes/kb'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
export const prisma = new PrismaClient()

const corsOptions = {
  origin: process.env.NODE_ENV === 'development' ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] : false,
  credentials: true
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '120mb' }))
app.use(express.urlencoded({ limit: '120mb', extended: true }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/conversations', conversationsRoutes)
app.use('/api/kb', kbRoutes)

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`)
})