"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var index_1 = require("../index");
var auth_1 = require("../middleware/auth");
var documentParser_1 = require("../services/documentParser");
var router = (0, express_1.Router)();
// 获取分类列表
router.get('/categories', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var categories, formattedCategories, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.kbCategory.findMany({
                        where: { userId: req.userId },
                        include: {
                            _count: {
                                select: {
                                    documents: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })
                    // 格式化返回数据，添加 documentCount 字段
                ];
            case 1:
                categories = _a.sent();
                formattedCategories = categories.map(function (category) { return (__assign(__assign({}, category), { documentCount: category._count.documents })); });
                res.json(formattedCategories);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('获取分类错误:', error_1);
                res.status(500).json({ message: '获取分类失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 创建分类
router.post('/categories', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var name_1, category, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                name_1 = req.body.name;
                return [4 /*yield*/, index_1.prisma.kbCategory.create({
                        data: {
                            name: name_1,
                            userId: req.userId
                        }
                    })];
            case 1:
                category = _a.sent();
                res.json(category);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('创建分类错误:', error_2);
                res.status(500).json({ message: '创建分类失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 更新分类
router.put('/categories/:id', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var name_2, category, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                name_2 = req.body.name;
                return [4 /*yield*/, index_1.prisma.kbCategory.update({
                        where: {
                            id: req.params.id,
                            userId: req.userId
                        },
                        data: { name: name_2 }
                    })];
            case 1:
                category = _a.sent();
                res.json(category);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('更新分类错误:', error_3);
                res.status(500).json({ message: '更新分类失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 删除分类
router.delete('/categories/:id', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.kbCategory.delete({
                        where: {
                            id: req.params.id,
                            userId: req.userId
                        }
                    })];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('删除分类错误:', error_4);
                res.status(500).json({ message: '删除分类失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 获取分类下的文档列表
router.get('/categories/:id/documents', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var categoryId, documents, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                categoryId = req.params.id;
                return [4 /*yield*/, index_1.prisma.kbDocument.findMany({
                        where: {
                            userId: req.userId,
                            categoryId: categoryId
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                documents = _a.sent();
                res.json(documents);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('获取分类文档错误:', error_5);
                res.status(500).json({ message: '获取分类文档失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 获取文档列表
router.get('/documents', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var categoryId, documents, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                categoryId = req.query.categoryId;
                return [4 /*yield*/, index_1.prisma.kbDocument.findMany({
                        where: __assign({ userId: req.userId }, (categoryId && { categoryId: categoryId })),
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                documents = _a.sent();
                res.json(documents);
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('获取文档错误:', error_6);
                res.status(500).json({ message: '获取文档失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 创建文档
router.post('/documents', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_3, type, url, categoryId, size, category, document_1, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                console.log('=== 创建知识库文档接口调用 ===');
                console.log('用户ID:', req.userId);
                console.log('请求体:', req.body);
                _a = req.body, name_3 = _a.name, type = _a.type, url = _a.url, categoryId = _a.categoryId, size = _a.size;
                // 验证必要字段
                if (!name_3 || !type || !url || !categoryId) {
                    console.log('错误: 缺少必要字段', { name: name_3, type: type, url: url, categoryId: categoryId });
                    return [2 /*return*/, res.status(400).json({ message: '缺少必要字段' })];
                }
                return [4 /*yield*/, index_1.prisma.kbCategory.findFirst({
                        where: {
                            id: categoryId,
                            userId: req.userId
                        }
                    })];
            case 1:
                category = _b.sent();
                if (!category) {
                    console.log('错误: 分类不存在或不属于当前用户', { categoryId: categoryId, userId: req.userId });
                    return [2 /*return*/, res.status(404).json({ message: '分类不存在' })];
                }
                console.log('验证通过，创建文档记录...');
                return [4 /*yield*/, index_1.prisma.kbDocument.create({
                        data: {
                            filename: name_3,
                            fileExt: type,
                            ossKey: url,
                            fileSize: BigInt(size || 0),
                            status: 'uploaded',
                            userId: req.userId,
                            categoryId: categoryId
                        }
                    })];
            case 2:
                document_1 = _b.sent();
                console.log('文档记录创建成功:', document_1);
                // 异步解析和存储文档内容
                (0, documentParser_1.parseAndStoreDocument)(document_1.id, document_1.ossKey)
                    .then(function (chunkCount) {
                    console.log("\u6587\u6863 ".concat(document_1.filename, " \u89E3\u6790\u5B8C\u6210\uFF0C\u751F\u6210 ").concat(chunkCount, " \u4E2A\u5207\u7247"));
                })
                    .catch(function (error) {
                    console.error("\u6587\u6863 ".concat(document_1.filename, " \u89E3\u6790\u5931\u8D25:"), error);
                });
                res.json(document_1);
                return [3 /*break*/, 4];
            case 3:
                error_7 = _b.sent();
                console.error('创建文档错误详细信息:', {
                    error: error_7,
                    message: error_7.message,
                    stack: error_7.stack
                });
                res.status(500).json({ message: '创建文档失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 获取文档内容
router.get('/documents/:id/content', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var document_2, fs, path, content, fileError_1, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, index_1.prisma.kbDocument.findFirst({
                        where: {
                            id: req.params.id,
                            userId: req.userId
                        }
                    })];
            case 1:
                document_2 = _a.sent();
                if (!document_2) {
                    return [2 /*return*/, res.status(404).json({ message: '文档不存在' })];
                }
                fs = require('fs').promises;
                path = require('path');
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, fs.readFile(document_2.ossKey, 'utf-8')];
            case 3:
                content = _a.sent();
                res.type('text/plain').send(content);
                return [3 /*break*/, 5];
            case 4:
                fileError_1 = _a.sent();
                console.error('读取文档文件失败:', fileError_1);
                res.status(500).json({ message: '文档文件不存在或无法读取' });
                return [3 /*break*/, 5];
            case 5: return [3 /*break*/, 7];
            case 6:
                error_8 = _a.sent();
                console.error('获取文档内容错误:', error_8);
                res.status(500).json({ message: '获取文档内容失败' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// 删除文档
router.delete('/documents/:id', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.kbDocument.delete({
                        where: {
                            id: req.params.id,
                            userId: req.userId
                        }
                    })];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error('删除文档错误:', error_9);
                res.status(500).json({ message: '删除文档失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 获取文档内容
router.get('/documents/:id', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var document_3, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.kbDocument.findUnique({
                        where: {
                            id: req.params.id,
                            userId: req.userId
                        },
                        include: {
                            chunks: true
                        }
                    })];
            case 1:
                document_3 = _a.sent();
                if (!document_3) {
                    return [2 /*return*/, res.status(404).json({ message: '文档不存在' })];
                }
                res.json(document_3);
                return [3 /*break*/, 3];
            case 2:
                error_10 = _a.sent();
                console.error('获取文档内容错误:', error_10);
                res.status(500).json({ message: '获取文档内容失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
