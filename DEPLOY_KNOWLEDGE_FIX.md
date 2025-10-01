# 知识库修复部署指南

## 问题说明
知识库文档无法被大模型识别的问题已修复。主要改进：
1. 文档上传后自动解析和切片存储
2. 对话时智能检索相关文档片段
3. 避免文档内容被截断的问题

## 部署步骤

### 1. 上传修复文件到服务器
```bash
# 上传部署包
scp knowledge-base-fix.tar.gz root@120.24.22.244:/root/

# 登录服务器
ssh root@120.24.22.244

# 解压文件
cd /root
tar -xzf knowledge-base-fix.tar.gz
```

### 2. 更新服务器代码
```bash
# 假设您的项目目录在 /root/lyc2
cd /root/lyc2

# 备份现有文件
cp api/src/routes/conversations.ts api/src/routes/conversations.ts.backup
cp api/src/routes/kb.ts api/src/routes/kb.ts.backup
cp web/src/pages/Chat.vue web/src/pages/Chat.vue.backup

# 复制新文件
cp /root/api/src/services/documentParser.ts api/src/services/
cp /root/api/src/routes/conversations.ts api/src/routes/
cp /root/api/src/routes/kb.ts api/src/routes/
cp /root/web/src/pages/Chat.vue web/src/pages/
```

### 3. 重新构建和重启服务
```bash
# 重新构建前端
cd web
npm run build

# 重启服务
pm2 restart api
pm2 restart web

# 查看服务状态
pm2 status
pm2 logs api --lines 20
pm2 logs web --lines 20
```

### 4. 测试修复效果

1. **上传测试文档**：
   - 访问 http://120.24.22.244/kb
   - 创建新分类
   - 上传一个markdown或PDF文档

2. **测试知识库引用**：
   - 访问 http://120.24.22.244/chat
   - 选择刚创建的知识库分类
   - 询问文档相关问题
   - 检查AI是否能正确引用文档内容

## 修复的功能

### 后端改进
- **documentParser.ts**：新增文档解析服务，自动将文档切片存储
- **conversations.ts**：支持知识库检索，根据用户问题智能匹配相关内容
- **kb.ts**：文档上传后自动调用解析服务

### 前端改进
- **Chat.vue**：发送知识库分类ID而不是完整文档内容，避免内容截断

## 验证成功标志
- 上传文档后能看到"解析完成，生成X个切片"的日志
- 对话时能看到"开始知识库检索..."和"找到X个相关文档片段"的日志
- AI回答中包含具体的文档引用信息
- 不再出现"无法提供文档内容"的回复

## 回滚方案
如果出现问题，可以快速回滚：
```bash
cd /root/lyc2
cp api/src/routes/conversations.ts.backup api/src/routes/conversations.ts
cp api/src/routes/kb.ts.backup api/src/routes/kb.ts
cp web/src/pages/Chat.vue.backup web/src/pages/Chat.vue
rm api/src/services/documentParser.ts
npm run build
pm2 restart all
```