"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPdfUrl = extractTextFromPdfUrl;
exports.extractTextFromBuffer = extractTextFromBuffer;
exports.cleanExtractedText = cleanExtractedText;
exports.hasEnoughText = hasEnoughText;
exports.getPdfMetadata = getPdfMetadata;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const axios_1 = __importDefault(require("axios"));
/**
 * PDF 文字提取服务
 * 用于从 PDF 文档中提取纯文本内容
 * 支持 OSS URL 和本地文件路径
 */
/**
 * 从 OSS URL 下载 PDF 并提取文字
 * @param ossUrl - OSS 预签名 URL 或永久 URL
 * @returns 提取的文本内容
 */
async function extractTextFromPdfUrl(ossUrl) {
    try {
        console.log('=== PDF 文字提取：从 OSS URL 下载 ===');
        console.log('URL:', ossUrl.substring(0, 100) + '...');
        // 下载 PDF 文件到内存
        const response = await axios_1.default.get(ossUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30秒超时
            maxContentLength: 100 * 1024 * 1024, // 最大 100MB
        });
        const pdfBuffer = Buffer.from(response.data);
        console.log(`✅ PDF 下载成功，大小: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        // 提取文字
        return await extractTextFromBuffer(pdfBuffer);
    }
    catch (error) {
        console.error('❌ PDF 文字提取失败:', error.message);
        throw new Error(`PDF 文字提取失败: ${error.message}`);
    }
}
/**
 * 从 Buffer 中提取 PDF 文字
 * @param pdfBuffer - PDF 文件的 Buffer
 * @returns 提取的文本内容
 */
async function extractTextFromBuffer(pdfBuffer) {
    try {
        console.log('=== PDF 文字提取：解析 PDF ===');
        const data = await (0, pdf_parse_1.default)(pdfBuffer, {
            // pdf-parse 配置选项
            max: 0, // 不限制页数
        });
        const text = data.text.trim();
        const pageCount = data.numpages;
        const info = data.info;
        console.log(`✅ PDF 解析成功`);
        console.log(`   - 页数: ${pageCount}`);
        console.log(`   - 文本长度: ${text.length} 字符`);
        console.log(`   - 标题: ${info?.Title || '无'}`);
        console.log(`   - 作者: ${info?.Author || '无'}`);
        return text;
    }
    catch (error) {
        console.error('❌ PDF 解析失败:', error.message);
        throw new Error(`PDF 解析失败: ${error.message}`);
    }
}
/**
 * 清理提取的文本
 * 移除页眉、页脚、多余空白等
 * @param text - 原始文本
 * @returns 清理后的文本
 */
function cleanExtractedText(text) {
    let cleaned = text;
    // 1. 统一换行符
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // 2. 移除多余的空行（超过 2 个连续换行）
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    // 3. 移除每行前后的空格
    cleaned = cleaned
        .split('\n')
        .map(line => line.trim())
        .join('\n');
    // 4. 移除常见的页眉页脚模式（页码、日期等）
    // 例如：第 1 页 共 100 页、Page 1 of 100
    cleaned = cleaned.replace(/第\s*\d+\s*页\s*共\s*\d+\s*页/g, '');
    cleaned = cleaned.replace(/Page\s+\d+\s+of\s+\d+/gi, '');
    cleaned = cleaned.replace(/^\d+$/gm, ''); // 单独一行的数字（可能是页码）
    // 5. 再次清理多余空行
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
}
/**
 * 检查文本内容是否足够（判断是否需要 OCR）
 * @param text - 提取的文本
 * @param minLength - 最小文本长度（默认 100 字符）
 * @returns 是否有足够的文本
 */
function hasEnoughText(text, minLength = 100) {
    const cleaned = text.trim();
    return cleaned.length >= minLength;
}
/**
 * 获取 PDF 元数据
 * @param ossUrl - OSS URL
 * @returns PDF 元数据（页数、标题、作者等）
 */
async function getPdfMetadata(ossUrl) {
    try {
        const response = await axios_1.default.get(ossUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 100 * 1024 * 1024,
        });
        const pdfBuffer = Buffer.from(response.data);
        const data = await (0, pdf_parse_1.default)(pdfBuffer);
        return {
            pages: data.numpages,
            title: data.info?.Title,
            author: data.info?.Author,
            subject: data.info?.Subject,
            keywords: data.info?.Keywords,
            creator: data.info?.Creator,
            producer: data.info?.Producer,
            creationDate: data.info?.CreationDate,
        };
    }
    catch (error) {
        console.error('获取 PDF 元数据失败:', error.message);
        throw new Error(`获取 PDF 元数据失败: ${error.message}`);
    }
}
