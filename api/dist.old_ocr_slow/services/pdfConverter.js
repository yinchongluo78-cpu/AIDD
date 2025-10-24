"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertPdfPagesToImages = convertPdfPagesToImages;
exports.checkPdfPageCount = checkPdfPageCount;
// PDF 转换功能：使用 pdf-parse 检查页数，使用通义千问 OCR 识别内容
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const ali_oss_1 = __importDefault(require("ali-oss"));
// 创建OSS客户端
const ossClient = new ali_oss_1.default({
    region: process.env.OSS_REGION || '',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    timeout: 600000
});
/**
 * 将PDF页面转换为图片并上传到OSS
 * 注意：此功能暂时禁用，因为需要 pdfjs-dist 的 ESM 支持
 * 当前使用通义千问 OCR 直接识别 PDF 整体
 * @param pdfBuffer - PDF文件的Buffer
 * @param maxPages - 最大页数限制（默认25页）
 * @returns 上传到OSS的图片URL数组
 */
async function convertPdfPagesToImages(pdfBuffer, maxPages = 25) {
    throw new Error('PDF转图片功能暂时禁用（使用通义千问OCR整体识别）');
}
/**
 * 检查PDF页数是否超过限制
 * @param pdfBuffer - PDF文件的Buffer
 * @param maxPages - 最大页数限制
 * @returns { totalPages, exceedsLimit }
 */
async function checkPdfPageCount(pdfBuffer, maxPages = 25) {
    try {
        // 使用 pdf-parse 获取 PDF 信息
        const data = await (0, pdf_parse_1.default)(pdfBuffer);
        const totalPages = data.numpages;
        console.log(`PDF 页数检查：总页数 ${totalPages}，限制 ${maxPages} 页`);
        return {
            totalPages,
            exceedsLimit: totalPages > maxPages
        };
    }
    catch (error) {
        console.error('PDF 页数检查失败:', error);
        // 如果检查失败，保守处理：不阻止文档上传
        return {
            totalPages: 0,
            exceedsLimit: false
        };
    }
}
