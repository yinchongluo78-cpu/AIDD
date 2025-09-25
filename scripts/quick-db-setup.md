# 🚀 数据库快速设置指南

## 第一步：连接到你的服务器

打开终端，输入：
```bash
ssh root@你的服务器IP
```

## 第二步：复制下面的命令，一次性粘贴执行

```bash
# 一键初始化数据库（直接复制这整段）
cd /root/myproject/lyc2/api && \
pnpm add -D prisma @prisma/client && \
npx prisma generate && \
npx prisma db push --accept-data-loss && \
pm2 restart super-scholar-api && \
sleep 3 && \
curl http://127.0.0.1:3000/api/health && \
echo "" && \
echo "✅ 数据库初始化完成！"
```

## 如果上面的命令出错，试试这个备用方案：

```bash
# 备用方案（分步执行）
cd /root/myproject/lyc2/api
pnpm add -D prisma @prisma/client
npx prisma generate
npx prisma db push
pm2 restart super-scholar-api
curl http://127.0.0.1:3000/api/health
```

## 成功标志

如果看到 `{"ok":true}` 就说明成功了！

## 常见问题

1. **如果提示找不到 pnpm**
   ```bash
   npm install -g pnpm
   ```

2. **如果提示数据库连接失败**
   - 检查 .env 文件中的 DATABASE_URL 是否正确
   ```bash
   cat /root/myproject/lyc2/api/.env | grep DATABASE_URL
   ```

3. **如果需要查看创建了哪些表**
   ```bash
   cd /root/myproject/lyc2/api
   npx prisma studio
   ```
   然后通过 SSH 隧道访问 http://localhost:5555