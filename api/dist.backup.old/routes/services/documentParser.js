"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndStoreDocument = parseAndStoreDocument;
exports.searchDocumentChunks = searchDocumentChunks;
var client_1 = require("@prisma/client");
var axios_1 = __importDefault(require("axios"));
var prisma = new client_1.PrismaClient();
// 切片大小（约400字）
var CHUNK_SIZE = 400;
var CHUNK_OVERLAP = 50; // 重叠部分，保证上下文连贯
/**
 * 解析并存储文档内容到chunks
 */
function parseAndStoreDocument(documentId, documentUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var content, response, fs, path, fullPath, chunks, chunkPromises, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    console.log("\u5F00\u59CB\u89E3\u6790\u6587\u6863: ".concat(documentId));
                    content = '';
                    if (!documentUrl.startsWith('http')) return [3 /*break*/, 2];
                    return [4 /*yield*/, axios_1.default.get(documentUrl, {
                            responseType: 'text',
                            timeout: 30000
                        })];
                case 1:
                    response = _a.sent();
                    content = response.data;
                    return [3 /*break*/, 4];
                case 2:
                    fs = require('fs').promises;
                    path = require('path');
                    fullPath = documentUrl;
                    // 如果是相对路径，拼接完整路径
                    if (documentUrl.startsWith('/uploads/')) {
                        fullPath = path.join(__dirname, '../../', documentUrl);
                    }
                    console.log("\u5C1D\u8BD5\u8BFB\u53D6\u6587\u4EF6: ".concat(fullPath));
                    return [4 /*yield*/, fs.readFile(fullPath, 'utf-8')];
                case 3:
                    content = _a.sent();
                    console.log("\u6587\u4EF6\u8BFB\u53D6\u6210\u529F\uFF0C\u5185\u5BB9\u957F\u5EA6: ".concat(content.length));
                    _a.label = 4;
                case 4:
                    // 清理内容
                    content = cleanContent(content);
                    chunks = createChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);
                    console.log("\u6587\u6863\u5206\u5272\u6210 ".concat(chunks.length, " \u4E2A\u5207\u7247"));
                    chunkPromises = chunks.map(function (chunk, index) {
                        return prisma.kbChunk.create({
                            data: {
                                docId: documentId,
                                content: chunk,
                                seq: index
                            }
                        });
                    });
                    return [4 /*yield*/, Promise.all(chunkPromises)];
                case 5:
                    _a.sent();
                    console.log("\u6210\u529F\u5B58\u50A8 ".concat(chunks.length, " \u4E2A\u5207\u7247\u5230\u6570\u636E\u5E93"));
                    return [2 /*return*/, chunks.length];
                case 6:
                    error_1 = _a.sent();
                    console.error('解析文档失败:', error_1);
                    throw error_1;
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * 清理文档内容
 */
function cleanContent(content) {
    // 移除多余的空白字符
    content = content.replace(/\s+/g, ' ');
    // 移除常见的页眉页脚模式
    content = content.replace(/第\s*\d+\s*页/g, '');
    content = content.replace(/Page\s*\d+/gi, '');
    // 移除目录相关的点线
    content = content.replace(/\.{3,}/g, '');
    // 移除多余的换行
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
}
/**
 * 将文档内容分割成切片
 */
function createChunks(content, chunkSize, overlap) {
    var chunks = [];
    var start = 0;
    while (start < content.length) {
        var end = start + chunkSize;
        // 尝试在句子边界结束
        if (end < content.length) {
            var lastPeriod = content.lastIndexOf('。', end);
            var lastExclamation = content.lastIndexOf('！', end);
            var lastQuestion = content.lastIndexOf('？', end);
            var lastNewline = content.lastIndexOf('\n', end);
            var boundaries = [lastPeriod, lastExclamation, lastQuestion, lastNewline].filter(function (i) { return i > start; });
            if (boundaries.length > 0) {
                end = Math.max.apply(Math, boundaries) + 1;
            }
        }
        var chunk = content.substring(start, end).trim();
        if (chunk) {
            chunks.push(chunk);
        }
        // 下一个切片的起始位置（考虑重叠）
        start = end - overlap;
    }
    return chunks;
}
/**
 * 搜索相关的文档切片
 */
function searchDocumentChunks(query_1, categoryId_1, userId_1) {
    return __awaiter(this, arguments, void 0, function (query, categoryId, userId, limit) {
        var whereClause, keywords, chunks, error_2;
        if (limit === void 0) { limit = 5; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    whereClause = {};
                    if (categoryId || userId) {
                        whereClause.document = {};
                        if (categoryId) {
                            whereClause.document.categoryId = categoryId;
                        }
                        if (userId) {
                            whereClause.document.userId = userId;
                        }
                    }
                    keywords = query.split(' ').filter(function (k) { return k.length > 1; });
                    if (keywords.length > 0) {
                        whereClause.OR = keywords.map(function (keyword) { return ({
                            content: {
                                contains: keyword,
                                mode: 'insensitive'
                            }
                        }); });
                    }
                    return [4 /*yield*/, prisma.kbChunk.findMany({
                            where: whereClause,
                            include: {
                                document: true
                            },
                            take: limit,
                            orderBy: {
                                createdAt: 'desc'
                            }
                        })];
                case 1:
                    chunks = _a.sent();
                    return [2 /*return*/, chunks.map(function (chunk) { return ({
                            chunk: chunk,
                            document: chunk.document
                        }); })];
                case 2:
                    error_2 = _a.sent();
                    console.error('搜索文档切片失败:', error_2);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
