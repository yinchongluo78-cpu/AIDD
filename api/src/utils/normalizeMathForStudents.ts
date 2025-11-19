/**
 * 数学表达规范化工具（修复版）
 * 目标：修复 AI 输出的 LaTeX 错误，并转换符号为 Unicode
 */

const LATEX_UNICODE_MAP: Record<string, string> = {
  // 几何符号
  '\\triangle': '△',
  '\\angle': '∠',
  '\\perp': '⊥',
  '\\parallel': '∥',
  '\\sim': '~',
  '\\cong': '≌',
  '\\equiv': '≡',
  '\\circ': '∘',

  // 运算符
  '\\cdot': '·',
  '\\times': '×',
  '\\div': '÷',
  '\\pm': '±',
  '\\mp': '∓',

  // 比较符号
  '\\neq': '≠',
  '\\leq': '≤',
  '\\geq': '≥',
  '\\le': '≤',
  '\\ge': '≥',
  '\\approx': '≈',

  // 其他符号
  '\\infty': '∞',
  '\\degree': '°',
  '\\therefore': '∴',
  '\\because': '∵',
  '\\pi': 'π',

  // 常用希腊字母
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\theta': 'θ',
  '\\lambda': 'λ',
  '\\mu': 'μ',
  '\\sigma': 'σ',
  '\\omega': 'ω',
}

export function normalizeMathForStudents(text: string): string {
  if (!text) {
    console.log('[normalizeMath] 输入为空')
    return text
  }

  console.log('[normalizeMath] 输入长度:', text.length)
  console.log('[normalizeMath] 输入前100字符:', text.substring(0, 100))

  let result = text

  // ========== 第一步：修复 LaTeX 简写格式 ==========

  // 修复 \frac 简写：\frac12 → \frac{1}{2}
  result = result.replace(/\\frac(\d)(\d)/g, '\\frac{$1}{$2}')
  result = result.replace(/\\dfrac(\d)(\d)/g, '\\dfrac{$1}{$2}')

  // 修复 \frac{x}2 → \frac{x}{2}（分母没有花括号）
  result = result.replace(/\\frac(\{[^{}]*\})(\d)/g, '\\frac$1{$2}')
  result = result.replace(/\\dfrac(\{[^{}]*\})(\d)/g, '\\dfrac$1{$2}')

  // 修复 \frac1{x} → \frac{1}{x}（分子没有花括号）
  result = result.replace(/\\frac(\d)(\{[^{}]*\})/g, '\\frac{$1}$2')
  result = result.replace(/\\dfrac(\d)(\{[^{}]*\})/g, '\\dfrac{$1}$2')

  // 修复 \sqrt 简写：\sqrt2 → \sqrt{2}
  result = result.replace(/\\sqrt(\d+)(?!\{)/g, '\\sqrt{$1}')
  result = result.replace(/\\sqrt([a-zA-Z])(?!\{)/g, '\\sqrt{$1}')

  // ========== 第二步：处理未包裹在 $ 中的 LaTeX 命令 ==========

  // 替换 \implies 为箭头符号（直接用 Unicode，避免渲染问题）
  result = result.replace(/\\implies/g, '⟹')
  result = result.replace(/\\Rightarrow/g, '⇒')
  result = result.replace(/\\rightarrow/g, '→')
  result = result.replace(/\\leftarrow/g, '←')
  result = result.replace(/\\Leftarrow/g, '⇐')

  // 查找裸露的 \frac 和 \dfrac，包裹在 $ 中
  // 使用更简单的方法：检测 \frac 或 \dfrac 后面跟着 {...}{...}
  result = wrapNakedLatex(result)

  // ========== 第三步：Unicode 符号替换 ==========

  Object.entries(LATEX_UNICODE_MAP).forEach(([latex, unicode]) => {
    // 在 $ 外部替换 LaTeX 命令为 Unicode
    result = replaceOutsideMath(result, latex, unicode)
  })

  // ========== 第四步：清理格式 ==========

  // 🔥 修复：只清理每行内的多余空格，保留换行符（markdown 需要）
  result = result.split('\n').map(line => {
    // 每行内部：多个空格替换为一个
    return line.replace(/ +/g, ' ').trim()
  }).join('\n')

  // 清理 $ 周围的空格（但不跨行）
  result = result.replace(/\$ +/g, '$')
  result = result.replace(/ +\$/g, '$')
  // 修复可能产生的 $$ (空公式)
  result = result.replace(/\$\$/g, '')

  const finalResult = result.trim()

  console.log('[normalizeMath] 输出长度:', finalResult.length)
  console.log('[normalizeMath] 输出前100字符:', finalResult.substring(0, 100))

  return finalResult
}

/**
 * 包裹裸露的 LaTeX 命令（\frac, \dfrac, \sqrt）
 * 使用栈来正确处理嵌套的花括号
 */
function wrapNakedLatex(text: string): string {
  // 分割文本为数学和非数学部分
  const parts: string[] = []
  let current = ''
  let inMath = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '$' && text[i - 1] !== '\\') {
      if (inMath) {
        // 结束数学环境
        current += char
        parts.push(current)
        current = ''
        inMath = false
      } else {
        // 开始数学环境
        if (current) {
          parts.push(current)
        }
        current = char
        inMath = true
      }
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  // 只在非数学部分查找并包裹裸露的 LaTeX
  return parts.map(part => {
    if (part.startsWith('$')) {
      return part // 保持数学部分不变
    }

    // 在普通文本中查找并包裹 LaTeX 命令
    return wrapLatexCommands(part)
  }).join('')
}

/**
 * 在文本中查找并包裹 LaTeX 命令，正确处理嵌套花括号
 */
function wrapLatexCommands(text: string): string {
  let result = ''
  let i = 0

  while (i < text.length) {
    // 查找 \frac, \dfrac, \sqrt
    if (text[i] === '\\') {
      const remaining = text.substring(i)

      // 尝试匹配 \dfrac
      if (remaining.startsWith('\\dfrac{')) {
        const matched = extractFrac(remaining, '\\dfrac')
        if (matched) {
          result += `$${matched}$`
          i += matched.length
          continue
        }
      }

      // 尝试匹配 \frac
      if (remaining.startsWith('\\frac{')) {
        const matched = extractFrac(remaining, '\\frac')
        if (matched) {
          result += `$${matched}$`
          i += matched.length
          continue
        }
      }

      // 尝试匹配 \sqrt
      if (remaining.startsWith('\\sqrt{')) {
        const matched = extractSqrt(remaining)
        if (matched) {
          result += `$${matched}$`
          i += matched.length
          continue
        }
      }
    }

    result += text[i]
    i++
  }

  return result
}

/**
 * 提取 \frac{...}{...} 或 \dfrac{...}{...}，处理嵌套花括号
 */
function extractFrac(text: string, command: string): string | null {
  if (!text.startsWith(command + '{')) return null

  let i = command.length // 跳过 \frac 或 \dfrac

  // 提取第一个 {...}
  const first = extractBraces(text, i)
  if (!first) return null
  i += first.length

  // 提取第二个 {...}
  const second = extractBraces(text, i)
  if (!second) return null

  return command + first + second
}

/**
 * 提取 \sqrt{...}，处理嵌套花括号
 */
function extractSqrt(text: string): string | null {
  if (!text.startsWith('\\sqrt{')) return null

  const braces = extractBraces(text, 5) // 跳过 \sqrt
  if (!braces) return null

  return '\\sqrt' + braces
}

/**
 * 从指定位置提取匹配的 {...}，处理嵌套
 */
function extractBraces(text: string, startIndex: number): string | null {
  if (text[startIndex] !== '{') return null

  let depth = 0
  let i = startIndex

  while (i < text.length) {
    if (text[i] === '{' && text[i - 1] !== '\\') {
      depth++
    } else if (text[i] === '}' && text[i - 1] !== '\\') {
      depth--
      if (depth === 0) {
        return text.substring(startIndex, i + 1)
      }
    }
    i++
  }

  return null // 没有找到匹配的 }
}

/**
 * 只在数学环境 ($...$) 外部替换文本
 */
function replaceOutsideMath(text: string, search: string, replace: string): string {
  // 分割文本为数学和非数学部分
  const parts: string[] = []
  let current = ''
  let inMath = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '$' && text[i - 1] !== '\\') {
      if (inMath) {
        // 结束数学环境
        current += char
        parts.push(current)
        current = ''
        inMath = false
      } else {
        // 开始数学环境
        if (current) {
          parts.push(current)
        }
        current = char
        inMath = true
      }
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  // 只在非数学部分进行替换
  return parts.map(part => {
    if (part.startsWith('$')) {
      return part // 保持数学部分不变
    }
    // 在普通文本中替换
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return part.replace(new RegExp(escaped, 'g'), replace)
  }).join('')
}
