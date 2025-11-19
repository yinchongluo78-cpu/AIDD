# 数学公式渲染系统使用指南

## 📐 架构概览

本项目采用了**分离职责**的设计架构，确保数学公式在整个系统中统一、清晰、像教科书一样渲染。

### 三层架构

```
┌─────────────────────────────────────────────────────────┐
│ 🎯 AI 模型层（DeepSeek）                                    │
│ 职责：按照系统提示词规范输出数学公式                              │
│ 输出格式：$...$ (行内)  $$...$$ (独立成行)                    │
│ 几何符号：△、∠、⊥、∥ 等 Unicode 字符                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 🔧 后端处理层（Node.js + Express）                          │
│ 职责：                                                      │
│ 1. 统一管理所有 system prompt                               │
│ 2. LaTeX 命令 → Unicode 符号替换                            │
│ 文件：api/src/prompts/mathStyle.ts                         │
│      api/src/utils/normalizeMathForStudents.ts            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 🎨 前端渲染层（Vue 3 + markdown-it + KaTeX）                │
│ 职责：将 $...$ 渲染成漂亮的教科书风格数学公式                    │
│ 文件：web/src/utils/markdown.ts                            │
│      web/src/assets/katex-override.css                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ 如何修改数学公式输出规范

### 1. 修改数学表达式规范（最常见）

**需求示例**：想让 AI 不再使用 `\dfrac`，而统一使用 `\frac`

**修改位置**：**只需修改一个文件**
```
api/src/prompts/mathStyle.ts
```

**具体步骤**：
1. 打开 `api/src/prompts/mathStyle.ts`
2. 找到 `MATH_EXPRESSION_SPEC` 常量
3. 修改第 3 节【允许 / 不允许的 LaTeX 命令】：
   ```typescript
   3. 允许 / 不允许的 LaTeX 命令
      - 允许使用但**必须在数学环境内**的命令只有：
        - \`\\frac\`、\`\\sqrt\`、上标 \`^\`、下标 \`_\`。  // 删除了 \dfrac
   ```
4. 编译并部署：
   ```bash
   cd api
   npm run build
   # 上传 dist/ 到服务器
   pm2 restart super-scholar-api
   ```

✅ **自动生效范围**：所有调用 LLM 的路由（chat、conversations、admin）

---

### 2. 添加新的几何符号替换

**需求示例**：希望 AI 输出的 `\cong`（全等符号）自动转换为 `≌`

**修改位置**：
```
api/src/utils/normalizeMathForStudents.ts
```

**具体步骤**：
1. 打开文件，找到 `LATEX_UNICODE_MAP`
2. 添加新映射：
   ```typescript
   const LATEX_UNICODE_MAP: Record<string, string> = {
     // 几何符号
     '\\triangle': '△',
     '\\angle': '∠',
     '\\cong': '≌',        // 🆕 新增
     // ...
   }
   ```
3. 重新编译部署（同上）

---

### 3. 修改前端公式样式（教科书风格）

**需求示例**：想让分数的横线更粗、公式字号更大

**修改位置**：**只需修改一个文件**
```
web/src/assets/katex-override.css
```

**示例修改**：
```css
/* 让行内公式更大 */
.katex {
  font-size: 1.3em;  /* 从 1.15em 改为 1.3em */
}

/* 让分数线更粗 */
.katex .frac-line {
  border-bottom-width: 0.12em;  /* 从 0.08em 改为 0.12em */
}
```

✅ **无需重新编译**，刷新浏览器即可生效

---

### 4. 修改几何题解答风格

**需求示例**：不想要几何题的【已知】【求什么】格式，直接给答案

**修改位置**：
```
api/src/prompts/mathStyle.ts
```

**具体步骤**：
1. 找到 `GEOMETRY_PROBLEM_STYLE` 常量
2. 修改第 1 节：
   ```typescript
   1. 解每一道几何题时，必须按下面结构输出（给 8–15 岁学生看）：
      - 直接给出解题步骤和最终答案，无需【已知】【求什么】格式。
   ```
3. 编译部署（同第 1 节）

---

## 📋 核心文件清单

### 后端（API）

| 文件 | 职责 | 修改频率 |
|------|------|---------|
| `api/src/prompts/mathStyle.ts` | **🔥 最重要** - 统一的数学输出规范 | ⭐⭐⭐⭐⭐ |
| `api/src/utils/normalizeMathForStudents.ts` | LaTeX→Unicode 符号替换 | ⭐⭐⭐ |
| `api/src/routes/chat.ts` | 主聊天路由（已导入统一规范） | ⭐ |
| `api/src/routes/conversations.ts` | 对话历史路由（已导入统一规范） | ⭐ |
| `api/src/routes/admin.ts` | 管理员路由（已导入统一规范） | ⭐ |

### 前端（Web）

| 文件 | 职责 | 修改频率 |
|------|------|---------|
| `web/src/assets/katex-override.css` | **🔥 最重要** - 教科书风格样式 | ⭐⭐⭐⭐⭐ |
| `web/src/utils/markdown.ts` | Markdown + KaTeX 渲染引擎 | ⭐ |
| `web/src/pages/Chat.vue` | 聊天页面（使用渲染工具） | ⭐ |

---

## 🧪 测试流程

### 1. 创建测试脚本

已有示例：`api/test_math_prompt.js`

**测试场景**：
- A：讲解场景（AI 出题并讲解）
- B：批改反馈场景（用户答题，AI 批改）

**运行测试**：
```bash
cd api
node test_math_prompt.js
```

**验证要点**：
- ✅ 所有公式都被 `$...$` 包裹
- ✅ 批改反馈中，用户答案被规范化并包裹
- ✅ 结论行格式统一：`结论：$...$。`

### 2. 前端验证

1. 启动开发服务器：
   ```bash
   cd web
   npm run dev
   ```
2. 访问 `http://localhost:5173`
3. 提问：`已知 AC/AB = n，O 是 AC 的中点，求 OF/OE`
4. 检查：
   - ✅ 分数显示为垂直形式（不是斜杠）
   - ✅ 几何符号（△、∠）正常显示
   - ✅ 公式字号、间距符合教科书风格

---

## 🚀 部署流程

### 后端修改后的部署

```bash
# 1. 编译 TypeScript
cd api
npm run build

# 2. 上传到服务器（两种方式任选）
# 方式 A：使用 SCP
export SSHPASS='Lyc001286'
sshpass -e scp -P 2222 -r dist root@120.24.22.244:/root/api/

# 方式 B：使用 Git（推荐）
git add .
git commit -m "feat: 更新数学公式输出规范"
git push origin main
# 然后在服务器上 git pull && npm run build

# 3. 重启 PM2
sshpass -e ssh -p 2222 root@120.24.22.244 "pm2 restart super-scholar-api"
```

### 前端修改后的部署

```bash
# 1. 构建生产版本
cd web
npm run build

# 2. 上传 dist/ 到服务器的 Nginx 目录
scp -P 2222 -r dist/* root@120.24.22.244:/var/www/html/

# 3. 无需重启，直接生效
```

---

## 🎯 最佳实践

### ✅ DO（推荐）

1. **修改数学规范时**：只改 `api/src/prompts/mathStyle.ts`
2. **修改公式样式时**：只改 `web/src/assets/katex-override.css`
3. **添加新符号替换时**：在 `normalizeMathForStudents.ts` 中添加映射
4. **每次改动后**：运行测试脚本验证
5. **部署前**：本地编译无错误

### ❌ DON'T（避免）

1. ❌ **不要**在三个路由文件中直接修改 system prompt（改了也会被覆盖）
2. ❌ **不要**在前端 `markdown.ts` 中添加复杂的 LaTeX 预处理逻辑
3. ❌ **不要**在 Chat.vue 中再做数学公式包裹/替换
4. ❌ **不要**让后端和前端同时处理同一件事（职责重复）

---

## 🐛 常见问题排查

### 问题 1：公式显示为原始 LaTeX 代码（如 `$\frac{1}{2}$`）

**原因**：前端 KaTeX 未正常工作

**检查步骤**：
1. 浏览器控制台是否有错误？
2. `web/src/main.ts` 是否导入了 `katex/dist/katex.min.css`？
3. `web/src/utils/markdown.ts` 是否正确注册了 `markdown-it-katex`？

**解决**：
```bash
cd web
npm install katex markdown-it markdown-it-katex --save
```

---

### 问题 2：AI 输出的公式没有用 $ 包裹

**原因**：system prompt 未生效

**检查步骤**：
1. `api/src/routes/chat.ts` 是否导入了 `getFullMathStyleSpec()`？
2. PM2 是否重启？
   ```bash
   pm2 logs super-scholar-api --lines 50
   ```
3. 查看日志中的 system prompt 是否包含【数学表达规范】

**解决**：
```bash
cd api
npm run build
pm2 restart super-scholar-api
```

---

### 问题 3：分数显示为斜杠形式（如 1/2）

**原因**：AI 输出的是普通斜杠，没有用 `\frac`

**检查**：后端日志中 AI 的原始输出

**解决**：强化 system prompt 中的第 5 节【批改反馈中的公式格式】，添加更多示例

---

### 问题 4：几何符号显示为 LaTeX 命令（如 `\triangle`）

**原因**：后端 `normalizeMathForStudents()` 未执行

**检查**：
1. `api/src/routes/chat.ts` 中是否调用了 `normalizeMathForStudents(content)`？
2. 查看行号：应在返回给前端前调用

**示例位置**（chat.ts）：
```typescript
// 流式响应处理完后，在数据库保存前规范化
const normalized = normalizeMathForStudents(fullContent)
await prisma.message.create({ content: normalized, ... })
```

---

## 📞 技术支持

如有问题，请按顺序检查：

1. 📄 查看本指南相关章节
2. 🐛 运行测试脚本 `api/test_math_prompt.js`
3. 📋 检查服务器日志 `pm2 logs super-scholar-api`
4. 🔍 浏览器控制台查看前端错误

---

## 📦 版本记录

| 日期 | 版本 | 变更说明 |
|------|------|---------|
| 2025-11-19 | v2.0 | 重构：统一数学输出规范至单一模块 |
| 2025-11-15 | v1.5 | 添加几何题解答风格规范 |
| 2025-11-10 | v1.0 | 初始版本：分离后端/前端职责 |

---

**🎓 设计理念总结**

> "后端管规则，前端管渲染，AI 遵守规则。"

- **后端**：通过 system prompt 约束 AI 输出格式（`api/src/prompts/mathStyle.ts`）
- **前端**：专注于漂亮地渲染已格式化的内容（`web/src/utils/markdown.ts` + KaTeX CSS）
- **分工明确**：避免前后端重复处理导致的 bug

**✨ 一个文件，全局生效！**
