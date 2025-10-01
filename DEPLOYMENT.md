# 🚀 阿里云部署指南

## 准备工作

### 1. 阿里云资源准备
- ✅ ECS云服务器 (Ubuntu 20.04+)
- ✅ RDS MySQL数据库
- ✅ OSS对象存储
- ✅ 域名（已备案）

### 2. 获取必要信息
- [ ] ECS公网IP地址
- [ ] RDS数据库连接地址、用户名、密码
- [ ] OSS AccessKey ID和Secret
- [ ] OSS Bucket名称和地域

## 部署步骤

### 步骤1: 配置RDS数据库

1. 登录阿里云控制台，进入RDS管理
2. 创建数据库：`lyc_ai_db`
3. 设置白名单，添加ECS内网IP
4. 记录连接信息：
   ```
   主机: xxxx.mysql.rds.aliyuncs.com
   端口: 3306
   用户: root
   密码: your-password
   ```

### 步骤2: 配置OSS存储

1. 进入OSS管理控制台
2. 创建AccessKey（建议使用RAM子账号）
3. 记录信息：
   ```
   Region: oss-cn-shenzhen
   Bucket: your-bucket-name
   AccessKey ID: xxxxx
   AccessKey Secret: xxxxx
   ```

### 步骤3: 初始化ECS服务器

1. SSH连接到ECS：
   ```bash
   ssh root@your-ecs-ip
   ```

2. 上传并运行初始化脚本：
   ```bash
   # 在本地
   scp server-setup.sh root@your-ecs-ip:/tmp/

   # 在服务器
   chmod +x /tmp/server-setup.sh
   /tmp/server-setup.sh
   ```

### 步骤4: 配置环境变量

1. 修改 `api/.env.production`：
   ```env
   DATABASE_URL="mysql://root:password@rds-endpoint:3306/lyc_ai_db"
   JWT_SECRET="生成一个32位随机字符串"
   ALI_OSS_ACCESS_KEY_ID="你的OSS_KEY"
   ALI_OSS_ACCESS_KEY_SECRET="你的OSS_SECRET"
   ALI_OSS_BUCKET="你的bucket名称"
   ```

2. 修改 `web/.env.production`：
   ```env
   VITE_API_URL=https://your-domain.com/api
   # 或
   VITE_API_URL=http://your-ecs-ip:3001
   ```

3. 修改 `deploy.sh` 中的配置：
   ```bash
   ECS_HOST="your-ecs-ip"
   ```

### 步骤5: 部署应用

1. 在本地项目目录执行：
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. 首次部署需要在服务器上初始化数据库：
   ```bash
   ssh root@your-ecs-ip
   cd /var/www/lyc-ai/api
   npx prisma migrate deploy
   ```

### 步骤6: 配置域名

1. 在阿里云域名管理中添加A记录：
   ```
   记录类型: A
   主机记录: @ 或 www
   记录值: 你的ECS公网IP
   ```

2. 配置HTTPS（可选）：
   ```bash
   # 在服务器上安装certbot
   apt install certbot python3-certbot-nginx

   # 获取SSL证书
   certbot --nginx -d your-domain.com
   ```

## 验证部署

1. 检查服务状态：
   ```bash
   pm2 status
   nginx -t
   systemctl status nginx
   ```

2. 访问网站：
   - http://your-domain.com
   - 或 http://your-ecs-ip

## 常用命令

### PM2进程管理
```bash
pm2 list          # 查看进程
pm2 logs lyc-api  # 查看日志
pm2 restart lyc-api # 重启服务
pm2 save          # 保存配置
```

### 更新部署
```bash
# 在本地执行
./deploy.sh
```

### 查看日志
```bash
# API日志
pm2 logs lyc-api

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 故障排查

### 1. 网站无法访问
- 检查ECS安全组规则（开放80/443端口）
- 检查Nginx配置：`nginx -t`
- 检查PM2进程：`pm2 status`

### 2. API连接失败
- 检查数据库连接：`mysql -h rds-endpoint -u root -p`
- 检查环境变量：`cat /var/www/lyc-ai/api/.env.production`
- 查看API日志：`pm2 logs lyc-api`

### 3. 文件上传失败
- 检查OSS配置是否正确
- 检查AccessKey权限
- 查看API错误日志

## 性能优化建议

1. **启用CDN加速**
   - 在阿里云CDN中配置域名
   - 将静态资源托管到OSS

2. **数据库优化**
   - 定期备份RDS
   - 配置读写分离（如需要）

3. **监控告警**
   - 配置云监控
   - 设置CPU、内存、流量告警

## 备份策略

1. **数据库备份**
   - RDS自动备份（每日）
   - 手动备份重要数据

2. **代码备份**
   - Git仓库
   - 定期打包备份

## 联系支持

遇到问题请检查：
1. 本文档故障排查部分
2. 查看相关日志
3. 阿里云工单系统