# 🚀 部署指南 - LYC AI项目

## 第1步：SSH连接到服务器

打开终端，执行：
```bash
ssh root@120.24.22.244
# 输入密码：Lyc001286
```

## 第2步：检查服务器现有服务

连接成功后，依次执行以下命令：

### 2.1 检查占用的端口
```bash
# 查看所有监听的端口
netstat -tlnp | grep LISTEN

# 专门查看Node相关端口
netstat -tlnp | grep node

# 查看3000和3001端口
lsof -i :3000
lsof -i :3001
```

### 2.2 检查PM2进程
```bash
# 查看PM2管理的进程
pm2 list

# 如果PM2未安装，先安装
npm install -g pm2
```

### 2.3 检查Nginx配置
```bash
# 查看Nginx站点配置
ls /etc/nginx/sites-enabled/

# 查看具体配置（如果有default文件）
cat /etc/nginx/sites-enabled/default
```

## 第3步：获取RDS数据库信息

### 在阿里云控制台操作：

1. **登录阿里云控制台**
   - 访问：https://www.aliyun.com
   - 登录你的账号

2. **找到RDS实例**
   - 进入"云数据库RDS"
   - 点击你的RDS实例

3. **获取连接地址**
   - 在"基本信息"页面找到：
     - 内网地址（类似：rm-xxxxx.mysql.rds.aliyuncs.com）
     - 端口：3306

4. **设置白名单**
   - 点击"数据安全性"
   - 添加白名单：
     - ECS内网IP（在ECS实例详情可查看）
     - 或设置 0.0.0.0/0（临时测试用，不安全）

## 第4步：创建新的OSS Bucket

### 在阿里云控制台操作：


1. **进入OSS控制台**
   - 选择"对象存储OSS"

2. **创建Bucket**
   - 点击"创建Bucket"
   - Bucket名称：`lyc-ai-storage`（或其他唯一名称）
   - 地域：深圳
   - 存储类型：标准存储
   - 读写权限：私有

3. **获取AccessKey**（如果需要新的）
   - 右上角头像 → AccessKey管理
   - 创建AccessKey（建议创建子账号）

---

## 🔍 请执行上述步骤后告诉我：

1. **端口检查结果**：
   - 3000端口是否被占用？被什么进程占用？
   - 3001端口是否空闲？

2. **PM2进程列表**：
   - 有哪些正在运行的应用？

3. **Nginx配置**：
   - 是否有配置文件？
   - 当前的server_name和proxy_pass是什么？

4. **RDS连接地址**：
   - 内网地址是什么？

5. **新OSS Bucket**：
   - 创建的Bucket名称？

有了这些信息，我就可以帮你配置具体的部署文件了。