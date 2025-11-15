import puppeteer from 'puppeteer'
import { marked } from 'marked'

interface ReportData {
  studentName: string
  studentGrade?: string
  createdAt: string
  report: string
}

export async function generateReportPDF(reportData: ReportData): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()

    // 将Markdown转换为HTML
    const htmlContent = await marked(reportData.report)

    // 构建完整的HTML文档
    const fullHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>学生测评报告 - ${reportData.studentName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.8;
      color: #333;
      background: #fff;
      padding: 40px 60px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #409eff;
    }

    .header h1 {
      font-size: 32px;
      color: #303133;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .header .subtitle {
      font-size: 18px;
      color: #606266;
      margin-bottom: 20px;
    }

    .meta-info {
      display: flex;
      justify-content: center;
      gap: 40px;
      font-size: 14px;
      color: #909399;
    }

    .meta-info span {
      display: flex;
      align-items: center;
    }

    .meta-info strong {
      color: #606266;
      margin-right: 8px;
    }

    .content {
      font-size: 15px;
      line-height: 2;
    }

    .content h1 {
      font-size: 28px;
      color: #303133;
      margin: 40px 0 20px 0;
      padding-left: 16px;
      border-left: 5px solid #409eff;
    }

    .content h2 {
      font-size: 24px;
      color: #409eff;
      margin: 35px 0 18px 0;
      padding-left: 12px;
      border-left: 4px solid #67c23a;
    }

    .content h3 {
      font-size: 20px;
      color: #606266;
      margin: 30px 0 15px 0;
      padding-left: 10px;
      border-left: 3px solid #e6a23c;
    }

    .content h4 {
      font-size: 18px;
      color: #909399;
      margin: 25px 0 12px 0;
    }

    .content p {
      margin: 15px 0;
      text-align: justify;
      text-indent: 2em;
    }

    .content ul, .content ol {
      margin: 15px 0;
      padding-left: 40px;
    }

    .content li {
      margin: 10px 0;
    }

    .content strong {
      color: #303133;
      font-weight: 600;
    }

    .content em {
      color: #409eff;
      font-style: normal;
      font-weight: 500;
    }

    .content blockquote {
      margin: 20px 0;
      padding: 15px 20px;
      background: #f5f7fa;
      border-left: 4px solid #409eff;
      color: #606266;
      font-style: italic;
    }

    .content code {
      background: #f5f7fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      color: #e6a23c;
    }

    .content pre {
      background: #f5f7fa;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 20px 0;
    }

    .content pre code {
      background: none;
      padding: 0;
    }

    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .content table th,
    .content table td {
      border: 1px solid #dcdfe6;
      padding: 12px 15px;
      text-align: left;
    }

    .content table th {
      background: #f5f7fa;
      color: #303133;
      font-weight: 600;
    }

    .content table tr:nth-child(even) {
      background: #fafafa;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e4e7ed;
      text-align: center;
      font-size: 13px;
      color: #909399;
    }

    @media print {
      body {
        padding: 20px 30px;
      }

      .header h1 {
        font-size: 28px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>学生综合测评报告</h1>
    <div class="subtitle">Student Comprehensive Assessment Report</div>
    <div class="meta-info">
      <span><strong>姓名：</strong>${reportData.studentName}</span>
      ${reportData.studentGrade ? `<span><strong>年级：</strong>${reportData.studentGrade}</span>` : ''}
      <span><strong>生成时间：</strong>${new Date(reportData.createdAt).toLocaleString('zh-CN')}</span>
    </div>
  </div>

  <div class="content">
    ${htmlContent}
  </div>

  <div class="footer">
    <p>本报告由智能学习系统自动生成 | 仅供参考，请结合实际情况综合评估</p>
    <p>© ${new Date().getFullYear()} 学习管理平台 - 所有权利保留</p>
  </div>
</body>
</html>
    `

    // 设置页面内容
    await page.setContent(fullHTML, {
      waitUntil: 'networkidle0'
    })

    // 生成PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    })

    return pdfBuffer
  } finally {
    await browser.close()
  }
}
