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
var express_1 = require("express");
var axios_1 = __importDefault(require("axios"));
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
var DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
var DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
console.log('Chat Route - DeepSeek API Key loaded:', DEEPSEEK_API_KEY ? "".concat(DEEPSEEK_API_KEY.substring(0, 10), "...") : 'NOT FOUND');
// 简单的流式聊天端点，兼容前端调用
router.post('/stream', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var message, requestBody, response, responseContent_1, buffer_1, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                message = req.body.message;
                if (!message) {
                    return [2 /*return*/, res.status(400).json({ error: 'Message is required' })];
                }
                console.log('=== Chat Stream Request ===');
                console.log('Message:', message);
                // 设置 SSE 头
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                });
                requestBody = {
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: '你是一个专业的AI学习助手，请用中文回答用户的问题。' },
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                    stream: true
                };
                return [4 /*yield*/, axios_1.default.post(DEEPSEEK_API_URL, requestBody, {
                        headers: {
                            'Authorization': "Bearer ".concat(DEEPSEEK_API_KEY),
                            'Content-Type': 'application/json'
                        },
                        responseType: 'stream',
                        timeout: 0 // 无超时限制
                    })];
            case 1:
                response = _d.sent();
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
                                console.log('Chat stream 结束');
                                res.write("data: ".concat(JSON.stringify({ type: 'done', content: responseContent_1 }), "\n\n"));
                                res.end();
                            }
                            else {
                                try {
                                    var parsed = JSON.parse(data);
                                    var content = (_c = (_b = (_a = parsed.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.delta) === null || _c === void 0 ? void 0 : _c.content;
                                    if (content) {
                                        responseContent_1 += content;
                                        // 发送流式内容
                                        res.write("data: ".concat(JSON.stringify({ type: 'stream', content: content }), "\n\n"));
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
                    console.error('Chat stream 错误:', error);
                    res.write("data: ".concat(JSON.stringify({ type: 'error', message: '生成响应时出错' }), "\n\n"));
                    res.end();
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _d.sent();
                console.error('Chat stream API 错误:', error_1);
                // 如果还没有设置响应头，设置错误响应
                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Server error',
                        message: ((_c = (_b = (_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) || error_1.message || '服务器错误'
                    });
                }
                else {
                    // 如果已经开始流式响应，发送错误事件
                    res.write("data: ".concat(JSON.stringify({ type: 'error', message: '服务器错误' }), "\n\n"));
                    res.end();
                }
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
