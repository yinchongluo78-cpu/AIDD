"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndStoreDocument = parseAndStoreDocument;
exports.searchDocumentChunks = searchDocumentChunks;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const oss_1 = require("./oss");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const pdfConverter_1 = require("./pdfConverter");
const tongyi_1 = require("./tongyi");
const prisma = new client_1.PrismaClient();
// OCR设置
const OCR_TEXT_THRESHOLD = 50; // 提取文字少于50字符时触发OCR
const OCR_MAX_PAGES = 200; // OCR最多处理200页
// 切片大小（约400字）
const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 50; // 重叠部分，保证上下文连贯
/**
 * 解析并存储文档内容到chunks
 */
async function parseAndStoreDocument(documentId, documentUrl) {
    try {
        console.log(`开始解析文档: ${documentId}`);
        // 获取文档信息，判断文件类型
        const document = await prisma.kbDocument.findUnique({
            where: { id: documentId }
        });
        if (!document) {
            throw new Error('文档不存在');
        }
        const isPdf = document.fileExt?.toLowerCase() === '.pdf' ||
            document.filename?.toLowerCase().endsWith('.pdf');
        const isDocx = document.fileExt?.toLowerCase().includes('wordprocessingml') ||
            document.filename?.toLowerCase().endsWith('.docx');
        console.log(`文件类型: ${isPdf ? 'PDF' : isDocx ? 'DOCX' : '文本文件'}`);
        // 获取文档内容
        let content = '';
        // documentUrl 可能是：
        // 1. 完整的 OSS URL (http://xxx.aliyuncs.com/documents/xxx.docx)
        // 2. OSS key (documents/xxx.docx)
        // 3. 本地文件路径 (/uploads/xxx.docx)
        let ossKey = documentUrl;
        let isOSSFile = false;
        // 判断是否为 OSS 文件
        if (documentUrl.startsWith('http')) {
            // 完整的 OSS URL
            isOSSFile = true;
            if (documentUrl.includes('aliyuncs.com/')) {
                ossKey = documentUrl.split('aliyuncs.com/')[1];
            }
        }
        else if (!documentUrl.startsWith('/')) {
            // 不是绝对路径，假设是 OSS key
            isOSSFile = true;
        }
        if (isOSSFile) {
            // 从 OSS 下载文件
            console.log(`准备从 OSS 下载文件，key: ${ossKey}`);
            let signedUrl;
            try {
                signedUrl = await (0, oss_1.getSignedUrl)(ossKey, 3600);
                console.log('签名URL生成成功:', signedUrl.substring(0, 100) + '...');
            }
            catch (urlError) {
                console.error('生成签名URL失败:', urlError);
                throw new Error(`无法生成文件访问链接: ${urlError.message}`);
            }
            try {
                if (isPdf) {
                    // PDF文件：下载为buffer
                    console.log('开始下载 PDF 文件...');
                    const response = await axios_1.default.get(signedUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000, // PDF文件可能较大，增加超时时间
                        maxContentLength: 100 * 1024 * 1024 // 100MB
                    });
                    console.log(`PDF文件下载完成，大小: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`);
                    const pdfBuffer = Buffer.from(response.data);
                    // 首先尝试使用pdf-parse提取文字
                    console.log('开始使用 pdf-parse 提取文字...');
                    const pdfData = await (0, pdf_parse_1.default)(pdfBuffer);
                    const extractedText = pdfData.text.trim();
                    console.log(`PDF文字提取完成，提取文本长度: ${extractedText.length}`);
                    console.log(`PDF信息 - 页数: ${pdfData.numpages}, 文本预览: ${extractedText.substring(0, 200)}`);
                    // 判断是否需要OCR
                    if (extractedText.length < OCR_TEXT_THRESHOLD) {
                        console.log(`⚠️ 提取文字少于${OCR_TEXT_THRESHOLD}字符，识别为扫描版PDF，准备使用OCR...`);
                        // 检查PDF页数
                        const { totalPages, exceedsLimit } = await (0, pdfConverter_1.checkPdfPageCount)(pdfBuffer, OCR_MAX_PAGES);
                        console.log(`PDF总页数: ${totalPages}`);
                        if (exceedsLimit) {
                            // 超过200页，抛出错误提示用户
                            throw new Error(`该PDF文档共${totalPages}页，超过扫描版PDF处理限制（${OCR_MAX_PAGES}页）。请上传文本格式的PDF，或将文档拆分为${OCR_MAX_PAGES}页以内的小文件。`);
                        }
                        // 更新文档状态为处理中，并记录总页数
                        await prisma.kbDocument.update({
                            where: { id: documentId },
                            data: {
                                status: 'processing',
                                processingCurrent: 0,
                                processingTotal: totalPages
                            }
                        });
                        // 启动模拟进度更新（异步，不阻塞主流程）
                        const progressInterval = startProgressSimulation(documentId, totalPages, 5000); // 每5秒更新
                        try {
                            // 使用通义千问识别整个PDF（简化版：一次性识别）
                            console.log(`🔄 开始使用通义千问OCR识别整个PDF文档...`);
                            content = await (0, tongyi_1.analyzeScannedPdfDocument)(signedUrl, totalPages);
                            console.log(`🎉 OCR识别完成，总内容长度: ${content.length}`);
                            // 停止进度模拟
                            clearInterval(progressInterval);
                            // 设置为100%完成
                            await prisma.kbDocument.update({
                                where: { id: documentId },
                                data: {
                                    processingCurrent: totalPages
                                }
                            });
                        }
                        catch (ocrError) {
                            // OCR失败，停止进度模拟
                            clearInterval(progressInterval);
                            throw ocrError;
                        }
                    }
                    else {
                        // 文字提取成功，使用pdf-parse的结果
                        content = extractedText;
                        console.log('✅ 使用文字提取结果');
                    }
                }
                else if (isDocx) {
                    // DOCX文件：下载为buffer
                    console.log('开始下载 DOCX 文件...');
                    const response = await axios_1.default.get(signedUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        maxContentLength: 100 * 1024 * 1024 // 100MB
                    });
                    console.log(`DOCX文件下载完成，大小: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`);
                    // 使用mammoth解析
                    console.log('开始解析 DOCX 文件...');
                    const result = await mammoth_1.default.extractRawText({ buffer: response.data });
                    content = result.value;
                    console.log(`DOCX解析完成，提取文本长度: ${content.length}`);
                    console.log(`DOCX文本预览: ${content.substring(0, 200)}`);
                }
                else {
                    // 文本文件：保持原有逻辑
                    console.log('开始下载文本文件...');
                    const response = await axios_1.default.get(signedUrl, {
                        responseType: 'text',
                        timeout: 30000,
                        maxContentLength: 100 * 1024 * 1024 // 100MB
                    });
                    content = response.data;
                    console.log(`文本文件下载完成，内容长度: ${content.length}`);
                }
            }
            catch (downloadError) {
                console.error('下载或解析文件失败:', downloadError);
                if (axios_1.default.isAxiosError(downloadError)) {
                    console.error('Axios错误详情:', {
                        message: downloadError.message,
                        code: downloadError.code,
                        status: downloadError.response?.status,
                        statusText: downloadError.response?.statusText
                    });
                }
                throw new Error(`文件下载或解析失败: ${downloadError.message}`);
            }
        }
        else {
            // 本地文件路径 - 需要处理相对路径
            const fs = require('fs').promises;
            const path = require('path');
            let fullPath = documentUrl;
            // 如果是相对路径，拼接完整路径
            if (documentUrl.startsWith('/uploads/')) {
                fullPath = path.join(__dirname, '../../', documentUrl);
            }
            console.log(`尝试读取文件: ${fullPath}`);
            if (isPdf) {
                // PDF文件：读取为buffer
                const dataBuffer = await fs.readFile(fullPath);
                const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
                content = pdfData.text;
                console.log(`PDF解析完成，提取文本长度: ${content.length}`);
            }
            else if (isDocx) {
                // DOCX文件：读取为buffer
                const dataBuffer = await fs.readFile(fullPath);
                const result = await mammoth_1.default.extractRawText({ buffer: dataBuffer });
                content = result.value;
                console.log(`DOCX解析完成，提取文本长度: ${content.length}`);
            }
            else {
                // 文本文件：保持原有逻辑
                content = await fs.readFile(fullPath, 'utf-8');
                console.log(`文件读取成功，内容长度: ${content.length}`);
            }
        }
        // 清理内容
        console.log(`开始清理文档内容，原始长度: ${content.length}`);
        try {
            content = cleanContent(content);
            console.log(`内容清理完成，清理后长度: ${content.length}`);
        }
        catch (cleanError) {
            console.error('清理内容失败:', cleanError);
            throw new Error(`内容清理失败: ${cleanError.message}`);
        }
        // 创建文档切片
        console.log(`开始创建文档切片，CHUNK_SIZE: ${CHUNK_SIZE}, OVERLAP: ${CHUNK_OVERLAP}`);
        let chunks;
        try {
            chunks = createChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);
            console.log(`文档分割成 ${chunks.length} 个切片`);
            if (chunks.length > 0) {
                console.log(`切片预览（前3个）:`, chunks.slice(0, Math.min(3, chunks.length)).map((c, i) => `[${i}] ${c.substring(0, 50)}...`));
            }
        }
        catch (chunkError) {
            console.error('创建切片失败:', chunkError);
            throw new Error(`文档分割失败: ${chunkError.message}`);
        }
        if (chunks.length === 0) {
            console.warn('警告：文档分割后没有产生任何切片');
            return 0;
        }
        // 删除该文档的旧切片（如果存在）
        console.log(`检查并删除文档的旧切片...`);
        const deleteResult = await prisma.kbChunk.deleteMany({
            where: { docId: documentId }
        });
        console.log(`已删除 ${deleteResult.count} 个旧切片`);
        // 批量存储切片到数据库（分批处理，避免内存溢出）
        console.log(`开始存储切片到数据库，文档ID: ${documentId}`);
        try {
            const BATCH_SIZE = 10; // 每次处理10个切片
            let savedCount = 0;
            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                const batch = chunks.slice(i, i + BATCH_SIZE);
                const batchPromises = batch.map((chunk, batchIndex) => prisma.kbChunk.create({
                    data: {
                        docId: documentId,
                        content: chunk,
                        seq: i + batchIndex
                    }
                }));
                await Promise.all(batchPromises);
                savedCount += batch.length;
                console.log(`进度: ${savedCount}/${chunks.length} 个切片已保存`);
                // 清理内存
                if (global.gc) {
                    global.gc();
                }
            }
            console.log(`✅ 成功存储 ${chunks.length} 个切片到数据库`);
        }
        catch (dbError) {
            console.error('❌ 存储切片到数据库失败:', dbError);
            console.error('错误详情:', {
                message: dbError.message,
                code: dbError.code,
                meta: dbError.meta
            });
            throw dbError;
        }
        return chunks.length;
    }
    catch (error) {
        console.error('解析文档失败:', error);
        throw error;
    }
}
/**
 * 清理文档内容（保守版本 - 避免过度清理导致内容丢失）
 */
function cleanContent(content) {
    // 移除常见的页眉页脚模式
    content = content.replace(/第\s*\d+\s*页/g, '');
    content = content.replace(/Page\s*\d+/gi, '');
    // 移除目录相关的点线
    content = content.replace(/\.{3,}/g, '');
    // 移除多余的换行(保留单换行和双换行)
    content = content.replace(/\n{3,}/g, '\n\n');
    // 基本清理：去除首尾空白
    content = content.trim();
    // 如果内容太短（<100字符），直接返回，不做复杂处理
    if (content.length < 100) {
        console.log('⚠️ 内容较短，跳过复杂清理逻辑');
        return content;
    }
    // 🔥 修复：更保守的行合并策略
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    // 如果没有行，直接返回原内容
    if (lines.length === 0) {
        return content;
    }
    // 合并碎片化的行（更保守的策略）
    const mergedLines = [];
    let currentLine = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 🔥 修复：只合并极短的行（1-2个字符），其他情况保留原样
        if (line.length <= 2 && !line.match(/[。！？.!?]$/)) {
            currentLine += line;
            continue;
        }
        // 🔥 修复：如果前一行没有句子结束符，且当前行是新段落开始，先保存前一行
        if (currentLine && line.match(/^(第[一二三四五六七八九十\d]+[章节课单元]|[\d一二三四五六七八九十]+[、.）)]|\d+\.\s)/)) {
            mergedLines.push(currentLine.trim());
            currentLine = '';
        }
        // 🔥 修复：保存之前累积的内容
        if (currentLine) {
            mergedLines.push(currentLine.trim());
            currentLine = '';
        }
        currentLine = line;
    }
    // 🔥 关键修复：确保保存最后累积的内容
    if (currentLine.trim()) {
        mergedLines.push(currentLine.trim());
    }
    // 🔥 修复：如果合并后没有任何行，返回原内容（防止内容丢失）
    if (mergedLines.length === 0) {
        console.log('⚠️ 行合并后没有内容，返回原始内容');
        return content;
    }
    // 🔥 修复：更保守的段落合并 - 直接用换行符连接，不做复杂判断
    // 用换行符连接所有行
    const result = mergedLines.join('\n');
    // 🔥 最终检查：如果清理后内容为空，返回原内容
    if (!result || result.trim().length === 0) {
        console.log('⚠️ 清理后内容为空，返回原始内容');
        return content;
    }
    return result.trim();
}
/**
 * 将文档内容分割成切片
 */
function createChunks(content, chunkSize, overlap) {
    const chunks = [];
    let start = 0;
    let iterationCount = 0;
    const maxIterations = Math.ceil(content.length / (chunkSize - overlap)) + 10; // 防止无限循环
    while (start < content.length && iterationCount < maxIterations) {
        iterationCount++;
        let end = Math.min(start + chunkSize, content.length);
        // 尝试在句子边界结束
        if (end < content.length) {
            const lastPeriod = content.lastIndexOf('。', end);
            const lastExclamation = content.lastIndexOf('！', end);
            const lastQuestion = content.lastIndexOf('？', end);
            const lastNewline = content.lastIndexOf('\n', end);
            const lastDot = content.lastIndexOf('.', end); // 添加英文句号
            const lastQuestionMark = content.lastIndexOf('?', end); // 添加英文问号
            const lastExclamationMark = content.lastIndexOf('!', end); // 添加英文感叹号
            const boundaries = [lastPeriod, lastExclamation, lastQuestion, lastNewline,
                lastDot, lastQuestionMark, lastExclamationMark]
                .filter(i => i > start && i < end); // 必须在 start 和 end 之间
            if (boundaries.length > 0) {
                end = Math.max(...boundaries) + 1;
            }
        }
        const chunk = content.substring(start, end).trim();
        if (chunk) {
            chunks.push(chunk);
        }
        // 下一个切片的起始位置（考虑重叠）
        // 确保至少前进一定距离，避免卡住
        const nextStart = end - overlap;
        start = nextStart > start ? nextStart : start + chunkSize - overlap;
        // 如果 start 没有前进，强制前进
        if (start <= chunks.length * chunkSize - chunks.length * overlap) {
            start = Math.max(start, end);
        }
    }
    if (iterationCount >= maxIterations) {
        console.warn(`createChunks 达到最大迭代次数 ${maxIterations}，已生成 ${chunks.length} 个切片`);
    }
    return chunks;
}
/**
 * 计算文本相似度分数（改进的关键词匹配）
 */
function calculateRelevanceScore(query, content) {
    const queryTokens = tokenize(query);
    const contentTokens = tokenize(content);
    if (queryTokens.length === 0 || contentTokens.length === 0)
        return 0;
    let score = 0;
    const contentLower = content.toLowerCase();
    queryTokens.forEach(token => {
        // 完全匹配得分更高
        const exactMatches = (contentLower.match(new RegExp(token, 'g')) || []).length;
        score += exactMatches * 2;
        // 部分匹配也给分
        contentTokens.forEach(cToken => {
            if (cToken.includes(token) || token.includes(cToken)) {
                score += 0.5;
            }
        });
    });
    // 归一化分数（考虑查询长度）
    return score / queryTokens.length;
}
/**
 * 分词函数（改进版 - 支持中文）
 */
function tokenize(text) {
    const tokens = [];
    // 清理文本,只保留中文、英文、数字
    const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ');
    // 提取英文单词(按空格分割)
    const englishWords = cleaned.match(/[a-z0-9]+/g) || [];
    tokens.push(...englishWords.filter(w => w.length > 1));
    // 提取中文词组(2-4字)
    const chineseText = cleaned.replace(/[a-z0-9\s]/g, '');
    for (let i = 0; i < chineseText.length; i++) {
        // 提取2字词
        if (i + 1 < chineseText.length) {
            tokens.push(chineseText.substring(i, i + 2));
        }
        // 提取3字词
        if (i + 2 < chineseText.length) {
            tokens.push(chineseText.substring(i, i + 3));
        }
        // 提取4字词
        if (i + 3 < chineseText.length) {
            tokens.push(chineseText.substring(i, i + 4));
        }
    }
    // 去重
    return [...new Set(tokens)];
}
/**
 * 搜索相关的文档切片（优化版）
 */
async function searchDocumentChunks(query, categoryId, userId, limit = 5, documentIds, useStructuredRetrieval = false // 新增：是否使用结构化检索（按顺序返回）
) {
    try {
        console.log('=== 知识库检索 ===');
        console.log('查询:', query);
        console.log('分类ID:', categoryId || '无');
        console.log('用户ID:', userId || '无');
        console.log('指定文档IDs:', documentIds || '无');
        console.log('指定文档数量:', documentIds?.length || 0);
        console.log('使用结构化检索:', useStructuredRetrieval ? '是' : '否');
        // 🔥 核心修复：当用户明确选择了文档时，直接返回这些文档的内容，不依赖关键词匹配
        const isExplicitDocumentSelection = documentIds && documentIds.length > 0;
        // 构建查询条件
        const whereClause = {};
        if (categoryId || userId || documentIds) {
            whereClause.document = {};
            if (categoryId) {
                whereClause.document.categoryId = categoryId;
            }
            if (userId) {
                whereClause.document.userId = userId;
            }
            if (documentIds && documentIds.length > 0) {
                whereClause.document.id = {
                    in: documentIds
                };
                console.log('🎯 用户明确选择了文档，将返回这些文档的所有切片');
            }
            // 🔥 修复：当用户明确选择文档时，不限制文档状态
            // 这样即使文档还在解析中（pending），也能告知用户"文档正在解析"
            if (!isExplicitDocumentSelection) {
                // 只有在搜索模式下才限制文档状态
                whereClause.document.status = {
                    in: ['ready', 'uploaded']
                };
            }
        }
        // 提取关键词
        const keywords = tokenize(query);
        console.log('提取关键词:', keywords.slice(0, 10), keywords.length > 10 ? `... (共${keywords.length}个)` : '');
        // 🔥 修复：根据检索模式决定是否使用关键词过滤
        if (useStructuredRetrieval) {
            // 结构化检索模式：不使用关键词过滤，按顺序返回所有切片
            console.log('📋 结构化检索模式：按顺序返回文档切片，不使用关键词过滤');
        }
        else if (keywords.length > 0 && !isExplicitDocumentSelection) {
            // 普通搜索模式：必须匹配关键词
            whereClause.OR = keywords.map(keyword => ({
                content: {
                    contains: keyword,
                    mode: 'insensitive'
                }
            }));
            console.log('📝 搜索模式：使用关键词过滤');
        }
        else if (isExplicitDocumentSelection) {
            console.log('📌 精确文档模式：不使用关键词过滤，返回指定文档的所有切片');
        }
        // 获取所有匹配的切片
        const chunks = await prisma.kbChunk.findMany({
            where: whereClause,
            include: {
                document: true
            },
            // 🔥 修复：指定文档时返回更多切片，确保有足够的上下文
            take: isExplicitDocumentSelection ? limit * 10 : limit * 3,
            // 按切片顺序返回（保持文档原始顺序）
            orderBy: {
                seq: 'asc'
            }
        });
        console.log(`✅ 找到 ${chunks.length} 个切片`);
        // 如果指定了文档但没有找到切片，记录详细信息
        if (isExplicitDocumentSelection && chunks.length === 0) {
            console.error('⚠️ 警告：用户选择了文档，但没有找到任何切片');
            console.error('可能原因：');
            console.error('1. 文档还未解析完成（status 不是 ready/uploaded）');
            console.error('2. 文档解析失败，没有生成切片');
            console.error('3. documentIds 不正确');
            // 检查文档状态
            const docs = await prisma.kbDocument.findMany({
                where: {
                    id: { in: documentIds }
                },
                select: {
                    id: true,
                    filename: true,
                    status: true,
                    _count: {
                        select: { chunks: true }
                    }
                }
            });
            console.error('文档详情:', docs.map(d => ({
                id: d.id,
                filename: d.filename,
                status: d.status,
                chunksCount: d._count.chunks
            })));
        }
        // 🔥 修复：改进相关性评分逻辑
        let rankedChunks = chunks.map(chunk => ({
            chunk,
            document: chunk.document,
            score: (isExplicitDocumentSelection || useStructuredRetrieval)
                ? 1.0 // 明确选择的文档或结构化检索，所有切片都是高相关的
                : calculateRelevanceScore(query, chunk.content) // 搜索模式才计算相关性
        }));
        // 排序和截取
        if (!isExplicitDocumentSelection && !useStructuredRetrieval) {
            // 搜索模式：按相关性评分排序
            rankedChunks = rankedChunks
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        }
        else {
            // 精确文档模式或结构化检索：保持文档原始顺序（已经按 chunkIndex 排序），取前N个
            rankedChunks = rankedChunks.slice(0, limit);
        }
        console.log('📊 最终返回切片数:', rankedChunks.length);
        if (rankedChunks.length > 0) {
            console.log('📄 返回的文档:', [...new Set(rankedChunks.map(r => r.document.filename))].join(', '));
            console.log('📝 第一个切片预览:', rankedChunks[0].chunk.content.substring(0, 100) + '...');
            if (!isExplicitDocumentSelection) {
                console.log('⭐ 最高相关性分数:', rankedChunks[0].score);
            }
        }
        return rankedChunks;
    }
    catch (error) {
        console.error('❌ 搜索文档切片失败:', error);
        return [];
    }
}
/**
 * 启动进度模拟更新（用于扫描版PDF OCR识别）
 * @param documentId - 文档ID
 * @param totalPages - 总页数
 * @param intervalMs - 更新间隔（毫秒）
 * @returns NodeJS.Timeout
 */
function startProgressSimulation(documentId, totalPages, intervalMs) {
    let estimatedCurrent = 0;
    const incrementPerUpdate = Math.max(1, Math.floor(totalPages / 20)); // 每次更新约5%
    const interval = setInterval(async () => {
        estimatedCurrent += incrementPerUpdate;
        // 不要超过95%，留给实际完成时设置100%
        if (estimatedCurrent >= totalPages * 0.95) {
            estimatedCurrent = Math.floor(totalPages * 0.95);
        }
        try {
            await prisma.kbDocument.update({
                where: { id: documentId },
                data: {
                    processingCurrent: estimatedCurrent
                }
            });
            console.log(`📊 进度更新: ${estimatedCurrent}/${totalPages} (${Math.round(estimatedCurrent / totalPages * 100)}%)`);
        }
        catch (error) {
            console.error('更新进度失败:', error);
        }
    }, intervalMs);
    return interval;
}
