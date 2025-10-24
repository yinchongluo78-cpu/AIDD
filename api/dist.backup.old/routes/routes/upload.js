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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var multer_1 = __importDefault(require("multer"));
var path_1 = __importDefault(require("path"));
var promises_1 = __importDefault(require("fs/promises"));
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 创建上传目录
var uploadDir = path_1.default.join(__dirname, '../../uploads');
promises_1.default.mkdir(uploadDir, { recursive: true }).catch(console.error);
var upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});
// 模拟文件上传服务
function saveFile(file_1) {
    return __awaiter(this, arguments, void 0, function (file, folder) {
        var ext, filename, folderPath, filePath, key;
        if (folder === void 0) { folder = 'uploads'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ext = path_1.default.extname(file.originalname);
                    filename = "".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2)).concat(ext);
                    folderPath = path_1.default.join(uploadDir, folder);
                    // 确保文件夹存在
                    return [4 /*yield*/, promises_1.default.mkdir(folderPath, { recursive: true })];
                case 1:
                    // 确保文件夹存在
                    _a.sent();
                    filePath = path_1.default.join(folderPath, filename);
                    key = "".concat(folder, "/").concat(filename);
                    // 保存文件
                    return [4 /*yield*/, promises_1.default.writeFile(filePath, file.buffer)];
                case 2:
                    // 保存文件
                    _a.sent();
                    return [2 /*return*/, {
                            url: "/uploads/".concat(key),
                            key: key
                        }];
            }
        });
    });
}
// 上传图片
router.post('/image', auth_1.authenticateToken, upload.single('image'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ message: '请选择图片' })];
                }
                return [4 /*yield*/, saveFile(req.file, 'images')];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('上传图片错误:', error_1);
                res.status(500).json({ message: '上传失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 上传文档
router.post('/document', auth_1.authenticateToken, upload.single('document'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, fileName, response, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('=== 文档上传接口调用 ===');
                console.log('用户ID:', req.userId);
                console.log('接收到的文件信息:', req.file ? {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                } : '无文件');
                if (!req.file) {
                    console.log('错误: 没有接收到文件');
                    return [2 /*return*/, res.status(400).json({ message: '请选择文档' })];
                }
                console.log('开始保存文件到存储...');
                return [4 /*yield*/, saveFile(req.file, 'documents')];
            case 1:
                result = _a.sent();
                console.log('文件保存结果:', result);
                fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
                console.log('处理后的文件名:', fileName);
                response = __assign(__assign({}, result), { name: fileName, type: req.file.mimetype, size: req.file.size });
                console.log('文档上传成功，返回结果:', response);
                res.json(response);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('上传文档错误详细信息:', {
                    error: error_2,
                    message: error_2.message,
                    stack: error_2.stack
                });
                res.status(500).json({ message: '上传失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 上传头像
router.post('/avatar', auth_1.authenticateToken, upload.single('avatar'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ message: '请选择头像' })];
                }
                return [4 /*yield*/, saveFile(req.file, 'avatars')];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('上传头像错误:', error_3);
                res.status(500).json({ message: '上传失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
