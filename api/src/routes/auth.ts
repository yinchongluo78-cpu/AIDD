import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ message: '邮箱已被注册' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        profile: {
          create: {}
        }
      },
      include: {
        profile: true
      }
    })

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.profile?.name,
        avatar: user.profile?.avatarUrl
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({ message: '注册失败' })
  }
})

router.post('/login', async (req, res) => {
  console.log('🔵 收到登录请求!', {
    body: req.body,
    headers: req.headers
  })

  try {
    const { email, password } = req.body

    console.log('📧 查询用户:', email)

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true
      }
    })

    if (!user) {
      console.log('❌ 用户不存在:', email)
      return res.status(401).json({ message: '邮箱或密码错误' })
    }

    console.log('✅ 用户找到,验证密码...')
    const validPassword = await bcrypt.compare(password, user.passwordHash)

    if (!validPassword) {
      console.log('❌ 密码错误')
      return res.status(401).json({ message: '邮箱或密码错误' })
    }

    console.log('✅ 密码正确,生成token...')
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )

    console.log('✅ 登录成功!')
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.profile?.name,
        avatar: user.profile?.avatarUrl,
        age: user.profile?.age,
        grade: user.profile?.grade,
        phone: user.profile?.phone
      }
    })
  } catch (error) {
    console.error('❌ 登录错误:', error)
    res.status(500).json({ message: '登录失败' })
  }
})

export default router