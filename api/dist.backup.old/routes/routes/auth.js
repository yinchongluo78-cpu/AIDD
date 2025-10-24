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
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var index_1 = require("../index");
var router = (0, express_1.Router)();
router.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, existingUser, hashedPassword, user, token, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 4, , 5]);
                _a = req.body, email = _a.email, password = _a.password;
                return [4 /*yield*/, index_1.prisma.user.findUnique({
                        where: { email: email }
                    })];
            case 1:
                existingUser = _d.sent();
                if (existingUser) {
                    return [2 /*return*/, res.status(400).json({ message: '邮箱已被注册' })];
                }
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
            case 2:
                hashedPassword = _d.sent();
                return [4 /*yield*/, index_1.prisma.user.create({
                        data: {
                            email: email,
                            passwordHash: hashedPassword,
                            profile: {
                                create: {}
                            }
                        },
                        include: {
                            profile: true
                        }
                    })];
            case 3:
                user = _d.sent();
                token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || 'default-secret', { expiresIn: '7d' });
                res.json({
                    token: token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.name,
                        avatar: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.avatarUrl
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _d.sent();
                console.error('注册错误:', error_1);
                res.status(500).json({ message: '注册失败' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, validPassword, token, error_2;
    var _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 3, , 4]);
                _a = req.body, email = _a.email, password = _a.password;
                return [4 /*yield*/, index_1.prisma.user.findUnique({
                        where: { email: email },
                        include: {
                            profile: true
                        }
                    })];
            case 1:
                user = _g.sent();
                if (!user) {
                    return [2 /*return*/, res.status(401).json({ message: '邮箱或密码错误' })];
                }
                return [4 /*yield*/, bcryptjs_1.default.compare(password, user.passwordHash)];
            case 2:
                validPassword = _g.sent();
                if (!validPassword) {
                    return [2 /*return*/, res.status(401).json({ message: '邮箱或密码错误' })];
                }
                token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || 'default-secret', { expiresIn: '7d' });
                res.json({
                    token: token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.name,
                        avatar: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.avatarUrl,
                        age: (_d = user.profile) === null || _d === void 0 ? void 0 : _d.age,
                        grade: (_e = user.profile) === null || _e === void 0 ? void 0 : _e.grade,
                        phone: (_f = user.profile) === null || _f === void 0 ? void 0 : _f.phone
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _g.sent();
                console.error('登录错误:', error_2);
                res.status(500).json({ message: '登录失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
