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
  throwOnError: false,
  errorColor: '#cc0000'
})

/**
 * 预处理文本，处理自定义数学公式标记和原始LaTeX
 * 将 $begin:math:text$...$end:math:text$ 转换为 $...$
 * 将 $begin:math:display$...$end:math:display$ 转换为 $$...$$
 * 同时处理原始的LaTeX符号
 */
function preprocessMathTags(text: string): string {
  // 智能格式化：统一列表样式，让输出自然美观
  // 1. 将各种列表符号（•、◇、*）统一转换为 markdown 列表语法 "-"
  text = text.replace(/^[•◇\*]\s+/gm, '- ')
  text = text.replace(/\n[•◇\*]\s+/g, '\n- ')

  // 2. 处理缩进后的数字列表（嵌套数字）
  // 例如："   1. 基本要求" → "   - 基本要求"
  // 匹配：至少2个空格 + 数字 + 点 + 空格
  text = text.replace(/^(\s{2,})\d+\.\s+/gm, '$1- ')

  // 3. 处理制表符缩进的数字列表
  text = text.replace(/^\t+\d+\.\s+/gm, (match) => {
    const tabs = match.match(/^\t+/)?.[0] || ''
    return tabs + '- '
  })

  // 首先处理标准 LaTeX 公式标记
  // 将 \(...\) 转换为 $...$（行内公式）
  text = text.replace(/\\\((.*?)\\\)/g, '$$$1$$')

  // 将 \[...\] 转换为 $$...$$ (块级公式)
  text = text.replace(/\\\[(.*?)\\\]/gs, '$$$$$$1$$$$')

  // 处理行内数学公式：$begin:math:text$...$end:math:text$ -> $...$
  text = text.replace(/\$begin:math:text\$(.*?)\$end:math:text\$/g, '$$1$')

  // 处理行间数学公式：$begin:math:display$...$end:math:display$ -> $$...$$
  text = text.replace(/\$begin:math:display\$(.*?)\$end:math:display\$/gs, '$$$$1$$')
  
  // 处理被方括号包围的多行LaTeX代码块
  text = text.replace(/\[\s*\n([\s\S]*?)\n\s*\]/g, (match, content) => {
    if (content.includes('\\')) {
      const processed = `$$\n${content.trim()}\n$$`
      return processed
    }
    return match
  })
  
  // 处理单行被方括号包围的LaTeX（如 [\triangle ADP]）
  text = text.replace(/\[([^[\]]*\\[^[\]]*)\]/g, (match, content) => {
    const processed = `$$${content.trim()}$$`
    return processed
  })
  
  // 处理混合格式的三角形符号
  // R△triangle ABC -> 直角三角形ABC
  text = text.replace(/R\s*△\s*triangle\s+([A-Z]+)/g, '直角三角形$1')
  text = text.replace(/Rt\s*△?\s*\\triangle\s+([A-Z]+)/g, '直角三角形$1')

  // 处理直角三角形符号 Rt\triangle -> $Rt\triangle$
  text = text.replace(/Rt\\triangle\s+([A-Z]+)/g, '直角三角形$1')

  // 处理角度符号 \angle -> $\angle$
  text = text.replace(/\\angle\s+([A-Z]+)\s*=\s*(\d+)\s*\^\s*\\circ/g, '∠$1 = $2°')
  text = text.replace(/\\angle\s+([A-Z]+)/g, '∠$1')

  // 处理度数符号 ^\circ -> $^\circ$
  text = text.replace(/\^\s*\\circ/g, '$^\\circ$')

  // 处理垂直符号周围的文本，确保整个表达式被包裹
  text = text.replace(/([A-Z]+)\s*⊥\s*([A-Z]+)/g, '$$$1 \\perp $2$$')
  text = text.replace(/([A-Z]+)\s*∥\s*([A-Z]+)/g, '$$$1 \\parallel $2$$')

  // 处理相似符号
  text = text.replace(/∼/g, '$\\sim$')
  text = text.replace(/～/g, '$\\sim$')

  // 处理独立的LaTeX命令（如 \triangle ABC）
  text = text.replace(/(^|[^$\\])(\\[a-zA-Z]+(?:\{[^}]*\})*(?:\s+[A-Z]+)*)/gm, (match, prefix, latex) => {
    const processed = `${prefix}$${latex}$`
    return processed
  })
  
  // 处理三角形符号的特殊情况
  text = text.replace(/△\s*([A-Z]+)/g, '△$1')
  text = text.replace(/▲\s*([A-Z]+)/g, '▲$1')
  text = text.replace(/∆\s*([A-Z]+)/g, '∆$1')
  
  // 处理面积符号
  text = text.replace(/S_\\triangle\s+([A-Z]+)/g, 'S△$1')
  text = text.replace(/S_\{\\triangle\s+([A-Z]+)\}/g, 'S△$1')
  
  // 处理梯形面积符号 - 简化复杂的LaTeX语法
  text = text.replace(/S_\{\\text\{梯形\s*([A-Z]+)\}\}/g, 'S梯形$1')
  text = text.replace(/S_\\text\{梯形\s*([A-Z]+)\}/g, 'S梯形$1')
  text = text.replace(/S_\{\\text\{梯形([A-Z]+)\}\}/g, 'S梯形$1')
  text = text.replace(/S_\\text\{梯形([A-Z]+)\}/g, 'S梯形$1')
  
  // 处理其他几何图形面积符号
  text = text.replace(/S_\{\\text\{([^}]+)\s*([A-Z]+)\}\}/g, 'S$1$2')
  text = text.replace(/S_\\text\{([^}]+)\s*([A-Z]+)\}/g, 'S$1$2')
  
  // 处理分数显示 - 修复各种分数格式错误
  
  // 首先处理普通的斜杠分数格式，转换为显示模式的LaTeX格式
  // 处理形如 S/2, 3S/4, 3S/2 等格式
  text = text.replace(/([A-Za-z0-9]+[A-Za-z])\/([A-Za-z0-9]+)/g, '$$\\frac{$1}{$2}$$')
  // 处理形如 3/4, 1/2 等纯数字分数
  text = text.replace(/(\d+)\/(\d+)/g, '$$\\frac{$1}{$2}$$')
  // 处理形如 (3S/2), (S/4) 等带括号的分数
  text = text.replace(/\(([A-Za-z0-9]+[A-Za-z]?)\/([A-Za-z0-9]+)\)/g, '$$\\frac{$1}{$2}$$')
  
  // 首先清理错误的大括号格式
  text = text.replace(/\\frac\{\{([^}]+)/g, '\\frac{$1')  // 修复 \frac{{12 -> \frac{12
  text = text.replace(/\\frac\}([^{]+)\s*\}/g, '\\frac{$1}')  // 修复 \frac}12 } -> \frac{12}
  text = text.replace(/\\frac([^{}\s]+)\s*\}/g, '\\frac{$1}')  // 修复 \frac12 } -> \frac{12}
  
  // 处理不完整的分数格式
  text = text.replace(/\\frac\{([^}]*)\}\s*([A-Za-z0-9+\-*\/()]+)(?!\})/g, '\\frac{$1}{$2}')
  text = text.replace(/\\frac([A-Za-z0-9+\-*\/()]+)\s*\{([^}]*)\}/g, '\\frac{$1}{$2}')
  
  // 处理基本的分数格式
  text = text.replace(/\\frac(\d+)(\d+)/g, '\\frac{$1}{$2}')
  text = text.replace(/\\frac([A-Za-z])([A-Za-z0-9])/g, '\\frac{$1}{$2}')
  text = text.replace(/\\frac([A-Za-z0-9])([A-Za-z])/g, '\\frac{$1}{$2}')
  
  // 处理带空格的分数
  text = text.replace(/\\frac\s+([A-Za-z0-9+\-*\/()]+)\s+([A-Za-z0-9+\-*\/()]+)/g, '\\frac{$1}{$2}')
  
  // 处理复杂表达式中的分数
  text = text.replace(/\\frac([A-Za-z0-9+\-*\/()]+)([A-Za-z0-9+\-*\/()]+)/g, (match, num, den) => {
    // 避免重复处理已经有大括号的
    if (match.includes('{') || match.includes('}')) {
      return match
    }
    return `\\frac{${num}}{${den}}`
  })
  
  // 最后清理多余的大括号
  text = text.replace(/\\frac\{\{([^}]+)\}\}/g, '\\frac{$1}')
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}\}/g, '\\frac{$1}{$2}')
  
  // 在预处理阶段就开始去除多余的括号
  // 去除变量赋值的括号，如 (DC = 2AB) -> DC = 2AB
  text = text.replace(/\(([A-Z]+\s*=\s*[A-Za-z0-9]+[A-Z]*)\)/g, '$1')
  
  // 去除比值表达式的括号，如 (= 3) -> = 3
  text = text.replace(/\(\s*=\s*([0-9]+)\s*\)/g, ' = $1')
  
  // 去除单个变量的括号，如 (h) -> h
  text = text.replace(/\(([a-z])\)/g, '$1')
  text = text.replace(/\(([A-Z])\)/g, '$1')
  
  // 去除数字的括号，如 (3) -> 3
  text = text.replace(/\((\d+)\)/g, '$1')

  return text
}

/**
 * 后处理HTML，清理不需要的符号
 */
function postProcessHtml(html: string): string {
  // 移除显示的$$符号（但保留KaTeX渲染的数学内容）
  html = html.replace(/\$\$/g, '')
  
  // 移除显示的单个$符号（在非数学内容中）
  html = html.replace(/(?<!<[^>]*)\$(?![^<]*>)/g, '')
  
  // 移除显示的大括号{}（但保留HTML属性中的和KaTeX分数中的）
  // 特别保护分数相关的大括号
  html = html.replace(/(?<!<[^>]*)\{(?![^<]*>)(?!.*frac)/g, '')
  html = html.replace(/(?<!<[^>]*)\}(?![^<]*>)(?<!frac.*)/g, '')
  
  // 全面移除各种不必要的括号
  
  // 1. 移除简单的字母组合括号
  html = html.replace(/\(([A-Z]{1,4})\)/g, '$1')
  html = html.replace(/\(([A-Z])\)/g, '$1')
  
  // 2. 移除变量赋值的括号，包括更复杂的表达式
  html = html.replace(/\(([A-Z]+\s*=\s*[A-Za-z0-9]+[A-Z]*)\)/g, '$1')
  html = html.replace(/\(([a-z]+\s*=\s*[A-Za-z0-9]+)\)/g, '$1')
  html = html.replace(/\(([a-z])\)/g, '$1')
  html = html.replace(/\((h)\)/g, '$1')
  
  // 3. 移除数字和变量的括号
  html = html.replace(/\((\d+)\)/g, '$1')
  html = html.replace(/\(([a-z]+)\)/g, '$1')
  
  // 4. 移除比值和等式的括号
  html = html.replace(/\(\s*=\s*([0-9]+)\s*\)/g, ' = $1')
  html = html.replace(/\(\s*比值\s*=\s*([0-9]+)\s*\)/g, '比值 = $1')
  html = html.replace(/\(\s*不是\s*([0-9]+)\s*\)/g, '不是 $1')
  
  // 5. 移除包围单个数学公式的括号
  html = html.replace(/\(\s*<span[^>]*class="katex[^>]*>[\s\S]*?<\/span>\s*\)/g, (match) => {
    return match.replace(/^\(\s*/, '').replace(/\s*\)$/, '')
  })
  
  // 6. 移除几何图形名称的括号
  html = html.replace(/\(([△▲∆])\s*([A-Z]+)\)/g, '$1$2')
  html = html.replace(/\((梯形)\s*([A-Z]+)\)/g, '$1$2')
  html = html.replace(/\((圆)\s*([A-Z]+)\)/g, '$1$2')
  html = html.replace(/\((正方形)\s*([A-Z]+)\)/g, '$1$2')
  html = html.replace(/\((长方形)\s*([A-Z]+)\)/g, '$1$2')
  
  // 7. 移除面积表达式的括号
  html = html.replace(/\((S[△▲∆梯形圆正方形长方形]*[A-Z]*)\)/g, '$1')
  
  // 8. 处理复杂的括号嵌套
  html = html.replace(/\(\s*([△▲∆])\s*([A-Z])\s*([A-Z])\s*([A-Z])\s*\1\2\3\4\s*\)/g, '$1$2$3$4')
  
  // 9. 移除底和高描述的括号
  html = html.replace(/（底\s*([A-Z]+)，高\s*\(([a-z])\)）/g, '底$1，高$2')
  html = html.replace(/\(底\s*([A-Z]+)，高\s*([a-z])\)/g, '底$1，高$2')
  
  // 10. 移除条件表达式的括号，如 (若 DC = AB)
  html = html.replace(/\((若|如果|设|已知)\s*([^)]+)\)/g, '$1$2')
  
  // 11. 移除结论表达式的括号，如 (则：)
  html = html.replace(/\((则|所以|因此)[:：]?\s*\)/g, '$1：')
  
  // 11.5. 移除单个点名称的LaTeX行内数学模式，如 \(D\) -> 点D
  html = html.replace(/\\?\\\(\s*([A-Z])\s*\\?\\\)/g, '点$1')
  html = html.replace(/\\\(\s*([A-Z])\s*\\\)/g, '点$1')
  
  // 12. 处理数学表达式中的换行和空格
  html = html.replace(/(<span[^>]*class="katex[^>]*>[\s\S]*?<\/span>)/g, (match) => {
    return match.replace(/\s+/g, ' ').trim()
  })
  
  // 13. 清理多余的空格和符号
  html = html.replace(/\s+⋅\s+⋅\s+/g, ' ⋅ ')  // 清理重复的乘号
  html = html.replace(/\s+\.\s+/g, '. ')  // 清理多余的点号空格
  html = html.replace(/\s{2,}/g, ' ')  // 清理多余的空格
  
  // 14. 修复分数显示问题
  html = html.replace(/(\d+)\s+(\d+)\s+([A-Z])\s+([A-Z])\s+​(\d+)\s+​\s+​\s+​(\d+)\s+​​/g, '$3$4')
  html = html.replace(/​+/g, '')  // 移除零宽度空格
  
  // 15. 修复三角形符号显示
  html = html.replace(/△\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+△([A-Z]+)/g, '△$1$2$3')
  
  // 16. 清理末尾的多余符号
  html = html.replace(/\s*\.\s*$/, '')
  html = html.replace(/\s*，\s*$/, '')
  
  // 处理下标符号，将 S_ABCD 转换为 S△ABCD 的形式
  html = html.replace(/S_\\triangle\s+([A-Z]+)/g, 'S△$1')
  
  // 处理梯形面积符号的后处理
  html = html.replace(/S_\{\\text\{梯形\s*([A-Z]+)\}\}/g, 'S梯形$1')
  html = html.replace(/S_\\text\{梯形\s*([A-Z]+)\}/g, 'S梯形$1')
  html = html.replace(/S_\{\\text\{梯形([A-Z]+)\}\}/g, 'S梯形$1')
  html = html.replace(/S_\\text\{梯形([A-Z]+)\}/g, 'S梯形$1')
  
  // 清理残留的LaTeX文本标记
  html = html.replace(/\\text\{([^}]+)\}/g, '$1')
  
  // 最后处理一般的下标符号（但要避免影响已处理的梯形符号和英文单词）
  // 只处理真正的几何图形标记，如 S_ABC, S_ABCD 等（通常是2-4个大写字母）
  html = html.replace(/S_([A-Z]{2,4})(?!梯形)(?![a-z])/g, 'S△$1')
  
  // 处理反斜杠符号
  html = html.replace(/\\\\/g, '')
  
  // 清理多余的空格和换行
  html = html.replace(/\s+/g, ' ').trim()
  
  return html
}

/**
 * 渲染Markdown文本为HTML
 * @param markdownText 原始markdown文本
 * @returns 安全的HTML字符串
 */
export function renderMarkdownToHtml(markdownText: string): string {
  try {
    // 预处理自定义数学标记
    const preprocessedText = preprocessMathTags(markdownText)
    
    // 使用markdown-it渲染
    const htmlContent = md.render(preprocessedText)
    
    // 使用DOMPurify进行XSS防护
    const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
      // 允许KaTeX生成的数学公式相关标签和属性
      ADD_TAGS: ['math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace', 'menclose', 'mstyle', 'mpadded', 'mphantom', 'mglyph'],
      ADD_ATTR: ['xmlns', 'aria-hidden', 'focusable', 'role', 'style', 'class', 'mathvariant', 'mathsize', 'mathcolor', 'mathbackground', 'displaystyle', 'scriptlevel', 'notation', 'close', 'open', 'separators', 'accent', 'accentunder', 'align', 'columnalign', 'columnlines', 'columnspacing', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'encoding', 'equalcolumns', 'equalrows', 'fence', 'fontstyle', 'fontweight', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linebreak', 'lineleading', 'linethickness', 'location', 'longdivstyle', 'lspace', 'lquote', 'maxsize', 'minsize', 'movablelimits', 'numalign', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xlink:href', 'xlink:show', 'xlink:type', 'xmlns:xlink']
    })
    
    // 后处理HTML，清理不需要的符号
    const cleanedHtml = postProcessHtml(sanitizedHtml)
    
    return cleanedHtml
  } catch (error) {
    console.error('Markdown rendering error:', error)
    // 如果渲染失败，返回转义后的原始文本
    return DOMPurify.sanitize(markdownText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'))
  }
}

/**
 * 检查文本是否包含数学公式
 * @param text 文本内容
 * @returns 是否包含数学公式
 */
export function containsMathFormula(text: string): boolean {
  // 检查各种数学公式标记
  const mathPatterns = [
    /\$begin:math:text\$.*?\$end:math:text\$/,
    /\$begin:math:display\$.*?\$end:math:display\$/,
    /\$\$.*?\$\$/,
    /\$[^$\n]+\$/
  ]
  
  return mathPatterns.some(pattern => pattern.test(text))
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