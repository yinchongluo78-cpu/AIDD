import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { uploadFile, getSignedUrl } from '../services/oss'

const router = Router()

// 创建上传目录（备用）
const uploadDir = path.join(__dirname, '../../uploads')
fs.mkdir(uploadDir, { recursive: true }).catch(console.error)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
})

// 上传文件到OSS
async function saveFileToOSS(file: Express.Multer.File, folder: string = 'uploads'): Promise<{ url: string; key: string }> {
  const ext = path.extname(file.originalname)
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`
  const key = `${folder}/${filename}`

  // 上传到OSS
  await uploadFile(key, file.buffer)

  // 生成1小时有效期的预签名URL用于前端显示
  const signedUrl = await getSignedUrl(key, 3600)

  return {
    url: signedUrl,
    key: key
  }
}

// 模拟文件上传服务（本地备用，已弃用）
async function saveFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<{ url: string; key: string }> {
  const ext = path.extname(file.originalname)
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`
  const folderPath = path.join(uploadDir, folder)

  // 确保文件夹存在
  await fs.mkdir(folderPath, { recursive: true })

  const filePath = path.join(folderPath, filename)
  const key = `${folder}/${filename}`

  // 保存文件
  await fs.writeFile(filePath, file.buffer)

  return {
    url: `/uploads/${key}`,
    key: key
  }
}

// 上传图片
router.post('/image', authenticateToken, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择图片' })
    }

    console.log('开始上传图片到OSS...')
    const result = await saveFileToOSS(req.file, 'images')
    console.log('图片上传OSS成功:', result.key)
    res.json(result)
  } catch (error) {
    console.error('上传图片错误:', error)
    res.status(500).json({ message: '上传失败' })
  }
})

// 上传文档
router.post('/document', authenticateToken, upload.single('document'), async (req: AuthRequest, res) => {
  try {
    console.log('=== 文档上传接口调用 ===')
    console.log('用户ID:', req.userId)
    console.log('接收到的文件信息:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : '无文件')

    if (!req.file) {
      console.log('错误: 没有接收到文件')
      return res.status(400).json({ message: '请选择文档' })
    }

    console.log('开始上传文件到OSS...')
    const result = await saveFileToOSS(req.file, 'documents')
    console.log('文件保存到OSS成功:', result.key)

    // 确保文件名正确编码
    const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    console.log('处理后的文件名:', fileName)

    const response = {
      ...result,
      name: fileName,
      type: req.file.mimetype,
      size: req.file.size
    }

    console.log('文档上传成功，返回结果:', response)
    res.json(response)
  } catch (error) {
    console.error('上传文档错误详细信息:', {
      error: error,
      message: (error as any).message,
      stack: (error as any).stack
    })
    res.status(500).json({ message: '上传失败' })
  }
})

// 上传头像
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择头像' })
    }

    console.log('开始上传头像到OSS...')
    const result = await saveFileToOSS(req.file, 'avatars')
    console.log('头像上传OSS成功:', result.key)
    res.json(result)
  } catch (error) {
    console.error('上传头像错误:', error)
    res.status(500).json({ message: '上传失败' })
  }
})

export default router