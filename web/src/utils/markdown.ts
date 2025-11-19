/**
 * 简化版Markdown + KaTeX渲染工具
 *
 * 设计理念：
 * - 后端负责：所有数学公式用 $...$ 或 $$...$$ 包裹，几何符号转Unicode
 * - 前端负责：直接渲染markdown和LaTeX，不做额外处理
 *
 * 这样保证了"单一职责"，前后端各司其职，避免重复处理导致的问题
 */

import MarkdownIt from 'markdown-it'
// @ts-ignore - markdown-it-katex doesn't have types
import markdownItKatex from 'markdown-it-katex'
import DOMPurify from 'dompurify'

// 创建markdown-it实例
const md = new MarkdownIt({
  html: false,        // 禁止原始HTML，防止XSS
  breaks: true,       // 回车换行
  linkify: true,      // 自动识别链接
  typographer: true   // 启用排版增强
})

// 注册KaTeX插件
md.use(markdownItKatex, {
  throwOnError: false,    // 遇到错误不抛出异常，而是显示原始内容
  errorColor: '#cc0000',  // 错误时的颜色
  displayMode: false,     // 默认行内模式
  output: 'html'          // 输出HTML格式
})

/**
 * 渲染Markdown文本为HTML（简化版，专注于数学公式渲染）
 *
 * @param markdownText 原始markdown文本（来自后端，已包含 $...$ 包裹的数学公式）
 * @returns 安全的HTML字符串
 */
export function renderMarkdownToHtml(markdownText: string): string {
  try {
    if (!markdownText) return ''

    // 直接使用markdown-it渲染（markdown-it-katex会自动处理 $ 和 $$ 标记）
    const htmlContent = md.render(markdownText)

    // 使用DOMPurify进行XSS防护，同时保留KaTeX生成的数学标签
    const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
      // 允许KaTeX生成的MathML和SVG标签
      ADD_TAGS: [
        'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
        'mfrac', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd',
        'mtext', 'mspace', 'menclose', 'mstyle', 'mpadded', 'mphantom',
        'mglyph', 'annotation', 'annotation-xml', 'svg', 'path', 'g',
        'rect', 'line', 'polygon', 'circle', 'ellipse'
      ],
      // 允许KaTeX和MathML需要的属性
      ADD_ATTR: [
        'xmlns', 'aria-hidden', 'focusable', 'role', 'style', 'class',
        'mathvariant', 'mathsize', 'mathcolor', 'mathbackground',
        'displaystyle', 'scriptlevel', 'notation', 'close', 'open',
        'separators', 'accent', 'accentunder', 'align', 'columnalign',
        'columnlines', 'columnspacing', 'columnspan', 'denomalign',
        'depth', 'dir', 'display', 'encoding', 'fence', 'fontstyle',
        'fontweight', 'frame', 'height', 'width', 'stroke', 'fill',
        'd', 'viewBox', 'preserveAspectRatio', 'x', 'y', 'x1', 'y1',
        'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points',
        'stroke-width', 'stroke-linecap', 'stroke-linejoin'
      ]
    })

    return sanitizedHtml
  } catch (error) {
    console.error('Markdown rendering error:', error)
    // 如果渲染失败，返回转义后的原始文本
    return DOMPurify.sanitize(
      markdownText
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
    )
  }
}

/**
 * 检查文本是否包含数学公式
 * @param text 文本内容
 * @returns 是否包含数学公式
 */
export function containsMathFormula(text: string): boolean {
  // 检查是否包含 $ 或 $$ 标记的数学公式
  return /\$\$[^$]+\$\$|\$[^$\n]+\$/.test(text)
}

/**
 * 简单的文本渲染（仅处理换行，不处理数学公式）
 * 用于不需要复杂渲染的场景
 * @param text 纯文本
 * @returns HTML字符串
 */
export function renderPlainText(text: string): string {
  return DOMPurify.sanitize(text.replace(/\n/g, '<br>'))
}
