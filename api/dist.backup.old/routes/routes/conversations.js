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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var axios_1 = __importDefault(require("axios"));
var index_1 = require("../index");
var auth_1 = require("../middleware/auth");
var tongyi_1 = require("../services/tongyi");
var documentParser_1 = require("../services/documentParser");
var router = (0, express_1.Router)();
var DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
var DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
console.log('DeepSeek API Key loaded:', DEEPSEEK_API_KEY ? "".concat(DEEPSEEK_API_KEY.substring(0, 10), "...") : 'NOT FOUND');
router.get('/', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var conversations, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.conversation.findMany({
                        where: { userId: req.userId },
                        orderBy: { createdAt: 'desc' },
                        take: 20
                    })];
            case 1:
                conversations = _a.sent();
                res.json(conversations);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('获取对话列表错误:', error_1);
                res.status(500).json({ message: '获取对话列表失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var conversation, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.conversation.create({
                        data: {
                            userId: req.userId,
                            title: '新对话'
                        }
                    })];
            case 1:
                conversation = _a.sent();
                res.json(conversation);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('创建对话错误:', error_2);
                res.status(500).json({ message: '创建对话失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/:id/messages', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var messages, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.message.findMany({
                        where: {
                            conversationId: req.params.id,
                            conversation: { userId: req.userId }
                        },
                        orderBy: { createdAt: 'asc' }
                    })];
            case 1:
                messages = _a.sent();
                res.json(messages);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('获取消息错误:', error_3);
                res.status(500).json({ message: '获取消息失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 流式响应端点
router.post('/:id/messages/stream', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, content, imageUrl, categoryId, documentIds, conversationId_1, userMessage, messages, apiMessages, fullContent, citations_1, imageAnalysis, error_4, relevantChunks, kbContext_1, maxContentLength, apiRequestMessages, requestBody, requestSize, newRequestSize, response, responseContent_1, buffer_1, conversation, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 11, , 12]);
                _a = req.body, content = _a.content, imageUrl = _a.imageUrl, categoryId = _a.categoryId, documentIds = _a.documentIds;
                conversationId_1 = req.params.id;
                console.log('=== 流式响应接收到的参数 ===');
                console.log('content长度:', (content === null || content === void 0 ? void 0 : content.length) || 0);
                console.log('categoryId:', categoryId || 'none');
                console.log('documentIds:', documentIds || 'none');
                // 设置 SSE 头
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                });
                return [4 /*yield*/, index_1.prisma.message.create({
                        data: {
                            conversationId: conversationId_1,
                            role: 'user',
                            content: content,
                            imageOssKey: imageUrl
                        }
                    })
                    // 发送用户消息确认
                ];
            case 1:
                userMessage = _b.sent();
                // 发送用户消息确认
                res.write("data: ".concat(JSON.stringify({ type: 'user_message', data: userMessage }), "\n\n"));
                return [4 /*yield*/, index_1.prisma.message.findMany({
                        where: { conversationId: conversationId_1 },
                        orderBy: { createdAt: 'asc' },
                        take: 10
                    })];
            case 2:
                messages = _b.sent();
                apiMessages = messages.slice(0, -1).map(function (msg) { return ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }); });
                fullContent = content;
                citations_1 = [];
                if (!imageUrl) return [3 /*break*/, 6];
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 6]);
                return [4 /*yield*/, (0, tongyi_1.analyzeHomework)(imageUrl)
                    // 将图片分析结果加入到消息中
                ];
            case 4:
                imageAnalysis = _b.sent();
                // 将图片分析结果加入到消息中
                fullContent = content ?
                    "".concat(content, "\n\n[\u56FE\u7247\u5206\u6790]: ").concat(imageAnalysis) :
                    "\u8BF7\u6839\u636E\u4EE5\u4E0B\u56FE\u7247\u5206\u6790\u7ED3\u679C\u56DE\u7B54\u95EE\u9898\uFF1A\n".concat(imageAnalysis);
                return [3 /*break*/, 6];
            case 5:
                error_4 = _b.sent();
                console.error('图片识别失败:', error_4);
                fullContent = content || '图片识别失败，请重新上传';
                return [3 /*break*/, 6];
            case 6:
                if (!((categoryId || documentIds) && content)) return [3 /*break*/, 8];
                console.log('开始知识库检索...');
                return [4 /*yield*/, (0, documentParser_1.searchDocumentChunks)(content, categoryId, req.userId, 5 // 最多返回5个相关片段
                    )];
            case 7:
                relevantChunks = _b.sent();
                if (relevantChunks.length > 0) {
                    console.log("\u627E\u5230 ".concat(relevantChunks.length, " \u4E2A\u76F8\u5173\u6587\u6863\u7247\u6BB5"));
                    kbContext_1 = '\n\n===== 知识库参考内容 =====\n';
                    relevantChunks.forEach(function (item, index) {
                        kbContext_1 += "\n\u3010\u6587\u6863".concat(index + 1, "\uFF1A").concat(item.document.filename, "\u3011\n");
                        kbContext_1 += item.chunk.content + '\n';
                        // 记录引用信息
                        citations_1.push("".concat(item.document.filename, " - \u7247\u6BB5").concat(index + 1));
                    });
                    kbContext_1 += '\n===== 知识库内容结束 =====\n';
                    // 将知识库内容加入到用户消息中
                    fullContent = "".concat(fullContent, "\n").concat(kbContext_1, "\n\u8BF7\u57FA\u4E8E\u4EE5\u4E0A\u77E5\u8BC6\u5E93\u5185\u5BB9\u56DE\u7B54\u95EE\u9898\u3002");
                }
                else {
                    console.log('未找到相关文档片段');
                }
                _b.label = 8;
            case 8:
                maxContentLength = 15000 // 减小初始内容限制
                ;
                if (fullContent.length > maxContentLength) {
                    console.log("\u5185\u5BB9\u8FC7\u957F(".concat(fullContent.length, "\u5B57\u7B26)\uFF0C\u622A\u53D6\u524D").concat(maxContentLength, "\u5B57\u7B26"));
                    fullContent = fullContent.substring(0, maxContentLength) + '\n\n[注意：文档内容过长，已截取部分内容进行分析]';
                }
                apiRequestMessages = __spreadArray(__spreadArray([
                    { role: 'system', content: '你是一个专业的AI学习助手，请用中文回答用户的问题。' }
                ], apiMessages.slice(-10), true), [
                    { role: 'user', content: fullContent }
                ], false);
                requestBody = {
                    model: 'deepseek-chat',
                    messages: apiRequestMessages,
                    temperature: 0.7,
                    max_tokens: 2000,
                    stream: true
                };
                requestSize = JSON.stringify(requestBody).length;
                console.log("\u8BF7\u6C42JSON\u5927\u5C0F: ".concat(requestSize, " \u5B57\u7B26"));
                if (requestSize > 50000) { // 进一步减小阈值到50KB
                    console.log('请求过大，进一步截取内容');
                    fullContent = fullContent.substring(0, 8000) + '\n\n[注意：内容已大幅截取]';
                    apiRequestMessages[apiRequestMessages.length - 1].content = fullContent;
                    newRequestSize = JSON.stringify(__assign(__assign({}, requestBody), { messages: apiRequestMessages })).length;
                    console.log("\u622A\u53D6\u540E\u8BF7\u6C42\u5927\u5C0F: ".concat(newRequestSize, " \u5B57\u7B26"));
                }
                return [4 /*yield*/, axios_1.default.post(DEEPSEEK_API_URL, requestBody, {
                        headers: {
                            'Authorization': "Bearer ".concat(DEEPSEEK_API_KEY),
                            'Content-Type': 'application/json'
                        },
                        responseType: 'stream',
                        timeout: 0 // 无超时限制
                    })];
            case 9:
                response = _b.sent();
                responseContent_1 = '';
                buffer_1 = '';
                response.data.on('data', function (chunk) {
                    var _a, _b, _c;
                    buffer_1 += chunk.toString();
                    var lines = buffer_1.split('\n');
                    buffer_1 = lines.pop() || '';
                    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                        var line = lines_1[_i];
                        if (line.startsWith('data: ')) {
                            var data = line.slice(6);
                            if (data === '[DONE]') {
                                console.log('流式传输结束');
                                // 流结束，保存完整的助手消息（包含引用信息）
                                index_1.prisma.message.create({
                                    data: {
                                        conversationId: conversationId_1,
                                        role: 'assistant',
                                        content: responseContent_1,
                                        citations: citations_1.length > 0 ? citations_1 : undefined
                                    }
                                }).then(function (assistantMessage) {
                                    res.write("data: ".concat(JSON.stringify({ type: 'done', data: assistantMessage }), "\n\n"));
                                    res.end();
                                });
                            }
                            else {
                                try {
                                    var parsed = JSON.parse(data);
                                    var content_1 = (_c = (_b = (_a = parsed.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.delta) === null || _c === void 0 ? void 0 : _c.content;
                                    if (content_1) {
                                        responseContent_1 += content_1;
                                        // 发送流式内容
                                        console.log('发送流式片段:', content_1.substring(0, 20));
                                        res.write("data: ".concat(JSON.stringify({ type: 'stream', content: content_1 }), "\n\n"));
                                    }
                                }
                                catch (e) {
                                    console.error('解析流数据错误:', e);
                                }
                            }
                        }
                    }
                });
                response.data.on('error', function (error) {
                    console.error('流错误:', error);
                    res.write("data: ".concat(JSON.stringify({ type: 'error', message: '生成响应时出错' }), "\n\n"));
                    res.end();
                });
                return [4 /*yield*/, index_1.prisma.conversation.findUnique({
                        where: { id: conversationId_1 }
                    })];
            case 10:
                conversation = _b.sent();
                if ((conversation === null || conversation === void 0 ? void 0 : conversation.title) === '新对话' || (conversation === null || conversation === void 0 ? void 0 : conversation.title) === '') {
                    // 异步生成标题，不阻塞响应
                    generateTitle(conversationId_1, content);
                }
                return [3 /*break*/, 12];
            case 11:
                error_5 = _b.sent();
                console.error('流式响应错误:', error_5);
                res.write("data: ".concat(JSON.stringify({ type: 'error', message: '服务器错误' }), "\n\n"));
                res.end();
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// 辅助函数：生成标题
function generateTitle(conversationId, content) {
    return __awaiter(this, void 0, void 0, function () {
        var response, title, error_6, fallbackTitle;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 5]);
                    return [4 /*yield*/, axios_1.default.post(DEEPSEEK_API_URL, {
                            model: 'deepseek-chat',
                            messages: [
                                { role: 'system', content: '你是一个标题生成助手。根据用户的问题，生成一个简洁的中文标题，不超过10个字。只返回标题文字，不要有引号、标点或其他任何额外内容。' },
                                { role: 'user', content: "\u8BF7\u4E3A\u8FD9\u4E2A\u95EE\u9898\u751F\u6210\u4E00\u4E2A\u7B80\u77ED\u7684\u6807\u9898\uFF085-10\u4E2A\u5B57\uFF09\uFF0C\u53EA\u8FD4\u56DE\u6807\u9898\u6587\u5B57\uFF1A".concat(content) }
                            ],
                            temperature: 0.3,
                            max_tokens: 20
                        }, {
                            headers: {
                                'Authorization': "Bearer ".concat(DEEPSEEK_API_KEY),
                                'Content-Type': 'application/json'
                            }
                        })];
                case 1:
                    response = _a.sent();
                    title = response.data.choices[0].message.content.trim().replace(/["''']/g, '');
                    return [4 /*yield*/, index_1.prisma.conversation.update({
                            where: { id: conversationId },
                            data: { title: title }
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    error_6 = _a.sent();
                    console.error('生成标题错误:', error_6);
                    fallbackTitle = content.length > 10 ? content.substring(0, 10) + '...' : content;
                    return [4 /*yield*/, index_1.prisma.conversation.update({
                            where: { id: conversationId },
                            data: { title: fallbackTitle }
                        })];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// 原始的非流式消息端点
router.post('/:id/messages', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, content, imageUrl, conversationId, userMessage, aiResponse, messages, imageAnalysis, maxAnalysisLength, apiMessages, response, apiError_1, apiMessages, response, apiError_2, assistantMessage, conversation, error_7;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 18, , 19]);
                _a = req.body, content = _a.content, imageUrl = _a.imageUrl;
                conversationId = req.params.id;
                return [4 /*yield*/, index_1.prisma.message.create({
                        data: {
                            conversationId: conversationId,
                            role: 'user',
                            content: content,
                            imageOssKey: imageUrl
                        }
                    })];
            case 1:
                userMessage = _f.sent();
                aiResponse = '';
                messages = [];
                if (!imageUrl) return [3 /*break*/, 8];
                return [4 /*yield*/, (0, tongyi_1.analyzeHomework)(imageUrl)
                    // 限制图片分析结果的长度
                ];
            case 2:
                imageAnalysis = _f.sent();
                maxAnalysisLength = 45000;
                if (imageAnalysis.length > maxAnalysisLength) {
                    console.log("\u56FE\u7247\u5206\u6790\u7ED3\u679C\u8FC7\u957F(".concat(imageAnalysis.length, "\u5B57\u7B26)\uFF0C\u622A\u53D6\u524D").concat(maxAnalysisLength, "\u5B57\u7B26"));
                    imageAnalysis = imageAnalysis.substring(0, maxAnalysisLength) + '\n\n[注意：分析结果过长，已截取部分内容]';
                }
                aiResponse = imageAnalysis;
                if (!content) return [3 /*break*/, 7];
                return [4 /*yield*/, index_1.prisma.message.findMany({
                        where: { conversationId: conversationId },
                        orderBy: { createdAt: 'asc' },
                        take: 10
                    })];
            case 3:
                messages = _f.sent();
                apiMessages = __spreadArray(__spreadArray([], messages.map(function (msg) { return ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }); }), true), [
                    {
                        role: 'system',
                        content: "\u56FE\u7247\u5206\u6790\u7ED3\u679C\uFF1A".concat(imageAnalysis)
                    },
                    {
                        role: 'user',
                        content: content
                    }
                ], false);
                _f.label = 4;
            case 4:
                _f.trys.push([4, 6, , 7]);
                return [4 /*yield*/, axios_1.default.post(DEEPSEEK_API_URL, {
                        model: 'deepseek-chat',
                        messages: apiMessages,
                        temperature: 0.7,
                        max_tokens: 2000
                    }, {
                        headers: {
                            'Authorization': "Bearer ".concat(DEEPSEEK_API_KEY),
                            'Content-Type': 'application/json'
                        }
                    })];
            case 5:
                response = _f.sent();
                aiResponse = response.data.choices[0].message.content;
                return [3 /*break*/, 7];
            case 6:
                apiError_1 = _f.sent();
                console.error('DeepSeek API 错误:', apiError_1);
                return [3 /*break*/, 7];
            case 7: return [3 /*break*/, 13];
            case 8: return [4 /*yield*/, index_1.prisma.message.findMany({
                    where: { conversationId: conversationId },
                    orderBy: { createdAt: 'asc' },
                    take: 10
                })];
            case 9:
                // 只有文字内容，使用 DeepSeek
                messages = _f.sent();
                apiMessages = messages.map(function (msg) { return ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }); });
                _f.label = 10;
            case 10:
                _f.trys.push([10, 12, , 13]);
                return [4 /*yield*/, axios_1.default.post(DEEPSEEK_API_URL, {
                        model: 'deepseek-chat',
                        messages: __spreadArray([
                            { role: 'system', content: '你是一个专业的AI学习助手，请用中文回答用户的问题。' }
                        ], apiMessages, true),
                        temperature: 0.7,
                        max_tokens: 2000,
                        stream: false
                    }, {
                        headers: {
                            'Authorization': "Bearer ".concat(DEEPSEEK_API_KEY),
                            'Content-Type': 'application/json'
                        },
                        timeout: 60000 // 60秒超时
                    })];
            case 11:
                response = _f.sent();
                aiResponse = response.data.choices[0].message.content;
                return [3 /*break*/, 13];
            case 12:
                apiError_2 = _f.sent();
                console.error('DeepSeek API 错误详情:', {
                    message: apiError_2.message,
                    code: apiError_2.code,
                    response: (_b = apiError_2.response) === null || _b === void 0 ? void 0 : _b.data,
                    status: (_c = apiError_2.response) === null || _c === void 0 ? void 0 : _c.status
                });
                console.error('API Key 状态:', DEEPSEEK_API_KEY ? 'Key exists' : 'Key missing');
                // 根据错误类型返回不同的提示
                if (apiError_2.code === 'ECONNABORTED' || apiError_2.message === 'aborted' || apiError_2.message.includes('timeout')) {
                    aiResponse = '抱歉，AI 响应超时，请稍后重试。';
                }
                else if (((_d = apiError_2.response) === null || _d === void 0 ? void 0 : _d.status) === 401) {
                    aiResponse = '抱歉，API 密钥无效。';
                }
                else if (((_e = apiError_2.response) === null || _e === void 0 ? void 0 : _e.status) === 429) {
                    aiResponse = '抱歉，请求过于频繁，请稍后再试。';
                }
                else {
                    aiResponse = '抱歉，AI 服务暂时不可用。请稍后再试。';
                }
                return [3 /*break*/, 13];
            case 13: return [4 /*yield*/, index_1.prisma.message.create({
                    data: {
                        conversationId: conversationId,
                        role: 'assistant',
                        content: aiResponse
                    }
                })
                // 获取当前对话的所有消息用于判断是否生成标题
            ];
            case 14:
                assistantMessage = _f.sent();
                if (!(messages.length === 0)) return [3 /*break*/, 16];
                return [4 /*yield*/, index_1.prisma.message.findMany({
                        where: { conversationId: conversationId },
                        orderBy: { createdAt: 'asc' }
                    })];
            case 15:
                messages = _f.sent();
                _f.label = 16;
            case 16: return [4 /*yield*/, index_1.prisma.conversation.findUnique({
                    where: { id: conversationId }
                })];
            case 17:
                conversation = _f.sent();
                if ((conversation === null || conversation === void 0 ? void 0 : conversation.title) === '新对话' || (conversation === null || conversation === void 0 ? void 0 : conversation.title) === '') {
                    // 异步生成标题，不阻塞响应
                    generateTitle(conversationId, content);
                }
                res.json(assistantMessage);
                return [3 /*break*/, 19];
            case 18:
                error_7 = _f.sent();
                console.error('发送消息错误:', error_7);
                res.status(500).json({ message: '发送消息失败' });
                return [3 /*break*/, 19];
            case 19: return [2 /*return*/];
        }
    });
}); });
router.put('/:id', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var title, conversation, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                title = req.body.title;
                return [4 /*yield*/, index_1.prisma.conversation.update({
                        where: {
                            id: req.params.id,
                            userId: req.userId
                        },
                        data: { title: title }
                    })];
            case 1:
                conversation = _a.sent();
                res.json(conversation);
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error('更新对话错误:', error_8);
                res.status(500).json({ message: '更新对话失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.delete('/:id', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.conversation.delete({
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
                console.error('删除对话错误:', error_9);
                res.status(500).json({ message: '删除对话失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
