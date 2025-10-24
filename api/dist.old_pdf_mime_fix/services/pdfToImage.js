"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertPdfToTextByOcr = convertPdfToTextByOcr;
exports.estimateOcrTime = estimateOcrTime;
exports.estimateOcrMemory = estimateOcrMemory;
const pdf2pic_1 = require("pdf2pic");
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const tongyi_1 = require("./tongyi");
/**
 * 从 OSS URL 下载 PDF 并进行 OCR 识别（逐页处理）
 * @param ossUrl - OSS 预签名 URL
 * @param totalPages - PDF 总页数（从元数据获取）
 * @param onProgress - 进度回调函数
 * @returns 所有页面 OCR 结果的拼接文本
 */
async function convertPdfToTextByOcr(ossUrl, totalPages, onProgress) {
    console.log(`=== PDF OCR 处理：共 ${totalPages} 页 ===`);
    // 创建临时目录
    const tempDir = path_1.default.join('/tmp', `pdf-ocr-${Date.now()}`);
    await promises_1.default.mkdir(tempDir, { recursive: true });
    try {
        // 1. 下载 PDF 到临时文件
        await reportProgress(1, totalPages, '下载 PDF 文件...', onProgress);
        const pdfPath = await downloadPdfToTemp(ossUrl, tempDir);
        // 2. 配置 pdf2pic
        const converter = (0, pdf2pic_1.fromPath)(pdfPath, {
            density: 150, // 150 DPI（平衡质量和文件大小）
            format: 'png', // PNG 格式，OCR 效果更好
            width: 2000, // 2000px 宽度
            height: 2000, // 2000px 高度
            saveFilename: 'page',
            savePath: tempDir,
        });
        // 3. 逐页处理
        const pageTexts = [];
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            await reportProgress(pageNum, totalPages, `处理第 ${pageNum}/${totalPages} 页...`, onProgress);
            try {
                // 3.1 转换为图片
                const conversionResult = await converter(pageNum, { responseType: 'image' });
                if (!conversionResult || !conversionResult.path) {
                    console.warn(`⚠️ 第 ${pageNum} 页转换失败，跳过`);
                    pageTexts.push(`[第 ${pageNum} 页转换失败]`);
                    continue;
                }
                const imagePath = conversionResult.path;
                // 3.2 上传图片到 OSS（这里简化处理，直接读取文件并转 base64）
                // 实际生产环境应该上传到 OSS 并使用预签名 URL
                const imageBuffer = await promises_1.default.readFile(imagePath);
                const base64Image = imageBuffer.toString('base64');
                const imageUrl = `data:image/png;base64,${base64Image}`;
                // 3.3 调用通义千问 OCR
                const pageText = await (0, tongyi_1.analyzePdfPage)(imageUrl, pageNum);
                pageTexts.push(pageText);
                // 3.4 立即删除临时图片文件（节省磁盘空间）
                await promises_1.default.unlink(imagePath).catch(e => console.warn(`删除临时文件失败: ${e.message}`));
                console.log(`✅ 第 ${pageNum} 页 OCR 完成，文本长度: ${pageText.length}`);
            }
            catch (error) {
                console.error(`❌ 第 ${pageNum} 页处理失败:`, error.message);
                pageTexts.push(`[第 ${pageNum} 页处理失败: ${error.message}]`);
            }
        }
        // 4. 拼接所有页面文本
        await reportProgress(totalPages, totalPages, 'OCR 处理完成', onProgress);
        const fullText = pageTexts.join('\n\n');
        console.log(`✅ PDF OCR 全部完成，总文本长度: ${fullText.length}`);
        return fullText;
    }
    finally {
        // 5. 清理临时目录
        await promises_1.default.rm(tempDir, { recursive: true, force: true }).catch(e => {
            console.warn(`清理临时目录失败: ${e.message}`);
        });
    }
}
/**
 * 下载 PDF 到临时目录
 * @param ossUrl - OSS URL
 * @param tempDir - 临时目录
 * @returns PDF 文件路径
 */
async function downloadPdfToTemp(ossUrl, tempDir) {
    console.log('下载 PDF 文件到临时目录...');
    const response = await axios_1.default.get(ossUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60秒超时
        maxContentLength: 100 * 1024 * 1024, // 最大 100MB
    });
    const pdfBuffer = Buffer.from(response.data);
    const pdfPath = path_1.default.join(tempDir, 'document.pdf');
    await promises_1.default.writeFile(pdfPath, pdfBuffer);
    console.log(`✅ PDF 已保存到: ${pdfPath}，大小: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    return pdfPath;
}
/**
 * 报告处理进度
 */
async function reportProgress(currentPage, totalPages, message, onProgress) {
    const percentage = Math.round((currentPage / totalPages) * 100);
    console.log(`[${percentage}%] ${message}`);
    if (onProgress) {
        await onProgress({
            currentPage,
            totalPages,
            percentage,
            message,
        });
    }
}
/**
 * 估算 PDF OCR 处理时间
 * @param pageCount - 页数
 * @returns 预估时间（秒）
 */
function estimateOcrTime(pageCount) {
    // 根据实际测试：
    // - pdf2pic 转换：约 0.5 秒/页
    // - 通义千问 OCR：约 15 秒/页（qwen-vl-plus）
    // - 总计：约 15.5 秒/页
    const secondsPerPage = 15.5;
    return Math.ceil(pageCount * secondsPerPage);
}
/**
 * 估算 PDF OCR 内存使用
 * @param pageCount - 页数
 * @param fileSize - 文件大小（字节）
 * @returns 预估内存使用（字节）
 */
function estimateOcrMemory(pageCount, fileSize) {
    // 内存使用估算：
    // 1. PDF 文件本身：fileSize
    // 2. PDF 解析：fileSize * 1.5
    // 3. 图片转换（单页）：约 5MB（2000x2000 PNG）
    // 4. OCR 处理开销：约 50MB
    // 总计：fileSize * 2.5 + 55MB
    return Math.ceil(fileSize * 2.5 + 55 * 1024 * 1024);
}
