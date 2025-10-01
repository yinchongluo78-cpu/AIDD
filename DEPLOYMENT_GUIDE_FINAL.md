# 🚀 LYC AI 项目 - 完整部署指南

## 📋 目录
1. [修复总结](#修复总结)
2. [部署前准备](#部署前准备)
3. [部署步骤](#部署步骤)
4. [验证部署](#验证部署)
5. [后续配置](#后续配置)
6. [故障排查](#故障排查)

---

## 修复总结

### ✅ 已修复的核心问题

| 问题 | 修复方案 | 影响功能 |
|------|---------|---------|
| 本地文件存储导致OCR失败 | 配置阿里云OSS上传 | 图片OCR功能 |
| 图片base64无法被OCR识别 | 先上传获取URL再发送 | 图片识别 |
| 用户无法选择知识库 | 添加知识库选择UI | 知识库检索 |
| Nginx配置不完整 | 添加上传限制和超时 | 大文件上传 |
| 敏感信息可能泄露 | 完善.gitignore | 安全性 |

### 📦 新增文件

#### 核心代码
- `api/src/services/oss.ts` - OSS上传服务
- `web/src/pages/Chat.vue` - 更新(添加知识库选择器)
- `api/src/routes/upload.ts` - 更新(使用OSS)

#### 配置文件
- `nginx-production.conf` - 生产环境Nginx配置
- `.gitignore` - 更新(保护敏感信息)

#### 工具脚本
- `check-server-status.sh` - 服务器状态检查
- `deploy-production.sh` - 自动化部署脚本

#### 文档
- `FIXES_APPLIED.md` - 详细修复记录
- `DEPLOYMENT_GUIDE_FINAL.md` - 本文档

---

## 部署前准备

### 1. 检查服务器状态

运行状态检查脚本:
```bash
./check-server-status.sh
```

密码: `Lyc001286`

检查项目:
- ✓ 项目目录是否存在
- ✓ PM2进程是否运行
- ✓ Nginx配置是否正确
- ✓ 数据库连接是否正常
- ✓ 磁盘空间是否充足

### 2. 确认环境配置

**服务器信息**:
- 地址: 120.24.22.244
- 系统: Ubuntu/CentOS
- Node.js: v18+
- PM2: 已安装
- Nginx: 已安装

**数据库**:
- 类型: PostgreSQL 15
- 主机: pgm-wz9ar7chi0iaq54g.pg.rds.aliyuncs.com
- 端口: 5432
- 数据库: lyc_ai_db

**阿里云OSS**:
- Region: oss-cn-shenzhen
- Bucket: lyc-ai-storage
- AccessKey已配置

### 3. 备份现有数据(重要!)

```bash
# 登录服务器
ssh root@120.24.22.244

# 备份数据库
pg_dump -h pgm-wz9ar7chi0iaq54g.pg.rds.aliyuncs.com \
  -U postgres -d lyc_ai_db > backup_$(date +%Y%m%d).sql

# 备份当前代码
cd /var/www/lyc-ai
tar -czf ../lyc-ai-backup-$(date +%Y%m%d).tar.gz .
```

---

## 部署步骤

### 方法一: 自动部署(推荐)

```bash
# 在本地项目目录执行
./deploy-production.sh
```

脚本会自动:
1. ✓ 检查必要文件
2. ✓ 安装依赖
3. ✓ 构建前端和后端
4. ✓ 创建部署包
5. ✓ 上传到服务器
6. ✓ 解压并安装
7. ✓ 更新Nginx配置
8. ✓ 重启服务
9. ✓ 测试健康检查

### 方法二: 手动部署

如果自动部署失败,可以手动执行:

#### 步骤1: 本地构建
```bash
# 构建前端
cd web
npm install
npm run build
cd ..

# 编译后端
cd api
npm install
npm run build
cd ..
```

#### 步骤2: 创建部署包
```bash
tar -czf deploy-manual.tar.gz \
  web/dist \
  api/dist \
  api/src \
  api/package*.json \
  api/prisma \
  api/.env.production \
  nginx-production.conf
```

#### 步骤3: 上传到服务器
```bash
scp deploy-manual.tar.gz root@120.24.22.244:/tmp/
```

#### 步骤4: 服务器部署
```bash
ssh root@120.24.22.244

# 解压
cd /var/www/lyc-ai
tar -xzf /tmp/deploy-manual.tar.gz

# 安装依赖
cd api
npm install --production

# 更新Nginx
sudo cp /var/www/lyc-ai/nginx-production.conf /etc/nginx/conf.d/lyc-ai.conf
sudo nginx -t
sudo systemctl reload nginx

# 重启服务
pm2 restart lyc-ai-api

# 查看状态
pm2 list
pm2 logs lyc-ai-api --lines 20
```

---

## 验证部署

### 1. 健康检查

```bash
# API健康检查
curl http://120.24.22.244/api/health

# 预期输出: {"ok":true}
```

### 2. 功能测试

#### 测试图片OCR功能
1. 访问: http://120.24.22.244/chat
2. 点击图片上传按钮
3. 选择一张包含文字的图片
4. 检查是否能识别图片中的文字

#### 测试知识库功能
1. 访问: http://120.24.22.244/kb
2. 创建新分类
3. 上传一个文档
4. 返回对话页面
5. 选择刚创建的知识库
6. 提问相关问题
7. 检查AI是否引用文档内容

#### 测试大文件上传
1. 尝试上传50MB以上的文档
2. 检查是否上传成功

### 3. 查看日志

```bash
# 实时查看日志
ssh root@120.24.22.244 'pm2 logs lyc-ai-api --lines 50'

# 查看Nginx错误日志
ssh root@120.24.22.244 'tail -f /var/log/nginx/error.log'
```

---

## 后续配置

### 1. 配置域名和HTTPS

你提到已购买域名,现在可以配置:

#### 步骤1: 域名解析
在阿里云域名控制台添加A记录:
```
类型: A
主机记录: @ (或 www)
记录值: 120.24.22.244
TTL: 600
```

#### 步骤2: 申请SSL证书
```bash
ssh root@120.24.22.244

# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书(替换your-domain.com)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### 步骤3: 更新前端配置
修改 `web/.env.production`:
```
VITE_API_URL=https://your-domain.com/api
```

重新部署前端。

### 2. 清理临时文件

```bash
# 本地清理(在项目目录)
rm -f deploy-*.sh fix-*.sh check-*.sh
rm -f *.tar.gz
rm -f deploy-*.tar.gz

# 服务器清理
ssh root@120.24.22.244 'rm -f /tmp/deploy-*.tar.gz'
```

### 3. 提交代码

**重要**: 确保敏感信息已排除
```bash
# 查看将要提交的文件
git status

# 确认.env.production不在列表中
# 如果在,运行: git rm --cached api/.env.production

# 提交修复
git add .
git commit -m "修复: 配置OSS上传、添加知识库选择UI、更新Nginx配置"
git push
```

---

## 故障排查

### 问题1: 图片上传失败

**症状**: 上传图片时报错

**排查**:
```bash
# 检查OSS配置
ssh root@120.24.22.244 'cat /var/www/lyc-ai/api/.env.production | grep OSS'

# 检查PM2日志
ssh root@120.24.22.244 'pm2 logs lyc-ai-api | grep -i oss'
```

**解决**:
- 确认OSS AccessKey配置正确
- 确认OSS Bucket存在且有权限
- 检查ali-oss包是否安装: `npm list ali-oss`

### 问题2: 知识库检索无结果

**症状**: 选择知识库后AI无法引用文档

**排查**:
```bash
# 检查文档是否解析
ssh root@120.24.22.244 'pm2 logs lyc-ai-api | grep "解析"'

# 检查数据库中的chunks
# (需要连接数据库查询kb_chunks表)
```

**解决**:
- 重新上传文档
- 检查documentParser服务是否正常
- 查看文档状态是否为"ready"

### 问题3: Nginx 502错误

**症状**: 访问网站显示502 Bad Gateway

**排查**:
```bash
# 检查后端是否运行
ssh root@120.24.22.244 'pm2 list'

# 检查端口是否监听
ssh root@120.24.22.244 'netstat -tlnp | grep 3001'
```

**解决**:
```bash
# 重启后端
ssh root@120.24.22.244 'pm2 restart lyc-ai-api'

# 如果还有问题,查看详细日志
ssh root@120.24.22.244 'pm2 logs lyc-ai-api --err'
```

### 问题4: 大文件上传失败

**症状**: 上传大文件时超时或413错误

**排查**:
```bash
# 检查Nginx配置
ssh root@120.24.22.244 'grep client_max_body_size /etc/nginx/conf.d/lyc-ai.conf'
```

**解决**:
- 确认使用了新的nginx-production.conf
- 运行: `sudo nginx -t && sudo systemctl reload nginx`

---

## 🎉 完成!

部署完成后,你的应用应该:
- ✅ 图片OCR功能正常
- ✅ 知识库检索功能正常
- ✅ 可以上传大文件(最大100MB)
- ✅ AI流式响应不超时
- ✅ 敏感信息已保护

**访问地址**: http://120.24.22.244 (或你的域名)

**下一步**:
1. 配置域名和HTTPS(提升安全性和用户信任)
2. 测试所有功能
3. 收集用户反馈
4. 监控系统运行状态

---

## 📞 联系支持

遇到问题?
1. 先运行 `./check-server-status.sh` 检查状态
2. 查看 `FIXES_APPLIED.md` 了解修复详情
3. 查看PM2日志定位问题

**重要提醒**:
- 定期备份数据库
- 定期更新依赖包
- 监控服务器资源使用情况

---

**文档版本**: v1.1.0
**最后更新**: 2025-09-30
**维护者**: Claude AI Assistant