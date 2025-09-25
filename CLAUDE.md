【项目目标】
- 我正在开发一个面向中国大陆 8–15 岁学生与家长的学习工具。
- 产品包含两个页面：
  1. 对话页 /chat：与大模型对话；支持上传单张图片（错题等）；支持选择知识库分类作为检索上下文；可以上传文档到知识库；显示对话历史。
  2. 知识库页 /kb：支持知识库分类的创建/管理；上传/预览/删除文档；文档统一私有但可分分类保存。
- 所有用户的对话消息都要保存，后续我会查询/导出使用。
- 左下角统一有头像+姓名，点击弹出个人信息窗口（名称、年龄、年级、手机号、头像），可修改。

【技术栈与平台】
- 前端：Vue 3 + Vite + TypeScript。
- 后端：Node.js + Express + TypeScript。
- 数据库：PostgreSQL（部署在阿里云 RDS），包含 users/profiles/kb_categories/kb_documents/kb_chunks/conversations/messages。
- 存储：阿里云 OSS（私有 Bucket，100MB 限制），通过后端签发预签名 URL 上传文档和图片。
- 大模型：DeepSeek Chat（文字对话），阿里云 OCR（识别用户上传的图片文字），OCR 结果拼到对话上下文再送给 DeepSeek。
- 部署：阿里云 ECS + Nginx，绑定我已购买的阿里云域名，启用 HTTPS。

【功能要求】
- 登录方式：邮箱 + 密码（JWT 认证）。
- 上传文件：限制 100MB；支持 PDF / DOCX / TXT 文档和单张 PNG/JPG 图片。
- 文档解析：尽可能精确，清理页眉/页脚/目录，按约 400 字切片，存入 kb_chunks。
- 对话逻辑：
  - 普通文字消息 → 直接送 DeepSeek。
  - 携带图片 → 调用阿里云 OCR → 拼接识别结果再送 DeepSeek。
  - 选择知识库分类 → 在对应分类中检索 kb_chunks，取片段拼到上下文。
  - 返回的回答必须带 citations（文档名-片段）。
- 对话历史：所有消息（文字、图片、OCR 结果、引用）都保存到 messages 表，可查询和导出。
- UI 要求：长文件名截断显示（省略号），预览/删除按钮固定在卡片内；上传超限时友好提示。

【安全与合规】
- 所有 AccessKey/Secret、JWT_SECRET、DB_URL 等仅保存在后端 .env，不得出现在前端。
- 前端与后端通信统一加 Authorization: Bearer <token>。
- 对象存储走预签名 URL，不直接暴露永久密钥。