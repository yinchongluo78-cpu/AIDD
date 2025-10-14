# 管理后台使用指南

## 快速开始

### 本地测试
```bash
# 1. 进入管理后台目录
cd /Users/luoyinchong/Desktop/lyc2/admin

# 2. 启动开发服务器
npm run dev

# 3. 访问 http://localhost:3002
# 4. 输入密码: 1234567
```

### 生产部署
```bash
# 1. 构建
cd /Users/luoyinchong/Desktop/lyc2/admin
npx vite build

# 2. 部署到服务器
tar -czf admin-dist.tar.gz dist/
scp admin-dist.tar.gz root@120.24.22.244:/var/www/

# 3. 在服务器上解压
ssh root@120.24.22.244
mkdir -p /var/www/admin
cd /var/www/admin
tar -xzf /var/www/admin-dist.tar.gz --strip-components=1

# 4. 配置 Nginx 并重启(见下方配置)
```

## 功能模块

### 1. 概览页 (`/overview`)
- 总用户数、对话数、消息数、文档数统计
- 最近活跃用户(5个)
- 最近对话(5个)

### 2. 用户管理 (`/users`)
- 用户列表(支持分页、搜索)
- 用户详情(个人信息、学习统计、最近对话)
- 导出用户数据为 Excel

### 3. 对话分析 (`/conversations`)
- 对话列表(支持分页、搜索)
- 对话详情(完整消息内容、自定义指令、图片)
- 导出对话数据为 Excel

### 4. 知识库 (`/knowledge-base`)
- 文档列表(用户、文件名、分类、切片数)
- 分类统计
- 用户使用情况(文档数、总大小、最后上传时间)

### 5. 系统监控 (`/system`)
- API 调用统计(DeepSeek、OCR 次数)
- 成本估算(DeepSeek、OCR、OSS)
- 数据库统计(用户、对话、消息、切片)
- 最近 API 调用日志

## Nginx 配置

### 方式一: 独立子域名 (推荐)

```nginx
# /etc/nginx/sites-available/admin.lyc-ai.com
server {
    listen 80;
    server_name admin.lyc-ai.com;

    root /var/www/admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/admin {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用:
```bash
ln -s /etc/nginx/sites-available/admin.lyc-ai.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

访问: http://admin.lyc-ai.com (记得配置域名解析)

### 方式二: 主域名子路径

在现有 `lyc-ai.com` 配置中添加:
```nginx
location /admin {
    alias /var/www/admin;
    try_files $uri $uri/ /admin/index.html;
}
```

访问: https://lyc-ai.com/admin

## 后端 API

已在 `api/src/routes/admin.ts` 中实现,已注册到 `api/src/index.ts`:

### 主要接口
- 概览: `/api/admin/stats`, `/api/admin/recent-users`, `/api/admin/recent-conversations`
- 用户: `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/users/export`
- 对话: `/api/admin/conversations`, `/api/admin/conversations/:id`, `/api/admin/conversations/export`
- 知识库: `/api/admin/knowledge-base/stats`, `/api/admin/knowledge-base/documents`, `/api/admin/knowledge-base/categories`, `/api/admin/knowledge-base/usage`
- 系统: `/api/admin/system/stats`, `/api/admin/system/api-logs`

## 重要说明

1. **认证方式**: 简单密码认证,密码硬编码为 `1234567`,存储在 `sessionStorage`
2. **无权限控制**: 登录后可查看所有用户数据
3. **数据导出**: 支持导出用户列表和对话记录为 Excel
4. **独立项目**: 管理后台是独立前端项目,与主应用完全分离

## 安全建议

生产环境建议:
1. 修改默认密码(在 `admin/src/views/Login.vue` 中修改)
2. 配置 Nginx IP 白名单
3. 启用 HTTPS
4. 添加访问日志监控

## 技术栈

- Vue 3 + TypeScript + Vite
- Element Plus (UI 框架)
- Vue Router (路由)
- Axios (HTTP 请求)
- XLSX (Excel 导出)

## 目录结构

```
admin/
├── src/
│   ├── views/          # 页面组件
│   ├── router.ts       # 路由配置
│   ├── api.ts          # API 封装
│   └── main.ts
├── .env.development    # 开发环境配置
├── .env.production     # 生产环境配置
└── dist/               # 构建产物
```

## 常见问题

**Q: TypeScript 构建报错?**
A: 使用 `npx vite build` 跳过类型检查

**Q: 数据显示为空?**
A: 检查 `.env.production` 中的 `VITE_API_URL` 是否正确

**Q: 刷新页面需要重新登录?**
A: 正常,使用 `sessionStorage`,关闭标签页会清除认证

**Q: 导出 Excel 乱码?**
A: 用 Excel 打开时选择 UTF-8 编码

---

**默认访问密码**: `1234567`

详细部署文档请查看: [ADMIN_DEPLOY.md](./ADMIN_DEPLOY.md)
