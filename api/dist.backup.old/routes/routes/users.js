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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var index_1 = require("../index");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
router.get('/profile', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, profile, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, index_1.prisma.user.findUnique({
                        where: { id: req.userId },
                        include: {
                            profile: true
                        }
                    })];
            case 1:
                user = _a.sent();
                if (!user) {
                    return [2 /*return*/, res.status(404).json({ message: '用户不存在' })];
                }
                if (!!user.profile) return [3 /*break*/, 3];
                return [4 /*yield*/, index_1.prisma.profile.create({
                        data: {
                            userId: user.id,
                            name: user.email.split('@')[0], // 使用邮箱前缀作为默认昵称
                            avatarUrl: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' // 默认头像
                        }
                    })];
            case 2:
                profile = _a.sent();
                res.json({
                    username: user.email,
                    name: profile.name,
                    age: profile.age,
                    grade: profile.grade,
                    location: profile.location,
                    phone: profile.phone,
                    avatar: profile.avatarUrl,
                    hasCompletedTutorial: profile.hasCompletedTutorial || false,
                    tutorialStep: profile.tutorialStep || 0
                });
                return [3 /*break*/, 4];
            case 3:
                res.json({
                    username: user.email,
                    name: user.profile.name,
                    age: user.profile.age,
                    grade: user.profile.grade,
                    location: user.profile.location,
                    phone: user.profile.phone,
                    avatar: user.profile.avatarUrl,
                    hasCompletedTutorial: user.profile.hasCompletedTutorial || false,
                    tutorialStep: user.profile.tutorialStep || 0
                });
                _a.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.error('获取用户信息错误:', error_1);
                res.status(500).json({ message: '获取用户信息失败' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.put('/profile', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, age, grade, location_1, phone, avatar, profile, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, name_1 = _a.name, age = _a.age, grade = _a.grade, location_1 = _a.location, phone = _a.phone, avatar = _a.avatar;
                return [4 /*yield*/, index_1.prisma.profile.update({
                        where: { userId: req.userId },
                        data: {
                            name: name_1,
                            age: age,
                            grade: grade,
                            location: location_1,
                            phone: phone,
                            avatarUrl: avatar
                        }
                    })];
            case 1:
                profile = _b.sent();
                res.json(profile);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error('更新用户信息错误:', error_2);
                res.status(500).json({ message: '更新用户信息失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PATCH /profile - 部分更新用户信息（包括引导状态）
router.patch('/profile', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_2, age, grade, location_2, phone, avatar, hasCompletedTutorial, tutorialStep, updateData, profile, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, name_2 = _a.name, age = _a.age, grade = _a.grade, location_2 = _a.location, phone = _a.phone, avatar = _a.avatar, hasCompletedTutorial = _a.hasCompletedTutorial, tutorialStep = _a.tutorialStep;
                updateData = {};
                if (name_2 !== undefined)
                    updateData.name = name_2;
                if (age !== undefined)
                    updateData.age = age;
                if (grade !== undefined)
                    updateData.grade = grade;
                if (location_2 !== undefined)
                    updateData.location = location_2;
                if (phone !== undefined)
                    updateData.phone = phone;
                if (avatar !== undefined)
                    updateData.avatarUrl = avatar;
                if (hasCompletedTutorial !== undefined)
                    updateData.hasCompletedTutorial = hasCompletedTutorial;
                if (tutorialStep !== undefined)
                    updateData.tutorialStep = tutorialStep;
                return [4 /*yield*/, index_1.prisma.profile.update({
                        where: { userId: req.userId },
                        data: updateData
                    })];
            case 1:
                profile = _b.sent();
                res.json(profile);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('更新用户信息错误:', error_3);
                res.status(500).json({ message: '更新用户信息失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ========== 用户活跃时长记录接口 ==========
// 开始新会话
router.post('/session/start', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var session, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                // 结束所有未结束的会话
                return [4 /*yield*/, index_1.prisma.userSession.updateMany({
                        where: {
                            userId: req.userId,
                            endTime: null
                        },
                        data: {
                            endTime: new Date()
                        }
                    })
                    // 创建新会话
                ];
            case 1:
                // 结束所有未结束的会话
                _a.sent();
                return [4 /*yield*/, index_1.prisma.userSession.create({
                        data: {
                            userId: req.userId,
                            startTime: new Date()
                        }
                    })];
            case 2:
                session = _a.sent();
                res.json({ sessionId: session.id });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                console.error('创建会话失败:', error_4);
                res.status(500).json({ message: '创建会话失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 心跳更新（每30秒调用一次）
router.post('/session/heartbeat', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId, session, now, duration, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                sessionId = req.body.sessionId;
                if (!sessionId) {
                    return [2 /*return*/, res.status(400).json({ message: '缺少 sessionId' })];
                }
                return [4 /*yield*/, index_1.prisma.userSession.findUnique({
                        where: { id: sessionId }
                    })];
            case 1:
                session = _a.sent();
                if (!session || session.userId !== req.userId) {
                    return [2 /*return*/, res.status(404).json({ message: '会话不存在或无权限' })];
                }
                now = new Date();
                duration = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
                // 更新会话时长
                return [4 /*yield*/, index_1.prisma.userSession.update({
                        where: { id: sessionId },
                        data: {
                            duration: duration,
                            endTime: now
                        }
                    })];
            case 2:
                // 更新会话时长
                _a.sent();
                res.json({ success: true, duration: duration });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error('更新会话失败:', error_5);
                res.status(500).json({ message: '更新会话失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 结束会话
router.post('/session/end', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId, session, now, duration, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                sessionId = req.body.sessionId;
                if (!sessionId) {
                    return [2 /*return*/, res.status(400).json({ message: '缺少 sessionId' })];
                }
                return [4 /*yield*/, index_1.prisma.userSession.findUnique({
                        where: { id: sessionId }
                    })];
            case 1:
                session = _a.sent();
                if (!session || session.userId !== req.userId) {
                    return [2 /*return*/, res.status(404).json({ message: '会话不存在或无权限' })];
                }
                now = new Date();
                duration = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
                return [4 /*yield*/, index_1.prisma.userSession.update({
                        where: { id: sessionId },
                        data: {
                            endTime: now,
                            duration: duration
                        }
                    })];
            case 2:
                _a.sent();
                res.json({ success: true, duration: duration });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                console.error('结束会话失败:', error_6);
                res.status(500).json({ message: '结束会话失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
