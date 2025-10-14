# 飞书多维表格同步配置指南

## 📋 功能说明

飞书同步功能可以将系统中的用户数据和每日统计数据自动同步到飞书多维表格，方便你在移动端或与团队协作时查看数据。

**同步内容：**
- ✅ 用户统计表：用户信息、对话数、消息数、活跃时长、知识库文档数
- ✅ 每日统计表：每日新增用户、对话数、消息数、活跃用户数

## 🚀 快速开始

### 第一步：创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录飞书账号
3. 点击「创建企业自建应用」
4. 填写应用信息：
   - 应用名称：`智能少年数据同步`
   - 应用描述：`自动同步用户学习数据到飞书表格`
   - 上传应用图标（可选）

5. 创建完成后，记录以下信息：
   - **App ID**（应用ID）
   - **App Secret**（应用密钥）

### 第二步：配置应用权限

在应用管理页面，添加以下权限：

**必需权限：**
- `bitable:app` - 访问多维表格
- `bitable:app:table` - 访问多维表格中的数据表
- `bitable:app:table:record` - 读写多维表格记录

**配置步骤：**
1. 进入应用详情页
2. 点击「权限管理」
3. 搜索并勾选上述权限
4. 点击「保存」

### 第三步：创建多维表格

1. 在飞书中创建一个新的多维表格（或使用现有的）
2. 记录 **app_token**（在浏览器地址栏中，格式：`https://xxx.feishu.cn/base/{app_token}?table=...`）

#### 创建用户统计表

在多维表格中创建一个新的数据表，命名为「用户统计」，添加以下字段：

| 字段名 | 字段类型 | 说明 |
|--------|----------|------|
| 用户ID | 文本 | 系统用户ID |
| 姓名 | 文本 | 用户姓名 |
| 邮箱 | 文本 | 用户邮箱 |
| 年级 | 文本 | 用户年级 |
| 年龄 | 文本 | 用户年龄 |
| 对话数 | 数字 | 总对话数 |
| 消息数 | 数字 | 总消息数 |
| 会话次数 | 数字 | 登录会话次数 |
| 活跃时长 | 文本 | 累计活跃时长 |
| 知识库文档 | 数字 | 上传的文档数量 |
| 注册时间 | 日期 | 用户注册日期 |
| 最后更新 | 日期 | 数据更新时间 |

记录该数据表的 **table_id**（在浏览器地址栏中，格式：`?table={table_id}`）

#### 创建每日统计表（可选）

在同一个多维表格中创建另一个数据表，命名为「每日统计」，添加以下字段：

| 字段名 | 字段类型 | 说明 |
|--------|----------|------|
| 日期 | 日期 | 统计日期 |
| 总用户数 | 数字 | 累计用户数 |
| 总对话数 | 数字 | 累计对话数 |
| 总消息数 | 数字 | 累计消息数 |
| 总文档数 | 数字 | 累计文档数 |
| 今日新增用户 | 数字 | 当日新增用户 |
| 今日对话数 | 数字 | 当日新增对话 |
| 今日消息数 | 数字 | 当日新增消息 |
| 今日活跃用户 | 数字 | 当日活跃用户数 |
| 更新时间 | 日期 | 数据更新时间 |

记录该数据表的 **table_id**

### 第四步：配置环境变量

在服务器上修改 `api/.env` 文件，添加以下配置：

```bash
# 飞书应用配置
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxx

# 飞书多维表格配置
FEISHU_TABLE_APP_TOKEN=bascnxxxxxxxxxxxxxxxxx
FEISHU_USER_TABLE_ID=tblxxxxxxxxxxxxxxxxx
FEISHU_DAILY_STATS_TABLE_ID=tblxxxxxxxxxxxxxxxxx  # 可选
```

**说明：**
- `FEISHU_APP_ID`: 第一步获取的应用ID
- `FEISHU_APP_SECRET`: 第一步获取的应用密钥
- `FEISHU_TABLE_APP_TOKEN`: 第三步获取的多维表格 app_token
- `FEISHU_USER_TABLE_ID`: 用户统计表的 table_id
- `FEISHU_DAILY_STATS_TABLE_ID`: 每日统计表的 table_id（可选）

### 第五步：将应用添加到表格

1. 打开创建的多维表格
2. 点击右上角「...」菜单
3. 选择「添加协作者」
4. 搜索你创建的应用名称（如「智能少年数据同步」）
5. 添加应用为协作者，权限设置为「可编辑」

### 第六步：测试同步

重启API服务后，在管理后台测试同步功能：

```bash
# 重启 API 服务
cd /Users/luoyinchong/Desktop/lyc2/api
npm run build
pm2 restart api
```

访问管理后台，尝试手动触发同步（后续会添加UI按钮）。

或者使用 curl 测试：

```bash
curl -X POST http://localhost:3000/api/admin/feishu/sync
```

如果配置正确，应该能看到数据同步到飞书表格中！

## 📱 使用方式

### 手动同步

在管理后台中可以手动触发数据同步（未来会添加UI按钮）。

目前可以通过 API 触发：

```bash
curl -X POST https://你的域名/api/admin/feishu/sync
```

### 定时同步（推荐）

使用 cron 或 PM2 生态系统配置定时任务：

#### 方案一：使用 cron

在服务器上添加 cron 任务，每天凌晨 2 点同步：

```bash
crontab -e

# 添加以下行
0 2 * * * curl -X POST http://localhost:3000/api/admin/feishu/sync
```

#### 方案二：使用 PM2 cron

创建一个同步脚本 `sync-feishu.js`:

```javascript
const axios = require('axios');

async function sync() {
  try {
    const response = await axios.post('http://localhost:3000/api/admin/feishu/sync');
    console.log('同步成功:', response.data);
  } catch (error) {
    console.error('同步失败:', error.message);
  }
}

sync();
```

使用 PM2 运行定时任务：

```bash
pm2 start sync-feishu.js --cron "0 2 * * *" --no-autorestart
```

## 🔍 故障排查

### 1. 检查配置状态

访问配置状态接口：

```bash
curl http://localhost:3000/api/admin/feishu/status
```

返回示例：

```json
{
  "configured": true,
  "config": {
    "hasAppId": true,
    "hasAppSecret": true,
    "hasTableAppToken": true,
    "hasUserTableId": true,
    "hasDailyStatsTableId": true
  }
}
```

如果 `configured` 为 `false`，说明还有配置项缺失。

### 2. 常见错误

#### 错误：`飞书配置缺失`

**原因：** 环境变量未正确配置

**解决：**
1. 检查 `api/.env` 文件是否存在
2. 确认所有必需的环境变量都已设置
3. 重启 API 服务

#### 错误：`获取飞书令牌失败`

**原因：** App ID 或 App Secret 错误

**解决：**
1. 登录飞书开放平台
2. 检查应用的 App ID 和 App Secret 是否正确
3. 更新 `.env` 文件并重启服务

#### 错误：`权限不足`

**原因：** 应用未被添加到表格或权限不足

**解决：**
1. 打开飞书多维表格
2. 将应用添加为协作者
3. 确保应用有「可编辑」权限

#### 错误：`找不到数据表`

**原因：** table_id 错误

**解决：**
1. 在浏览器中打开多维表格
2. 从 URL 中复制正确的 table_id
3. 更新 `.env` 文件并重启服务

### 3. 查看同步日志

查看 API 日志：

```bash
pm2 logs api
```

或查看完整日志：

```bash
tail -f /root/.pm2/logs/api-out.log
```

## 📊 数据说明

### 用户统计表

- **更新方式：** 每次同步会清空旧数据并插入最新数据
- **更新频率：** 建议每天同步一次
- **数据来源：** 从 PostgreSQL 数据库实时计算

### 每日统计表

- **更新方式：** 每次同步插入当天的统计记录
- **更新频率：** 建议每天同步一次（凌晨）
- **数据来源：** 统计当天的新增数据

## ⚠️ 注意事项

1. **API 限流**：飞书 API 有调用频率限制，建议不要过于频繁同步
2. **数据量大**：如果用户数超过 500，会分批同步，可能需要较长时间
3. **网络连接**：确保服务器能访问 `https://open.feishu.cn`
4. **权限管理**：定期检查飞书应用权限是否过期
5. **数据安全**：飞书表格中包含用户数据，注意设置适当的访问权限

## 🎉 完成

配置完成后，你可以：
- 在飞书移动端随时查看数据
- 与团队成员共享数据分析
- 使用飞书表格的图表功能可视化数据
- 设置飞书机器人推送每日数据报告

需要帮助？查看 [飞书开放平台文档](https://open.feishu.cn/document/home/index) 或联系技术支持。
