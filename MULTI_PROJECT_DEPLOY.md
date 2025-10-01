# 多项目共存部署方案

## 服务器配置（共用ECS）

### 1. 端口分配
```
旧项目：
- 前端：80/443 (Nginx默认)
- 后端API：3000

新项目（LYC-AI）：
- 前端：通过Nginx转发
- 后端API：3001
```

### 2. Nginx配置示例
```nginx
# 旧项目配置
server {
    listen 80;
    server_name old.yourdomain.com;

    location / {
        root /var/www/old-project/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
    }
}

# 新项目配置
server {
    listen 80;
    server_name ai.yourdomain.com;  # 或使用不同的子域名

    location / {
        root /var/www/lyc-ai/web/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;  # 注意端口不同
    }
}
```

## 数据库配置（共用RDS）

### 创建独立数据库
```sql
-- 在RDS中执行
CREATE DATABASE old_project_db;  -- 旧项目数据库
CREATE DATABASE lyc_ai_db;       -- 新项目数据库

-- 如果需要不同用户（可选）
CREATE USER 'lyc_ai_user'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON lyc_ai_db.* TO 'lyc_ai_user'@'%';
FLUSH PRIVILEGES;
```

### 连接字符串
```env
# 旧项目
DATABASE_URL="mysql://root:password@rds-host:3306/old_project_db"

# 新项目
DATABASE_URL="mysql://root:password@rds-host:3306/lyc_ai_db"
```

## OSS存储配置

### 方案1：同Bucket不同目录
```javascript
// 旧项目上传路径
const oldProjectPath = 'old-project/uploads/'

// 新项目上传路径
const newProjectPath = 'lyc-ai/uploads/'
```

### 方案2：创建新Bucket（推荐）
1. 在阿里云OSS创建新Bucket：`lyc-ai-storage`
2. 使用相同的AccessKey（或创建新的子账号）
3. 配置新项目使用新Bucket

## PM2进程管理

```bash
# 查看所有进程
pm2 list

# 旧项目
pm2 start old-api --name old-project

# 新项目
pm2 start lyc-api --name lyc-ai-api

# 保存配置
pm2 save
pm2 startup
```

## 资源监控

### 检查服务器资源
```bash
# CPU和内存使用
htop

# 磁盘空间
df -h

# 网络连接
netstat -tlnp

# 查看所有运行的Node进程
ps aux | grep node
```

### 建议的最低配置
- CPU：2核心以上
- 内存：4GB以上（两个项目各2GB）
- 磁盘：40GB以上

## 安全建议

1. **使用不同的JWT密钥**
2. **分离环境变量文件**
3. **设置不同的CORS域名**
4. **考虑使用Docker容器隔离**

## 故障排查

### 端口冲突
```bash
# 查看端口占用
lsof -i :3000
lsof -i :3001

# 杀掉占用进程
kill -9 <PID>
```

### 内存不足
```bash
# 增加swap空间
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 备份策略

- 定期备份两个数据库
- 分别备份两个项目的代码和配置
- OSS数据定期归档