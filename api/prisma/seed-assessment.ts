import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始插入测评系统示例数据...')

  // ==================== 1. 创建4个测评模块 ====================
  console.log('\n📦 创建测评模块...')

  const personalityModule = await prisma.assessmentModule.upsert({
    where: { slug: 'personality' },
    update: {},
    create: {
      slug: 'personality',
      name: '性格测评',
      type: 'personality',
      isRequired: true,
      isActive: true,
      sortOrder: 1
    }
  })
  console.log('✅ 性格测评模块已创建')

  const cognitionModule = await prisma.assessmentModule.upsert({
    where: { slug: 'logical_math' },
    update: {},
    create: {
      slug: 'logical_math',
      name: '数理逻辑测评',
      type: 'cognition',
      isRequired: true,
      isActive: true,
      sortOrder: 2
    }
  })
  console.log('✅ 数理逻辑测评模块已创建')

  const talentModule = await prisma.assessmentModule.upsert({
    where: { slug: 'talent' },
    update: {},
    create: {
      slug: 'talent',
      name: '天赋倾向测评',
      type: 'talent',
      isRequired: true,
      isActive: true,
      sortOrder: 3
    }
  })
  console.log('✅ 天赋倾向测评模块已创建')

  const knowledgeModule = await prisma.assessmentModule.upsert({
    where: { slug: 'knowledge_mastery' },
    update: {},
    create: {
      slug: 'knowledge_mastery',
      name: '知识点掌握测评',
      type: 'knowledge',
      isRequired: true,
      isActive: true,
      sortOrder: 4
    }
  })
  console.log('✅ 知识点掌握测评模块已创建')

  const dailyKnowledgeModule = await prisma.assessmentModule.upsert({
    where: { slug: 'daily_knowledge' },
    update: {},
    create: {
      slug: 'daily_knowledge',
      name: '每日知识测评',
      type: 'knowledge',
      isRequired: false,
      isActive: true,
      sortOrder: 5
    }
  })
  console.log('✅ 每日知识测评模块已创建')

  // ==================== 2. 插入性格测评题目 ====================
  console.log('\n📝 插入性格测评题目...')

  const personalityQuestions = [
    {
      content: '在团队合作中，你更倾向于：',
      options: [
        { key: 'A', text: '主动承担领导角色，组织大家' },
        { key: 'B', text: '积极参与讨论，贡献想法' },
        { key: 'C', text: '默默执行任务，做好自己的部分' },
        { key: 'D', text: '观察学习，必要时提供帮助' }
      ],
      questionType: 'single_choice',
      order: 1
    },
    {
      content: '面对困难的数学题时，你通常会：',
      options: [
        { key: 'A', text: '立刻尝试多种方法解决' },
        { key: 'B', text: '先思考一会儿，再动手' },
        { key: 'C', text: '寻求老师或同学帮助' },
        { key: 'D', text: '暂时放下，过一会再试' }
      ],
      questionType: 'single_choice',
      order: 2
    },
    {
      content: '你更喜欢哪种学习方式？（可多选）',
      options: [
        { key: 'A', text: '看书自学' },
        { key: 'B', text: '听老师讲解' },
        { key: 'C', text: '动手实践' },
        { key: 'D', text: '和同学讨论' }
      ],
      questionType: 'multi_choice',
      order: 3
    },
    {
      content: '你认为自己是一个有耐心的人吗？（1=非常没耐心，5=非常有耐心）',
      options: [
        { key: '1', text: '1' },
        { key: '2', text: '2' },
        { key: '3', text: '3' },
        { key: '4', text: '4' },
        { key: '5', text: '5' }
      ],
      questionType: 'scale',
      order: 4
    },
    {
      content: '面对新环境（如转学、新班级），你的感受是：',
      options: [
        { key: 'A', text: '兴奋期待，想认识新朋友' },
        { key: 'B', text: '有点紧张，但能适应' },
        { key: 'C', text: '很不安，需要时间适应' },
        { key: 'D', text: '不太在意，顺其自然' }
      ],
      questionType: 'single_choice',
      order: 5
    }
  ]

  for (const q of personalityQuestions) {
    await prisma.assessmentQuestion.create({
      data: {
        moduleId: personalityModule.id,
        content: q.content,
        options: q.options,
        correctKey: null,
        questionType: q.questionType,
        targetGrade: null,
        order: q.order
      }
    })
  }
  console.log(`✅ 已插入 ${personalityQuestions.length} 道性格测评题目`)

  // ==================== 3. 插入数理逻辑测评题目 ====================
  console.log('\n📝 插入数理逻辑测评题目...')

  const cognitionQuestions = [
    {
      content: '找规律：2, 4, 8, 16, ___',
      options: [
        { key: 'A', text: '20' },
        { key: 'B', text: '24' },
        { key: 'C', text: '32' },
        { key: 'D', text: '64' }
      ],
      correctKey: 'C',
      questionType: 'single_choice',
      order: 1
    },
    {
      content: '小明有5个苹果，小红有3个苹果，如果小明给小红2个苹果，现在谁的苹果多？',
      options: [
        { key: 'A', text: '小明多' },
        { key: 'B', text: '小红多' },
        { key: 'C', text: '一样多' },
        { key: 'D', text: '无法确定' }
      ],
      correctKey: 'C',
      questionType: 'single_choice',
      order: 2
    },
    {
      content: '一个正方形有几条对称轴？',
      options: [
        { key: 'A', text: '1条' },
        { key: 'B', text: '2条' },
        { key: 'C', text: '4条' },
        { key: 'D', text: '8条' }
      ],
      correctKey: 'C',
      questionType: 'single_choice',
      order: 3
    },
    {
      content: '如果所有的猫都是动物，而小花是一只猫，那么小花是：',
      options: [
        { key: 'A', text: '动物' },
        { key: 'B', text: '植物' },
        { key: 'C', text: '可能是动物也可能不是' },
        { key: 'D', text: '无法判断' }
      ],
      correctKey: 'A',
      questionType: 'single_choice',
      order: 4
    },
    {
      content: '找出不同类：苹果、香蕉、西瓜、土豆',
      options: [
        { key: 'A', text: '苹果' },
        { key: 'B', text: '香蕉' },
        { key: 'C', text: '西瓜' },
        { key: 'D', text: '土豆' }
      ],
      correctKey: 'D',
      questionType: 'single_choice',
      order: 5
    }
  ]

  for (const q of cognitionQuestions) {
    await prisma.assessmentQuestion.create({
      data: {
        moduleId: cognitionModule.id,
        content: q.content,
        options: q.options,
        correctKey: q.correctKey,
        questionType: q.questionType,
        targetGrade: null,
        order: q.order
      }
    })
  }
  console.log(`✅ 已插入 ${cognitionQuestions.length} 道数理逻辑测评题目`)

  // ==================== 4. 插入天赋倾向测评题目 ====================
  console.log('\n📝 插入天赋倾向测评题目...')

  const talentQuestions = [
    {
      content: '你更擅长哪种活动？',
      options: [
        { key: 'A', text: '画画、手工制作' },
        { key: 'B', text: '唱歌、演奏乐器' },
        { key: 'C', text: '运动、跳舞' },
        { key: 'D', text: '阅读、写作' }
      ],
      questionType: 'single_choice',
      order: 1
    },
    {
      content: '在这些学科中，你最喜欢哪些？（可多选）',
      options: [
        { key: 'A', text: '数学' },
        { key: 'B', text: '语文' },
        { key: 'C', text: '英语' },
        { key: 'D', text: '科学' },
        { key: 'E', text: '美术/音乐' },
        { key: 'F', text: '体育' }
      ],
      questionType: 'multi_choice',
      order: 2
    },
    {
      content: '空闲时间你最喜欢做什么？',
      options: [
        { key: 'A', text: '看书、学习新知识' },
        { key: 'B', text: '玩游戏、看动画' },
        { key: 'C', text: '做手工、画画' },
        { key: 'D', text: '运动、户外活动' }
      ],
      questionType: 'single_choice',
      order: 3
    },
    {
      content: '你能快速记住：',
      options: [
        { key: 'A', text: '数字和公式' },
        { key: 'B', text: '歌曲和旋律' },
        { key: 'C', text: '图片和颜色' },
        { key: 'D', text: '故事和文字' }
      ],
      questionType: 'single_choice',
      order: 4
    },
    {
      content: '面对拼图或积木，你会：',
      options: [
        { key: 'A', text: '很快找到规律完成' },
        { key: 'B', text: '需要一些时间思考' },
        { key: 'C', text: '觉得有点困难' },
        { key: 'D', text: '不太感兴趣' }
      ],
      questionType: 'single_choice',
      order: 5
    }
  ]

  for (const q of talentQuestions) {
    await prisma.assessmentQuestion.create({
      data: {
        moduleId: talentModule.id,
        content: q.content,
        options: q.options,
        correctKey: null,
        questionType: q.questionType,
        targetGrade: null,
        order: q.order
      }
    })
  }
  console.log(`✅ 已插入 ${talentQuestions.length} 道天赋倾向测评题目`)

  // ==================== 5. 插入知识点掌握测评题目（按年级分类） ====================
  console.log('\n📝 插入知识点掌握测评题目...')

  const knowledgeQuestions = [
    // 小学4-6年级题目
    {
      content: '下列哪个是质数？',
      options: [
        { key: 'A', text: '6' },
        { key: 'B', text: '9' },
        { key: 'C', text: '11' },
        { key: 'D', text: '15' }
      ],
      correctKey: 'C',
      questionType: 'single_choice',
      targetGrade: '小学4-6年级',
      order: 1
    },
    {
      content: '一个长方形的长是8cm，宽是5cm，它的周长是多少？',
      options: [
        { key: 'A', text: '13cm' },
        { key: 'B', text: '26cm' },
        { key: 'C', text: '40cm' },
        { key: 'D', text: '80cm' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '小学4-6年级',
      order: 2
    },
    {
      content: '下列词语中，哪个是反义词？',
      options: [
        { key: 'A', text: '高兴-开心' },
        { key: 'B', text: '美丽-漂亮' },
        { key: 'C', text: '勇敢-胆小' },
        { key: 'D', text: '聪明-智慧' }
      ],
      correctKey: 'C',
      questionType: 'single_choice',
      targetGrade: '小学4-6年级',
      order: 3
    },
    // 初中1-3年级题目
    {
      content: '解方程：2x + 5 = 13，x = ?',
      options: [
        { key: 'A', text: '3' },
        { key: 'B', text: '4' },
        { key: 'C', text: '5' },
        { key: 'D', text: '6' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '初中1-3年级',
      order: 4
    },
    {
      content: '光合作用的主要产物是什么？',
      options: [
        { key: 'A', text: '氧气和水' },
        { key: 'B', text: '葡萄糖和氧气' },
        { key: 'C', text: '二氧化碳和水' },
        { key: 'D', text: '蛋白质和氧气' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '初中1-3年级',
      order: 5
    },
    {
      content: '下列哪个不是中国四大名著？',
      options: [
        { key: 'A', text: '《红楼梦》' },
        { key: 'B', text: '《水浒传》' },
        { key: 'C', text: '《封神演义》' },
        { key: 'D', text: '《西游记》' }
      ],
      correctKey: 'C',
      questionType: 'single_choice',
      targetGrade: '初中1-3年级',
      order: 6
    },
    // 高中1-3年级题目
    {
      content: '下列化学方程式正确的是：',
      options: [
        { key: 'A', text: '2H₂ + O₂ → 2H₂O' },
        { key: 'B', text: 'H₂ + O₂ → H₂O' },
        { key: 'C', text: '2H₂ + O₂ → H₂O' },
        { key: 'D', text: 'H₂ + 2O₂ → 2H₂O' }
      ],
      correctKey: 'A',
      questionType: 'single_choice',
      targetGrade: '高中1-3年级',
      order: 7
    },
    {
      content: '函数 y = x² 的图像是：',
      options: [
        { key: 'A', text: '直线' },
        { key: 'B', text: '抛物线' },
        { key: 'C', text: '双曲线' },
        { key: 'D', text: '圆' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '高中1-3年级',
      order: 8
    }
  ]

  for (const q of knowledgeQuestions) {
    await prisma.assessmentQuestion.create({
      data: {
        moduleId: knowledgeModule.id,
        content: q.content,
        options: q.options,
        correctKey: q.correctKey,
        questionType: q.questionType,
        targetGrade: q.targetGrade,
        order: q.order
      }
    })
  }
  console.log(`✅ 已插入 ${knowledgeQuestions.length} 道知识点掌握测评题目`)

  // ==================== 6. 插入每日知识测评题目（与知识点掌握共享题库） ====================
  console.log('\n📝 插入每日知识测评题目...')

  const dailyQuestions = [
    // 小学题目
    {
      content: '12 × 5 = ?',
      options: [
        { key: 'A', text: '50' },
        { key: 'B', text: '60' },
        { key: 'C', text: '70' },
        { key: 'D', text: '80' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '小学4-6年级',
      order: 1
    },
    {
      content: '0.5 + 0.3 = ?',
      options: [
        { key: 'A', text: '0.7' },
        { key: 'B', text: '0.8' },
        { key: 'C', text: '0.9' },
        { key: 'D', text: '1.0' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '小学4-6年级',
      order: 2
    },
    {
      content: '"春风又绿江南岸"的下一句是：',
      options: [
        { key: 'A', text: '明月何时照我还' },
        { key: 'B', text: '千里江陵一日还' },
        { key: 'C', text: '轻舟已过万重山' },
        { key: 'D', text: '两岸青山相对出' }
      ],
      correctKey: 'A',
      questionType: 'single_choice',
      targetGrade: '小学4-6年级',
      order: 3
    },
    // 初中题目
    {
      content: '等腰三角形两边长分别为5和10，则第三边长为：',
      options: [
        { key: 'A', text: '5' },
        { key: 'B', text: '10' },
        { key: 'C', text: '5或10' },
        { key: 'D', text: '无法确定' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '初中1-3年级',
      order: 4
    },
    {
      content: '(-2)³ = ?',
      options: [
        { key: 'A', text: '-6' },
        { key: 'B', text: '-8' },
        { key: 'C', text: '6' },
        { key: 'D', text: '8' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '初中1-3年级',
      order: 5
    },
    {
      content: '水的沸点在标准大气压下是：',
      options: [
        { key: 'A', text: '90℃' },
        { key: 'B', text: '95℃' },
        { key: 'C', text: '100℃' },
        { key: 'D', text: '105℃' }
      ],
      correctKey: 'C',
      questionType: 'single_choice',
      targetGrade: '初中1-3年级',
      order: 6
    },
    // 高中题目
    {
      content: 'sin²α + cos²α = ?',
      options: [
        { key: 'A', text: '0' },
        { key: 'B', text: '1' },
        { key: 'C', text: '2' },
        { key: 'D', text: 'α' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '高中1-3年级',
      order: 7
    },
    {
      content: '细胞的能量工厂是：',
      options: [
        { key: 'A', text: '细胞核' },
        { key: 'B', text: '线粒体' },
        { key: 'C', text: '叶绿体' },
        { key: 'D', text: '核糖体' }
      ],
      correctKey: 'B',
      questionType: 'single_choice',
      targetGrade: '高中1-3年级',
      order: 8
    }
  ]

  for (const q of dailyQuestions) {
    await prisma.assessmentQuestion.create({
      data: {
        moduleId: dailyKnowledgeModule.id,
        content: q.content,
        options: q.options,
        correctKey: q.correctKey,
        questionType: q.questionType,
        targetGrade: q.targetGrade,
        order: q.order
      }
    })
  }
  console.log(`✅ 已插入 ${dailyQuestions.length} 道每日知识测评题目`)

  console.log('\n🎉 测评系统示例数据插入完成！')
  console.log('\n📊 数据统计：')
  console.log(`- 测评模块数：5个`)
  console.log(`- 性格测评题目：${personalityQuestions.length}道`)
  console.log(`- 数理逻辑题目：${cognitionQuestions.length}道`)
  console.log(`- 天赋倾向题目：${talentQuestions.length}道`)
  console.log(`- 知识点掌握题目：${knowledgeQuestions.length}道`)
  console.log(`- 每日知识题目：${dailyQuestions.length}道`)
  console.log(`- 总计题目数：${personalityQuestions.length + cognitionQuestions.length + talentQuestions.length + knowledgeQuestions.length + dailyQuestions.length}道`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ 数据插入失败:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
