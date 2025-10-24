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
exports.analyzeImage = analyzeImage;
exports.analyzeHomework = analyzeHomework;
var axios_1 = __importDefault(require("axios"));
var TONGYI_API_KEY = process.env.TONGYI_API_KEY || '';
var TONGYI_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
function analyzeImage(imageUrl_1) {
    return __awaiter(this, arguments, void 0, function (imageUrl, prompt) {
        var response, error_1;
        if (prompt === void 0) { prompt = '请分析这张图片的内容'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios_1.default.post(TONGYI_API_URL, {
                            model: 'qwen-vl-plus',
                            input: {
                                messages: [
                                    {
                                        role: 'user',
                                        content: [
                                            { text: prompt },
                                            { image: imageUrl }
                                        ]
                                    }
                                ]
                            },
                            parameters: {
                                max_tokens: 1000
                            }
                        }, {
                            headers: {
                                'Authorization': "Bearer ".concat(TONGYI_API_KEY),
                                'Content-Type': 'application/json'
                            }
                        })];
                case 1:
                    response = _a.sent();
                    if (response.data.output && response.data.output.choices) {
                        return [2 /*return*/, response.data.output.choices[0].message.content[0].text];
                    }
                    return [2 /*return*/, '无法识别图片内容'];
                case 2:
                    error_1 = _a.sent();
                    console.error('通义千问 API 错误:', error_1);
                    return [2 /*return*/, '图片识别服务暂时不可用'];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function analyzeHomework(imageUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt;
        return __generator(this, function (_a) {
            prompt = "\u8BF7\u4ED4\u7EC6\u5206\u6790\u8FD9\u5F20\u4F5C\u4E1A\u56FE\u7247\uFF1A\n1. \u8BC6\u522B\u9898\u76EE\u5185\u5BB9\n2. \u5206\u6790\u9898\u76EE\u7C7B\u578B\uFF08\u6570\u5B66\u3001\u8BED\u6587\u3001\u82F1\u8BED\u7B49\uFF09\n3. \u5982\u679C\u662F\u4E60\u9898\uFF0C\u63D0\u4F9B\u89E3\u9898\u601D\u8DEF\n4. \u5982\u679C\u6709\u9519\u8BEF\uFF0C\u6307\u51FA\u5E76\u89E3\u91CA\n5. \u7ED9\u51FA\u5B66\u4E60\u5EFA\u8BAE\n\n\u8BF7\u7528\u53CB\u597D\u7684\u8BED\u8A00\uFF0C\u9002\u5408\u5B66\u751F\u7406\u89E3\u7684\u65B9\u5F0F\u56DE\u7B54\u3002";
            return [2 /*return*/, analyzeImage(imageUrl, prompt)];
        });
    });
}
