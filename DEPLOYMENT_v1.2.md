# 部署文档 v1.2.0 - 活跃时长统计 + 飞书同步

## 🎉 新功能概览

### 1. 用户活跃时长统计
- ✅ 自动记录用户在线时长
- ✅ 每30秒心跳更新
- ✅ 管理后台展示时长统计
- ✅ 支持导出含时长的用户数据

### 2. 管理后台密码更新
- ✅ 密码从 `1234567` 改为 `1`
- ✅ 更简单易记

### 3. 飞书多维表格同步
- ✅ 同步用户统计数据到飞书
- ✅ 同步每日统计数据
- ✅ 支持手动/定时同步
- ✅ 移动端随时查看数据

## 📋 部署前准备

### 1. 备份数据库（重要！）

```bash
# SSH 登录服务器
ssh root@120.24.22.244 -p 2222

# 备份数据库
pg_dump -h pgm-wz9ar7chi0iaj54g.pg.rds.aliyuncs.com \
  -p 5432 \
  -U AIDD \
  -d myappdb \
  -F c \
  -f ~/backup_$(date +%Y%m%d_%H%M%S).dump

# 输入密码: Lyc001286
```

### 2. 确认当前代码状态

```bash
cd /root/api
git status
git stash  # 如果有未提交的更改
```

## 🚀 部署步骤

### 步骤1：本地测试

在本地先测试所有功能：

```bash
# 1. 数据库迁移
cd /Users/luoyinchong/Desktop/lyc2/api
./migrate-db.sh

# 2. 安装依赖（如有新增）
npm install

# 3. 构建
npm run build

# 4. 启动测试
npm run dev

# 5. 测试新功能
# - 登录用户端，检查心跳是否正常（查看浏览器控制台）
# - 登录管理后台（密码：1），检查时长统计是否显示
```

### 步骤2：推送代码到 GitHub

```bash
cd /Users/luoyinchong/Desktop/lyc2

# 查看更改
git status

# 添加所有更改
git add .

# 提交
git commit -m "v1.2.0: 添加用户活跃时长统计和飞书同步功能

- 添加 user_sessions 表记录用户活跃时长
- 用户端添加心跳机制（每30秒）
- 管理后台展示活跃时长统计
- 管理后台登录密码改为 1
- 实现飞书多维表格同步功能
- 添加飞书配置文档和部署文档"

# 推送到 GitHub
git push origin main

# 打标签
git tag v1.2.0
git push origin v1.2.0
```

### 步骤3：服务器部署

#### 3.1 更新代码

```bash
# SSH 登录服务器
ssh root@120.24.22.244 -p 2222

# 进入项目目录
cd /root/api

# 拉取最新代码
git pull origin main

# 如果有冲突，先查看
git status

# 确认切换到 v1.2.0
git checkout v1.2.0
```

#### 3.2 执行数据库迁移

```bash
cd /root/api

# 运行迁移脚本
./migrate-db.sh

# 如果脚本没有执行权限，先添加
chmod +x migrate-db.sh
./migrate-db.sh

# 输入 y 确认迁移
```

**预期输出：**
```
✅ 数据库迁移成功！
✅ Prisma Client 生成成功！
```

#### 3.3 安装依赖并构建

```bash
# 安装新增依赖
npm install

# 构建 TypeScript
npm run build
```

#### 3.4 重启服务

```bash
# 重启 API 服务
pm2 restart api

# 查看日志确认启动成功
pm2 logs api --lines 50
```

**确认启动成功的标志：**
```
✓ Server running on http://localhost:3000
✓ Database connected
```

#### 3.5 部署前端

##### 部署用户端 (web)

```bash
# 回到本地
cd /Users/luoyinchong/Desktop/lyc2/web

# 构建
npm run build

# 打包
tar -czf web-dist.tar.gz dist/

# 上传到服务器
scp -P 2222 web-dist.tar.gz root@120.24.22.244:/tmp/

# SSH 到服务器
ssh root@120.24.22.244 -p 2222

# 解压到 web 目录
cd /var/www/lyc-ai
rm -rf *  # 清空旧文件
tar -xzf /tmp/web-dist.tar.gz --strip-components=1
rm /tmp/web-dist.tar.gz

# 重启 Nginx
nginx -t && systemctl reload nginx
```

##### 部署管理后台 (admin)

```bash
# 回到本地
cd /Users/luoyinchong/Desktop/lyc2/admin

# 构建
npx vite build

# 打包
tar -czf admin-dist.tar.gz dist/

# 上传到服务器
scp -P 2222 admin-dist.tar.gz root@120.24.22.244:/tmp/

# SSH 到服务器
ssh root@120.24.22.244 -p 2222

# 解压到 admin 目录
mkdir -p /var/www/admin
cd /var/www/admin
rm -rf *  # 清空旧文件
tar -xzf /tmp/admin-dist.tar.gz --strip-components=1
rm /tmp/admin-dist.tar.gz
```

## ✅ 部署后验证

### 1. 验证 API 服务

```bash
# 检查 API 健康状态
curl http://localhost:3000/health

# 检查数据库连接
curl http://localhost:3000/api/admin/stats
```

### 2. 验证用户端功能

1. 访问 https://你的域名
2. 登录用户账号
3. 打开浏览器控制台，查看是否有心跳日志：
   ```
   会话已启动: xxx-xxx-xxx
   心跳已发送
   ```
4. 等待30秒，确认心跳自动发送

### 3. 验证管理后台

1. 访问 https://你的域名/admin（或 http://admin.你的域名）
2. 使用新密码登录：`1`
3. 进入「用户管理」页面
4. 检查用户列表是否显示「活跃时长」列
5. 点击「查看详情」，确认显示活跃时长卡片

### 4. 验证飞书同步（可选）

如果已配置飞书，测试同步：

```bash
# 检查飞书配置状态
curl http://localhost:3000/api/admin/feishu/status

# 手动触发同步
curl -X POST http://localhost:3000/api/admin/feishu/sync

# 查看日志
pm2 logs api | grep "飞书"
```

## 🔧 飞书配置（可选）

如需启用飞书同步，请参考 [FEISHU_SETUP.md](./FEISHU_SETUP.md)

简要步骤：

1. 创建飞书应用，获取 App ID 和 App Secret
2. 创建多维表格，记录 app_token 和 table_id
3. 在服务器上配置环境变量：

```bash
# 编辑 .env 文件
vi /root/api/.env

# 添加以下配置
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxx
FEISHU_TABLE_APP_TOKEN=bascnxxxxxxxxxxxxxxxxx
FEISHU_USER_TABLE_ID=tblxxxxxxxxxxxxxxxxx
FEISHU_DAILY_STATS_TABLE_ID=tblxxxxxxxxxxxxxxxxx

# 保存后重启服务
pm2 restart api
```

4. 测试同步：

```bash
curl -X POST http://localhost:3000/api/admin/feishu/sync
```

## 📊 监控和维护

### 查看心跳日志

```bash
# 实时查看日志
pm2 logs api

# 查看会话相关日志
pm2 logs api | grep "会话"

# 查看飞书同步日志
pm2 logs api | grep "飞书"
```

### 查看用户会话统计

```sql
-- SSH 登录数据库
psql -h pgm-wz9ar7chi0iaj54g.pg.rds.aliyuncs.com \
  -p 5432 \
  -U AIDD \
  -d myappdb

-- 查看今日活跃用户数
SELECT COUNT(DISTINCT user_id) AS active_users
FROM user_sessions
WHERE start_time >= CURRENT_DATE;

-- 查看用户平均活跃时长
SELECT
  AVG(duration) / 3600 AS avg_hours
FROM user_sessions
WHERE duration > 0;

-- 查看活跃时长前10的用户
SELECT
  u.email,
  p.name,
  SUM(s.duration) / 3600 AS total_hours
FROM user_sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN profiles p ON u.id = p.user_id
GROUP BY u.email, p.name
ORDER BY total_hours DESC
LIMIT 10;
```

## 🔄 回滚方案

如果部署后出现问题，可以快速回滚：

### 回滚代码

```bash
cd /root/api

# 回滚到上一个版本
git checkout v1.1.0

# 重新构建
npm run build

# 重启服务
pm2 restart api
```

### 回滚数据库（如果迁移失败）

```bash
# 恢复备份
pg_restore -h pgm-wz9ar7chi0iaj54g.pg.rds.aliyuncs.com \
  -p 5432 \
  -U AIDD \
  -d myappdb \
  -c \
  ~/backup_xxxxx.dump
```

## ⚠️ 已知问题和注意事项

1. **心跳频率**：目前设置为30秒，如果觉得太频繁可以调整为60秒
2. **页面可见性**：用户切换标签页时会触发一次心跳，避免丢失数据
3. **会话结束**：用户关闭页面时会尝试结束会话，但可能因网络问题失败
4. **飞书同步**：首次同步可能较慢，建议晚上低峰期执行
5. **管理后台密码**：已改为 `1`，记得通知其他管理员

## 📝 版本信息

- **版本号**：v1.2.0
- **发布日期**：2025-10-14
- **主要更新**：用户活跃时长统计 + 飞书同步
- **数据库变更**：是
- **向下兼容**：是

## 📞 技术支持

遇到问题？
1. 查看 PM2 日志：`pm2 logs api`
2. 查看数据库日志
3. 检查 Nginx 配置
4. 参考故障排查文档

---

**部署完成后记得测试所有功能！** 🎉
