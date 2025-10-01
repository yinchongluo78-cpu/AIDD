#!/bin/bash

# 阿里云ECS初始化脚本
# 在ECS服务器上运行此脚本

echo "🔧 初始化阿里云ECS服务器..."

# 1. 更新系统
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 2. 安装Node.js 18
echo "📦 安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 3. 安装PM2
echo "📦 安装PM2..."
npm install -g pm2

# 4. 安装Nginx
echo "📦 安装Nginx..."
apt install -y nginx

# 5. 安装MySQL客户端（用于连接RDS）
echo "📦 安装MySQL客户端..."
apt install -y mysql-client

# 6. 创建应用目录
echo "📂 创建应用目录..."
mkdir -p /var/www/lyc-ai
chown -R $USER:$USER /var/www/lyc-ai

# 7. 配置防火墙
echo "🔒 配置防火墙..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# 8. 安装Git
echo "📦 安装Git..."
apt install -y git

echo "✅ 服务器初始化完成！"
echo ""
echo "下一步："
echo "1. 配置阿里云RDS数据库"
echo "2. 配置阿里云OSS存储"
echo "3. 运行部署脚本"