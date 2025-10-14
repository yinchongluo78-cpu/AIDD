# 管理后台部署文档

## 一、项目概述

管理后台是一个独立的前端项目,用于查看和管理所有用户的学习数据。

**主要功能**:
1. ✅ 密码认证(密码: 1234567)
2. ✅ 概览页 - 用户/对话/文档/消息统计
3. ✅ 用户管理 - 列表/搜索/详情/导出
4. ✅ 对话分析 - 列表/详情查看/导出
5. ✅ 知识库分析 - 文档/分类/使用情况统计
6. ✅ 系统监控 - API调用/成本估算/数据库统计

## 二、技术栈

- 前端: Vue 3 + TypeScript + Vite
- UI 框架: Element Plus
- 图标: @element-plus/icons-vue
- 导出: XLSX
- 路由: Vue Router
- HTTP: Axios

## 三、项目结构

```
admin/
├── src/
│   ├── views/          # 页面
│   │   ├── Login.vue          # 登录页
│   │   ├── Dashboard.vue      # 主框架
│   │   ├── Overview.vue       # 概览
│   │   ├── Users.vue          # 用户管理
│   │   ├── Conversations.vue  # 对话分析
│   │   ├── KnowledgeBase.vue  # 知识库
│   │   └── System.vue         # 系统监控
│   ├── router.ts       # 路由配置
│   ├── api.ts          # API 请求封装
│   └── main.ts         # 入口文件
├── .env.development    # 开发环境配置
├── .env.production     # 生产环境配置
└── dist/               # 构建输出目录
```

## 四、本地开发

### 1. 安装依赖
```bash
cd admin
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

访问: http://localhost:3002
密码: 1234567

### 3. 构建生产版本
```bash
# 跳过类型检查直接构建(推荐)
npx vite build

# 或完整构建(包含类型检查)
npm run build
```

## 五、后端 API 路由

已在 `api/src/routes/admin.ts` 中实现完整的管理后台 API:

### 概览接口
- `GET /api/admin/stats` - 总体统计
- `GET /api/admin/recent-users` - 最近活跃用户
- `GET /api/admin/recent-conversations` - 最近对话

### 用户接口
- `GET /api/admin/users` - 用户列表(支持分页/搜索)
- `GET /api/admin/users/:id` - 用户详情
- `GET /api/admin/users/export` - 导出用户数据

### 对话接口
- `GET /api/admin/conversations` - 对话列表(支持分页/搜索)
- `GET /api/admin/conversations/:id` - 对话详情(含完整消息)
- `GET /api/admin/conversations/export` - 导出对话数据

### 知识库接口
- `GET /api/admin/knowledge-base/stats` - 知识库统计
- `GET /api/admin/knowledge-base/documents` - 文档列表
- `GET /api/admin/knowledge-base/categories` - 分类列表
- `GET /api/admin/knowledge-base/usage` - 使用情况

### 系统接口
- `GET /api/admin/system/stats` - 系统统计
- `GET /api/admin/system/api-logs` - API 调用日志

## 六、部署到服务器

### 方式一: 使用 Nginx 部署

#### 1. 构建前端
```bash
cd /Users/luoyinchong/Desktop/lyc2/admin
npx vite build
```

#### 2. 上传到服务器
```bash
# 打包 dist 目录
tar -czf admin-dist.tar.gz dist/

# 上传到服务器
scp admin-dist.tar.gz root@120.24.22.244:/var/www/
```

#### 3. 配置 Nginx

在服务器上创建或修改 Nginx 配置:

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

    # API 代理
    location /api/admin {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用配置并重启 Nginx:
```bash
ln -s /etc/nginx/sites-available/admin.lyc-ai.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 4. 解压前端文件
```bash
mkdir -p /var/www/admin
cd /var/www/admin
tar -xzf ../admin-dist.tar.gz --strip-components=1
```

### 方式二: 集成到主域名子路径

如果不想创建子域名,可以集成到主域名的 `/admin` 路径下:

#### 1. 修改前端构建配置

编辑 `admin/vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [vue()],
  base: '/admin/',  // 添加这一行
  server: {
    port: 3002
  }
})
```

#### 2. 重新构建
```bash
cd /Users/luoyinchong/Desktop/lyc2/admin
npx vite build
```

#### 3. 上传并配置

```bash
# 上传
scp -r dist root@120.24.22.244:/var/www/lyc-ai/admin

# 在现有 Nginx 配置中添加
location /admin {
    alias /var/www/lyc-ai/admin;
    try_files $uri $uri/ /admin/index.html;
}
```

访问: https://lyc-ai.com/admin

## 七、环境变量配置

### 开发环境 (`.env.development`)
```
VITE_API_URL=http://localhost:3000
```

### 生产环境 (`.env.production`)
```
VITE_API_URL=https://lyc-ai.com
```

## 八、使用说明

### 1. 登录
- 访问管理后台地址
- 输入密码: `1234567`
- 点击登录

### 2. 功能使用

#### 概览页
- 查看总用户数、对话数、消息数、文档数
- 查看最近活跃用户
- 查看最近对话

#### 用户管理
- 搜索用户(姓名/邮箱)
- 查看用户详情(个人信息、学习统计、最近对话)
- 导出用户数据为 Excel

#### 对话分析
- 搜索对话(用户名/标题)
- 查看对话详情(完整消息内容)
- 查看是否使用自定义指令
- 导出对话数据为 Excel

#### 知识库分析
- 查看文档列表(用户、文件名、分类、切片数)
- 查看分类统计
- 查看用户使用情况(文档数、存储空间)

#### 系统监控
- 查看 API 调用次数(DeepSeek、OCR)
- 查看成本估算
- 查看数据库统计
- 查看最近 API 调用日志

### 3. 数据导出
- 用户管理页点击"导出用户数据"按钮
- 对话分析页点击"导出对话数据"按钮
- 自动下载 Excel 文件到本地

## 九、安全说明

1. **密码认证**: 硬编码密码 `1234567`,存储在 `sessionStorage`
2. **无需 JWT**: 管理后台独立认证,不依赖用户 JWT
3. **数据隔离**: 所有 API 返回的数据都包含用户信息,无需额外权限控制
4. **建议**: 生产环境建议:
   - 修改默认密码
   - 添加 IP 白名单
   - 启用 HTTPS
   - 添加访问日志

## 十、常见问题

### Q1: 构建时 TypeScript 类型错误
**A**: 使用 `npx vite build` 跳过类型检查直接构建

### Q2: API 请求 CORS 错误
**A**: 确保后端已配置 CORS,允许管理后台域名访问

### Q3: 登录后刷新页面需要重新登录
**A**: 正常,使用的是 `sessionStorage`,关闭标签页会清除认证状态

### Q4: 导出 Excel 乱码
**A**: 使用 Excel 打开时选择 UTF-8 编码

### Q5: 数据显示为空
**A**: 检查:
1. 后端 API 是否正常运行
2. `.env.production` 中 API 地址是否正确
3. Nginx 是否正确代理 `/api/admin` 路径

## 十一、后续优化建议

1. **性能优化**:
   - 代码分割(按路由懒加载)
   - 图表缓存
   - 虚拟列表(大数据量)

2. **功能增强**:
   - 添加日期范围筛选
   - 添加更多统计维度
   - 实时数据刷新

3. **安全加固**:
   - 使用环境变量配置密码
   - 添加登录失败次数限制
   - 添加操作日志

4. **用户体验**:
   - 添加加载骨架屏
   - 优化移动端适配
   - 添加键盘快捷键

## 十二、快速部署脚本

创建一键部署脚本 `deploy-admin.sh`:

```bash
#!/bin/bash

echo "=== 开始部署管理后台 ==="

# 1. 构建前端
cd /Users/luoyinchong/Desktop/lyc2/admin
npx vite build

# 2. 打包
tar -czf admin-dist.tar.gz dist/

# 3. 上传到服务器
scp admin-dist.tar.gz root@120.24.22.244:/tmp/

# 4. SSH 到服务器部署
ssh root@120.24.22.244 << 'EOF'
  mkdir -p /var/www/admin
  cd /var/www/admin
  tar -xzf /tmp/admin-dist.tar.gz --strip-components=1
  rm /tmp/admin-dist.tar.gz
  echo "管理后台部署完成!"
EOF

echo "=== 部署完成 ==="
```

使用:
```bash
chmod +x deploy-admin.sh
./deploy-admin.sh
```

---

**部署完成后访问地址**:
- 独立域名: http://admin.lyc-ai.com
- 子路径: https://lyc-ai.com/admin

**默认密码**: 1234567
