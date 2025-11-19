/**
 * 后端统一数学公式渲染工具
 *
 * 职责：将 Markdown + LaTeX 文本渲染成教科书风格的 HTML
 *
 * 设计理念：
 * - 后端统一渲染，确保所有历史消息、分享页、导出页显示一致
 * - 不做任何正则"修复"，依赖 AI 输出符合规范的 $...$ 格式
 * - 前端只负责展示（v-html），所有样式由 katex-override.css 控制
 */

import MarkdownIt from 'markdown-it'
// @ts-ignore - markdown-it-katex doesn't have types
import markdownItKatex from 'markdown-it-katex'
import { normalizeMathForStudents } from './normalizeMathForStudents.js'

/**
 * 创建 markdown-it 实例（单例，避免重复创建）
 */
const md = new MarkdownIt({
  html: false,        // 禁止原始HTML，防止XSS
  breaks: true,       // 回车换行
  linkify: true,      // 自动识别链接
  typographer: true   // 启用排版增强
})

// 注册 KaTeX 插件
md.use(markdownItKatex, {
  throwOnError: false,    // 遇到错误不抛出异常，显示原始内容
  errorColor: '#cc0000',  // 错误时的颜色
  displayMode: false,     // 默认行内模式（$$...$$ 会自动识别为块级）
  output: 'html'          // 输出 HTML 格式（而非 MathML）
})

/**
 * 渲染 Markdown + LaTeX 为教科书风格 HTML
 *
 * @param rawText - 原始 Markdown 文本（AI 输出，已包含 $...$ 包裹的公式）
 * @returns 渲染后的 HTML 字符串
 *
 * @example
 * ```typescript
 * const raw = "因为 $AC = n \\cdot AB$ 且 $O$ 是 $AC$ 的中点..."
 * const html = renderMathMarkdown(raw)
 * // 返回: "<p>因为 <span class=\"katex\">...</span> 且 ..."
 * ```
 */
export function renderMathMarkdown(rawText: string): string {
  if (!rawText) {
    console.log('[renderMathMarkdown] 输入为空')
    return ''
  }

  try {
    console.log('[renderMathMarkdown] 开始渲染，输入长度:', rawText.length)
    console.log('[renderMathMarkdown] 输入前100字符:', rawText.substring(0, 100))

    // 🔥 先进行符号规范化：将 LaTeX 命令转换为 Unicode 符号
    // 例如：\triangle → △, \angle → ∠, \times → ×
    const normalizedText = normalizeMathForStudents(rawText)

    console.log('[renderMathMarkdown] 规范化后长度:', normalizedText.length)
    console.log('[renderMathMarkdown] 规范化后前100字符:', normalizedText.substring(0, 100))

    // 然后用 markdown-it-katex 渲染
    // 会自动处理 $...$ 和 $$...$$
    const html = md.render(normalizedText)

    console.log('[renderMathMarkdown] 渲染完成，HTML长度:', html.length)
    console.log('[renderMathMarkdown] HTML前100字符:', html.substring(0, 100))

    return html
  } catch (error) {
    console.error('[renderMathMarkdown] 渲染失败:', error)
    // 失败时返回转义后的纯文本
    const fallback = escapeHtml(rawText).replace(/\n/g, '<br>')
    console.log('[renderMathMarkdown] 使用回退方案，长度:', fallback.length)
    return fallback
  }
}

/**
 * HTML 转义（安全处理）
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * 批量渲染（用于历史消息兜底）
 *
 * @param messages - 消息数组
 * @returns 添加了 htmlContent 的消息数组
 */
export function batchRenderMessages(
  messages: Array<{ role: string; content: string; htmlContent?: string | null }>
): Array<{ role: string; content: string; htmlContent: string }> {
  return messages.map(msg => {
    // 如果已有 htmlContent，直接返回
    if (msg.htmlContent) {
      return { ...msg, htmlContent: msg.htmlContent }
    }

    // 如果是 AI 消息且没有 htmlContent，临时渲染一下
    if (msg.role === 'assistant') {
      return {
        ...msg,
        htmlContent: renderMathMarkdown(msg.content)
      }
    }

    // 用户消息直接转 <br>
    return {
      ...msg,
      htmlContent: escapeHtml(msg.content).replace(/\n/g, '<br>')
    }
  })
}
