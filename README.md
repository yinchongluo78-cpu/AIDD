# Monorepo 项目

## 快速启动

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 项目结构
- `/web` - Vue 3 前端应用 (端口 5173)
- `/api` - Express 后端服务 (端口 3000)

## 访问地址
- 前端: http://localhost:5173
- 后端健康检查: http://localhost:3000/api/health

## 数据库设置

### 初始化数据库
```bash
# 进入 API 目录
cd api

# 复制环境变量配置
cp .env.sample .env
# 编辑 .env 文件，配置正确的 DATABASE_URL

# 生成 Prisma Client
pnpm prisma generate

# 创建并运行数据库迁移
pnpm prisma migrate dev --name init_schema
```

### 数据库表结构
项目包含 7 张表：
- `users` - 用户表
- `profiles` - 用户资料表
- `kb_categories` - 知识库分类表
- `kb_documents` - 知识库文档表
- `kb_chunks` - 文档分块表
- `conversations` - 对话表
- `messages` - 消息表