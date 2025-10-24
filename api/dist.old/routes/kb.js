"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const documentParser_1 = require("../services/documentParser");
const router = (0, express_1.Router)();
// 获取分类列表
router.get('/categories', auth_1.authenticateToken, async (req, res) => {
    try {
        console.log('=== 获取分类列表 ===');
        console.log('用户ID:', req.userId);
        console.log('用户ID类型:', typeof req.userId);
        if (!req.userId) {
            console.error('错误: userId 未定义');
            return res.status(401).json({ message: '未授权' });
        }
        const categories = await index_1.prisma.kbCategory.findMany({
            where: { userId: req.userId },
            include: {
                _count: {
                    select: {
                        documents: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('查询到的分类数量:', categories.length);
        // 格式化返回数据，添加 documentCount 字段
        const formattedCategories = categories.map(category => ({
            ...category,
            documentCount: category._count.documents
        }));
        res.json(formattedCategories);
    }
    catch (error) {
        console.error('获取分类错误 - 详细信息:', {
            error: error,
            message: error.message,
            stack: error.stack,
            userId: req.userId
        });
        res.status(500).json({ message: '获取分类失败', error: error.message });
    }
});
// 创建分类
router.post('/categories', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const category = await index_1.prisma.kbCategory.create({
            data: {
                name,
                userId: req.userId
            }
        });
        res.json(category);
    }
    catch (error) {
        console.error('创建分类错误:', error);
        res.status(500).json({ message: '创建分类失败' });
    }
});
// 更新分类
router.put('/categories/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const category = await index_1.prisma.kbCategory.update({
            where: {
                id: req.params.id,
                userId: req.userId
            },
            data: { name }
        });
        res.json(category);
    }
    catch (error) {
        console.error('更新分类错误:', error);
        res.status(500).json({ message: '更新分类失败' });
    }
});
// 删除分类
router.delete('/categories/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        await index_1.prisma.kbCategory.delete({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('删除分类错误:', error);
        res.status(500).json({ message: '删除分类失败' });
    }
});
// 获取分类下的文档列表
router.get('/categories/:id/documents', auth_1.authenticateToken, async (req, res) => {
    try {
        console.log('=== 获取分类文档 ===');
        console.log('用户ID:', req.userId);
        console.log('分类ID:', req.params.id);
        const categoryId = req.params.id;
        if (!req.userId) {
            console.error('错误: userId 未定义');
            return res.status(401).json({ message: '未授权' });
        }
        const documents = await index_1.prisma.kbDocument.findMany({
            where: {
                userId: req.userId,
                categoryId: categoryId
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('查询到的文档数量:', documents.length);
        // 转换 BigInt 为普通数字
        const documentsResponse = documents.map(doc => ({
            id: doc.id,
            userId: doc.userId,
            categoryId: doc.categoryId,
            filename: doc.filename,
            fileExt: doc.fileExt,
            fileSize: Number(doc.fileSize),
            size: Number(doc.fileSize),
            ossKey: doc.ossKey,
            status: doc.status,
            createdAt: doc.createdAt
        }));
        res.json(documentsResponse);
    }
    catch (error) {
        console.error('获取分类文档错误 - 详细信息:', {
            error: error,
            message: error.message,
            stack: error.stack,
            userId: req.userId,
            categoryId: req.params.id
        });
        res.status(500).json({ message: '获取分类文档失败', error: error.message });
    }
});
// 获取文档列表
router.get('/documents', auth_1.authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.query;
        const documents = await index_1.prisma.kbDocument.findMany({
            where: {
                userId: req.userId,
                ...(categoryId && { categoryId: categoryId })
            },
            orderBy: { createdAt: 'desc' }
        });
        // 转换 BigInt 为普通数字
        const documentsResponse = documents.map(doc => ({
            id: doc.id,
            userId: doc.userId,
            categoryId: doc.categoryId,
            filename: doc.filename,
            fileExt: doc.fileExt,
            fileSize: Number(doc.fileSize),
            size: Number(doc.fileSize),
            ossKey: doc.ossKey,
            status: doc.status,
            createdAt: doc.createdAt
        }));
        res.json(documentsResponse);
    }
    catch (error) {
        console.error('获取文档错误:', error);
        res.status(500).json({ message: '获取文档失败' });
    }
});
// 创建文档
router.post('/documents', auth_1.authenticateToken, async (req, res) => {
    try {
        console.log('=== 创建知识库文档接口调用 ===');
        console.log('用户ID:', req.userId);
        console.log('请求体:', req.body);
        const { name, type, url, categoryId, size } = req.body;
        // 验证必要字段
        if (!name || !type || !url || !categoryId) {
            console.log('错误: 缺少必要字段', { name, type, url, categoryId });
            return res.status(400).json({ message: '缺少必要字段' });
        }
        // 验证分类是否属于当前用户
        const category = await index_1.prisma.kbCategory.findFirst({
            where: {
                id: categoryId,
                userId: req.userId
            }
        });
        if (!category) {
            console.log('错误: 分类不存在或不属于当前用户', { categoryId, userId: req.userId });
            return res.status(404).json({ message: '分类不存在' });
        }
        console.log('验证通过，创建文档记录...');
        // 推导文件扩展名与 OSS Key（Postgres 模型要求）
        const lowerName = String(name || '').toLowerCase();
        const extFromName = lowerName.lastIndexOf('.') >= 0 ? lowerName.substring(lowerName.lastIndexOf('.')) : '';
        const fileExt = type || extFromName || 'application/octet-stream';
        let ossKey = url;
        if (typeof url === 'string' && url.includes('aliyuncs.com/')) {
            ossKey = url.split('aliyuncs.com/')[1];
        }
        const document = await index_1.prisma.kbDocument.create({
            data: {
                filename: name,
                fileExt: fileExt,
                fileSize: BigInt(Number(size || 0)),
                ossKey: ossKey,
                status: 'pending',
                userId: req.userId,
                categoryId
            }
        });
        console.log('文档记录创建成功:', document);
        // 异步解析和存储文档内容
        (0, documentParser_1.parseAndStoreDocument)(document.id, document.ossKey)
            .then(async (chunkCount) => {
            console.log(`文档 ${document.filename} 解析完成，生成 ${chunkCount} 个切片`);
            // 更新文档状态为已完成
            await index_1.prisma.kbDocument.update({
                where: { id: document.id },
                data: { status: 'ready' }
            });
        })
            .catch(async (error) => {
            console.error(`文档 ${document.filename} 解析失败:`, error);
            // 更新文档状态为失败
            await index_1.prisma.kbDocument.update({
                where: { id: document.id },
                data: { status: 'failed' }
            });
        });
        // 转换 BigInt 为普通数字再返回
        const documentResponse = {
            id: document.id,
            userId: document.userId,
            categoryId: document.categoryId,
            filename: document.filename,
            fileExt: document.fileExt,
            fileSize: Number(document.fileSize),
            size: Number(document.fileSize),
            ossKey: document.ossKey,
            status: document.status,
            createdAt: document.createdAt
        };
        res.json(documentResponse);
    }
    catch (error) {
        console.error('创建文档错误详细信息:', {
            error: error,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: '创建文档失败' });
    }
});
// 获取文档内容
router.get('/documents/:id/content', auth_1.authenticateToken, async (req, res) => {
    try {
        const document = await index_1.prisma.kbDocument.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });
        if (!document) {
            return res.status(404).json({ message: '文档不存在' });
        }
        // 从文件系统读取文档内容
        const fs = require('fs').promises;
        const path = require('path');
        try {
            const content = await fs.readFile(document.ossKey, 'utf-8');
            res.type('text/plain').send(content);
        }
        catch (fileError) {
            console.error('读取文档文件失败:', fileError);
            res.status(500).json({ message: '文档文件不存在或无法读取' });
        }
    }
    catch (error) {
        console.error('获取文档内容错误:', error);
        res.status(500).json({ message: '获取文档内容失败' });
    }
});
// 删除文档
router.delete('/documents/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        await index_1.prisma.kbDocument.delete({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('删除文档错误:', error);
        res.status(500).json({ message: '删除文档失败' });
    }
});
// 获取文档内容
router.get('/documents/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const document = await index_1.prisma.kbDocument.findUnique({
            where: {
                id: req.params.id,
                userId: req.userId
            },
            include: {
                chunks: true
            }
        });
        if (!document) {
            return res.status(404).json({ message: '文档不存在' });
        }
        // 转换BigInt为Number
        const documentResponse = {
            ...document,
            size: Number(document.fileSize)
        };
        res.json(documentResponse);
    }
    catch (error) {
        console.error('获取文档内容错误:', error);
        res.status(500).json({ message: '获取文档内容失败' });
    }
});
// 获取文档解析进度
router.get('/documents/:id/progress', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const document = await index_1.prisma.kbDocument.findUnique({
            where: { id },
            select: {
                id: true,
                filename: true,
                status: true,
                processingCurrent: true,
                processingTotal: true
            }
        });
        if (!document) {
            return res.status(404).json({ message: '文档不存在' });
        }
        // 验证文档所有权
        const fullDoc = await index_1.prisma.kbDocument.findFirst({
            where: { id, userId: req.userId }
        });
        if (!fullDoc) {
            return res.status(403).json({ message: '无权访问此文档' });
        }
        // 计算进度百分比
        const percentage = document.processingTotal && document.processingTotal > 0
            ? Math.round((document.processingCurrent || 0) / document.processingTotal * 100)
            : 0;
        res.json({
            id: document.id,
            filename: document.filename,
            status: document.status,
            current: document.processingCurrent || 0,
            total: document.processingTotal || 0,
            percentage
        });
    }
    catch (error) {
        console.error('获取文档进度错误:', error);
        res.status(500).json({ message: '获取文档进度失败' });
    }
});
exports.default = router;
