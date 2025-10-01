# 🚀 前端快速部署指南

## 一键部署命令（推荐）

### 步骤1：SSH 连接到服务器
```bash
ssh root@你的服务器IP
```

### 步骤2：复制下面整段命令，粘贴执行

```bash
# 一键部署前端（直接复制整段）
cd /root/myproject/lyc2/web && \
echo "VITE_API_BASE=http://127.0.0.1:3000" > .env && \
pnpm install && \
pnpm build && \
yum install -y nginx && \
mkdir -p /usr/share/nginx/html/web && \
cp -r dist/* /usr/share/nginx/html/web/ && \
cat > /etc/nginx/conf.d/app.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /usr/share/nginx/html/web;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
systemctl restart nginx && \
echo "✅ 前端部署完成！" && \
echo "🌐 请访问: http://$(curl -s ifconfig.me)"
```

## 部署成功标志

如果看到：
- ✅ 前端部署完成！
- 🌐 请访问: http://你的服务器IP

就说明部署成功了！

## ⚠️ 重要提醒

**部署完成后，请确保：**

1. **阿里云安全组开放 80 端口**
   - 登录阿里云控制台
   - 找到你的 ECS 实例
   - 点击"安全组" → "配置规则"
   - 添加规则：端口 80，授权对象 0.0.0.0/0

2. **测试访问**
   - 浏览器打开：http://你的服务器IP
   - 应该能看到网站首页

## 常见问题解决

### 如果 nginx 启动失败
```bash
# 检查 nginx 配置
nginx -t

# 查看错误日志
cat /var/log/nginx/error.log
```

### 如果页面打不开
```bash
# 检查 nginx 状态
systemctl status nginx

# 检查文件是否存在
ls -la /usr/share/nginx/html/web/
```

### 如果 API 请求失败
```bash
# 检查后端服务
pm2 status
curl http://127.0.0.1:3000/api/health
```