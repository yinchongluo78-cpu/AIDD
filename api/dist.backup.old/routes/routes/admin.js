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
var express_1 = __importDefault(require("express"));
var index_1 = require("../index");
var feishuSync_1 = require("../services/feishuSync");
var ali_oss_1 = __importDefault(require("ali-oss"));
var router = express_1.default.Router();
// 概览统计
router.get('/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, totalUsers, totalConversations, totalMessages, totalDocuments, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.user.count(),
                        index_1.prisma.conversation.count(),
                        index_1.prisma.message.count(),
                        index_1.prisma.kbDocument.count()
                    ])];
            case 1:
                _a = _b.sent(), totalUsers = _a[0], totalConversations = _a[1], totalMessages = _a[2], totalDocuments = _a[3];
                res.json({
                    totalUsers: totalUsers,
                    totalConversations: totalConversations,
                    totalMessages: totalMessages,
                    totalDocuments: totalDocuments
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('获取统计数据失败:', error_1);
                res.status(500).json({ message: '获取统计数据失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 趋势数据（最近30天）
router.get('/trends', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var days, now, startDate, _a, allUsers_1, conversations_1, sessions_1, dates, cumulativeUsers_1, activeUsers_1, conversationCounts_1, activeDurations_1, i, date, dateStr, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                days = Number(req.query.days) || 30;
                now = new Date();
                startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.user.findMany({
                            select: {
                                id: true,
                                createdAt: true
                            },
                            orderBy: {
                                createdAt: 'asc'
                            }
                        }),
                        index_1.prisma.conversation.findMany({
                            where: {
                                createdAt: {
                                    gte: startDate
                                }
                            },
                            select: {
                                userId: true,
                                createdAt: true
                            }
                        }),
                        (index_1.prisma.userSession ? index_1.prisma.userSession.findMany({
                            where: {
                                startTime: {
                                    gte: startDate
                                }
                            },
                            select: {
                                userId: true,
                                startTime: true,
                                duration: true
                            }
                        }) : Promise.resolve([]))
                    ])
                    // 初始化日期数组
                ];
            case 1:
                _a = _b.sent(), allUsers_1 = _a[0], conversations_1 = _a[1], sessions_1 = _a[2];
                dates = [];
                cumulativeUsers_1 = [];
                activeUsers_1 = [];
                conversationCounts_1 = [];
                activeDurations_1 = [];
                // 生成最近N天的日期
                for (i = days - 1; i >= 0; i--) {
                    date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    dateStr = date.toISOString().split('T')[0];
                    dates.push(dateStr);
                }
                // 计算每天的数据
                dates.forEach(function (dateStr, index) {
                    var date = new Date(dateStr);
                    var nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
                    // 1. 累计用户数 - 截至当天的总用户数
                    var cumulativeCount = allUsers_1.filter(function (user) {
                        return new Date(user.createdAt) <= nextDate;
                    }).length;
                    cumulativeUsers_1.push(cumulativeCount);
                    // 2. 活跃用户数 - 当天有对话的用户数
                    var activeUserIds = new Set(conversations_1
                        .filter(function (conv) {
                        var convDate = new Date(conv.createdAt);
                        return convDate >= date && convDate < nextDate;
                    })
                        .map(function (conv) { return conv.userId; }));
                    activeUsers_1.push(activeUserIds.size);
                    // 3. 对话数 - 当天创建的对话数
                    var dailyConversations = conversations_1.filter(function (conv) {
                        var convDate = new Date(conv.createdAt);
                        return convDate >= date && convDate < nextDate;
                    }).length;
                    conversationCounts_1.push(dailyConversations);
                    // 4. 用户在线时长 - 当天所有会话的总时长（秒）
                    var dailyDuration = sessions_1
                        .filter(function (session) {
                        var sessionDate = new Date(session.startTime);
                        return sessionDate >= date && sessionDate < nextDate;
                    })
                        .reduce(function (sum, session) { return sum + session.duration; }, 0);
                    activeDurations_1.push(dailyDuration);
                });
                res.json({
                    dates: dates,
                    cumulativeUsers: cumulativeUsers_1,
                    activeUsers: activeUsers_1,
                    conversationCounts: conversationCounts_1,
                    activeDurations: activeDurations_1
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error('获取趋势数据失败:', error_2);
                res.status(500).json({ message: '获取趋势数据失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 最近活跃用户
router.get('/recent-users', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var users, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.user.findMany({
                        take: 5,
                        orderBy: {
                            createdAt: 'desc'
                        },
                        include: {
                            profile: true
                        }
                    })];
            case 1:
                users = _a.sent();
                res.json(users.map(function (user) {
                    var _a;
                    return ({
                        id: user.id,
                        name: ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.name) || user.email,
                        email: user.email,
                        lastActive: user.createdAt
                    });
                }));
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('获取最近用户失败:', error_3);
                res.status(500).json({ message: '获取最近用户失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 最近对话
router.get('/recent-conversations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var conversations, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.conversation.findMany({
                        take: 5,
                        orderBy: {
                            createdAt: 'desc'
                        },
                        include: {
                            user: {
                                include: {
                                    profile: true
                                }
                            }
                        }
                    })];
            case 1:
                conversations = _a.sent();
                res.json(conversations.map(function (conv) {
                    var _a;
                    return ({
                        id: conv.id,
                        userName: ((_a = conv.user.profile) === null || _a === void 0 ? void 0 : _a.name) || conv.user.email,
                        title: conv.title,
                        createdAt: conv.createdAt
                    });
                }));
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('获取最近对话失败:', error_4);
                res.status(500).json({ message: '获取最近对话失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 用户列表
router.get('/users', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, pageSize, _d, search, where, _e, users, total, usersWithSessions, error_5;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 3, , 4]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.pageSize, pageSize = _c === void 0 ? 20 : _c, _d = _a.search, search = _d === void 0 ? '' : _d;
                where = search
                    ? {
                        OR: [
                            { email: { contains: search, mode: 'insensitive' } },
                            { profile: { name: { contains: search, mode: 'insensitive' } } }
                        ]
                    }
                    : {};
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.user.findMany({
                            where: where,
                            skip: (Number(page) - 1) * Number(pageSize),
                            take: Number(pageSize),
                            include: {
                                profile: true,
                                conversations: {
                                    select: { id: true }
                                }
                            },
                            orderBy: {
                                createdAt: 'desc'
                            }
                        }),
                        index_1.prisma.user.count({ where: where })
                    ])
                    // 获取每个用户的会话数据
                ];
            case 1:
                _e = _f.sent(), users = _e[0], total = _e[1];
                return [4 /*yield*/, Promise.all(users.map(function (user) { return __awaiter(void 0, void 0, void 0, function () {
                        var sessions, sessionCount, totalActiveDuration;
                        var _a, _b, _c, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0: return [4 /*yield*/, (index_1.prisma.userSession ? index_1.prisma.userSession.findMany({
                                        where: { userId: user.id }
                                    }) : Promise.resolve([]))];
                                case 1:
                                    sessions = _e.sent();
                                    sessionCount = sessions.length;
                                    totalActiveDuration = sessions.reduce(function (sum, s) { return sum + (s.duration || 0); }, 0);
                                    return [2 /*return*/, {
                                            id: user.id,
                                            name: ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.name) || '-',
                                            email: user.email,
                                            phone: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.phone,
                                            age: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.age,
                                            grade: (_d = user.profile) === null || _d === void 0 ? void 0 : _d.grade,
                                            conversationCount: user.conversations.length,
                                            sessionCount: sessionCount,
                                            totalActiveDuration: totalActiveDuration, // 总活跃时长（秒）
                                            createdAt: user.createdAt
                                        }];
                            }
                        });
                    }); }))];
            case 2:
                usersWithSessions = _f.sent();
                res.json({
                    data: usersWithSessions,
                    total: total
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _f.sent();
                console.error('获取用户列表失败:', error_5);
                res.status(500).json({ message: '获取用户列表失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 导出用户数据 (必须在 :id 动态路由之前)
router.get('/users/export', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var users, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.user.findMany({
                        include: {
                            profile: true,
                            conversations: {
                                select: { id: true }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    })];
            case 1:
                users = _a.sent();
                res.json({
                    data: users.map(function (user) {
                        var _a, _b, _c, _d;
                        return ({
                            name: ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.name) || '-',
                            email: user.email,
                            phone: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.phone,
                            age: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.age,
                            grade: (_d = user.profile) === null || _d === void 0 ? void 0 : _d.grade,
                            conversationCount: user.conversations.length,
                            createdAt: user.createdAt
                        });
                    })
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('导出用户数据失败:', error_6);
                res.status(500).json({ message: '导出用户数据失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 用户详情
router.get('/users/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, user, _a, messageCount, sessions, sessionCount, totalActiveDuration, error_7;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 3, , 4]);
                id = req.params.id;
                return [4 /*yield*/, index_1.prisma.user.findUnique({
                        where: { id: id },
                        include: {
                            profile: true,
                            conversations: {
                                take: 5,
                                orderBy: {
                                    createdAt: 'desc'
                                },
                                include: {
                                    messages: {
                                        select: { id: true }
                                    }
                                }
                            },
                            documents: {
                                select: { id: true }
                            }
                        }
                    })];
            case 1:
                user = _f.sent();
                if (!user) {
                    return [2 /*return*/, res.status(404).json({ message: '用户不存在' })];
                }
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.message.count({
                            where: {
                                conversation: {
                                    userId: id
                                }
                            }
                        }),
                        (index_1.prisma.userSession ? index_1.prisma.userSession.findMany({
                            where: { userId: id }
                        }) : Promise.resolve([]))
                    ])];
            case 2:
                _a = _f.sent(), messageCount = _a[0], sessions = _a[1];
                sessionCount = sessions.length;
                totalActiveDuration = sessions.reduce(function (sum, s) { return sum + (s.duration || 0); }, 0);
                res.json({
                    id: user.id,
                    name: ((_b = user.profile) === null || _b === void 0 ? void 0 : _b.name) || '-',
                    email: user.email,
                    phone: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.phone,
                    age: (_d = user.profile) === null || _d === void 0 ? void 0 : _d.age,
                    grade: (_e = user.profile) === null || _e === void 0 ? void 0 : _e.grade,
                    conversationCount: user.conversations.length,
                    messageCount: messageCount,
                    documentCount: user.documents.length,
                    sessionCount: sessionCount,
                    totalActiveDuration: totalActiveDuration, // 总活跃时长（秒）
                    createdAt: user.createdAt,
                    recentConversations: user.conversations.map(function (conv) { return ({
                        id: conv.id,
                        title: conv.title,
                        messageCount: conv.messages.length,
                        createdAt: conv.createdAt
                    }); })
                });
                return [3 /*break*/, 4];
            case 3:
                error_7 = _f.sent();
                console.error('获取用户详情失败:', error_7);
                res.status(500).json({ message: '获取用户详情失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 对话列表
router.get('/conversations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, pageSize, _d, search, where, _e, conversations, total, error_8;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.pageSize, pageSize = _c === void 0 ? 20 : _c, _d = _a.search, search = _d === void 0 ? '' : _d;
                where = search
                    ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' } },
                            { user: {
                                    OR: [
                                        { email: { contains: search, mode: 'insensitive' } },
                                        { profile: { name: { contains: search, mode: 'insensitive' } } }
                                    ]
                                } }
                        ]
                    }
                    : {};
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.conversation.findMany({
                            where: where,
                            skip: (Number(page) - 1) * Number(pageSize),
                            take: Number(pageSize),
                            include: {
                                user: {
                                    include: {
                                        profile: true
                                    }
                                },
                                messages: {
                                    select: {
                                        id: true,
                                        citations: true
                                    }
                                }
                            },
                            orderBy: {
                                createdAt: 'desc'
                            }
                        }),
                        index_1.prisma.conversation.count({ where: where })
                    ])];
            case 1:
                _e = _f.sent(), conversations = _e[0], total = _e[1];
                res.json({
                    data: conversations.map(function (conv) {
                        var _a;
                        // 检查是否有任何消息包含 citations（知识库引用）
                        var hasKnowledgeBase = conv.messages.some(function (msg) {
                            var citations = msg.citations;
                            // null 或 undefined 直接返回 false
                            if (citations === null || citations === undefined)
                                return false;
                            // 如果是字符串，尝试解析
                            if (typeof citations === 'string') {
                                try {
                                    var parsed = JSON.parse(citations);
                                    return Array.isArray(parsed) && parsed.length > 0;
                                }
                                catch (_a) {
                                    return false;
                                }
                            }
                            // 如果已经是数组
                            if (Array.isArray(citations)) {
                                return citations.length > 0;
                            }
                            return false;
                        });
                        return {
                            id: conv.id,
                            userName: ((_a = conv.user.profile) === null || _a === void 0 ? void 0 : _a.name) || conv.user.email,
                            title: conv.title,
                            messageCount: conv.messages.length,
                            hasInstructions: !!conv.customInstructions,
                            hasKnowledgeBase: hasKnowledgeBase,
                            createdAt: conv.createdAt
                        };
                    }),
                    total: total
                });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _f.sent();
                console.error('获取对话列表失败:', error_8);
                res.status(500).json({ message: '获取对话列表失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 导出对话数据 (必须在 :id 动态路由之前)
router.get('/conversations/export', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var conversations, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, index_1.prisma.conversation.findMany({
                        include: {
                            user: {
                                include: {
                                    profile: true
                                }
                            },
                            messages: {
                                select: {
                                    id: true,
                                    citations: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    })];
            case 1:
                conversations = _a.sent();
                res.json({
                    data: conversations.map(function (conv) {
                        var _a;
                        // 检查是否有任何消息包含 citations（知识库引用）
                        var hasKnowledgeBase = conv.messages.some(function (msg) {
                            var citations = msg.citations;
                            // null 或 undefined 直接返回 false
                            if (citations === null || citations === undefined)
                                return false;
                            // 如果是字符串，尝试解析
                            if (typeof citations === 'string') {
                                try {
                                    var parsed = JSON.parse(citations);
                                    return Array.isArray(parsed) && parsed.length > 0;
                                }
                                catch (_a) {
                                    return false;
                                }
                            }
                            // 如果已经是数组
                            if (Array.isArray(citations)) {
                                return citations.length > 0;
                            }
                            return false;
                        });
                        return {
                            userName: ((_a = conv.user.profile) === null || _a === void 0 ? void 0 : _a.name) || conv.user.email,
                            title: conv.title,
                            messageCount: conv.messages.length,
                            hasInstructions: !!conv.customInstructions,
                            hasKnowledgeBase: hasKnowledgeBase,
                            createdAt: conv.createdAt
                        };
                    })
                });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error('导出对话数据失败:', error_9);
                res.status(500).json({ message: '导出对话数据失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 对话详情
router.get('/conversations/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, conversation, ossClient_1, messagesWithImages, error_10;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                id = req.params.id;
                return [4 /*yield*/, index_1.prisma.conversation.findUnique({
                        where: { id: id },
                        include: {
                            user: {
                                include: {
                                    profile: true
                                }
                            },
                            messages: {
                                orderBy: {
                                    createdAt: 'asc'
                                }
                            }
                        }
                    })];
            case 1:
                conversation = _b.sent();
                if (!conversation) {
                    return [2 /*return*/, res.status(404).json({ message: '对话不存在' })];
                }
                ossClient_1 = new ali_oss_1.default({
                    region: process.env.OSS_REGION,
                    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
                    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
                    bucket: process.env.OSS_BUCKET
                });
                return [4 /*yield*/, Promise.all(conversation.messages.map(function (msg) { return __awaiter(void 0, void 0, void 0, function () {
                        var imageUrl;
                        return __generator(this, function (_a) {
                            imageUrl = null;
                            if (msg.imageOssKey) {
                                try {
                                    // 生成预签名URL，有效期1小时
                                    imageUrl = ossClient_1.signatureUrl(msg.imageOssKey, { expires: 3600 });
                                }
                                catch (error) {
                                    console.error('生成图片URL失败:', error);
                                }
                            }
                            return [2 /*return*/, {
                                    id: msg.id,
                                    role: msg.role,
                                    content: msg.content,
                                    imageUrl: imageUrl,
                                    createdAt: msg.createdAt
                                }];
                        });
                    }); }))];
            case 2:
                messagesWithImages = _b.sent();
                res.json({
                    id: conversation.id,
                    userName: ((_a = conversation.user.profile) === null || _a === void 0 ? void 0 : _a.name) || conversation.user.email,
                    title: conversation.title,
                    customInstructions: conversation.customInstructions,
                    messageCount: conversation.messages.length,
                    createdAt: conversation.createdAt,
                    messages: messagesWithImages
                });
                return [3 /*break*/, 4];
            case 3:
                error_10 = _b.sent();
                console.error('获取对话详情失败:', error_10);
                res.status(500).json({ message: '获取对话详情失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 知识库统计
router.get('/knowledge-base/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, totalDocuments, totalCategories, totalChunks, error_11;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.kbDocument.count(),
                        index_1.prisma.kbCategory.count(),
                        index_1.prisma.kbChunk.count()
                    ])];
            case 1:
                _a = _b.sent(), totalDocuments = _a[0], totalCategories = _a[1], totalChunks = _a[2];
                res.json({
                    totalDocuments: totalDocuments,
                    totalCategories: totalCategories,
                    totalChunks: totalChunks
                });
                return [3 /*break*/, 3];
            case 2:
                error_11 = _b.sent();
                console.error('获取知识库统计失败:', error_11);
                res.status(500).json({ message: '获取知识库统计失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 知识库文档列表
router.get('/knowledge-base/documents', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, pageSize, _d, documents, total, error_12;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.pageSize, pageSize = _c === void 0 ? 10 : _c;
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.kbDocument.findMany({
                            skip: (Number(page) - 1) * Number(pageSize),
                            take: Number(pageSize),
                            include: {
                                user: {
                                    include: {
                                        profile: true
                                    }
                                },
                                category: true,
                                chunks: {
                                    select: { id: true }
                                }
                            },
                            orderBy: {
                                createdAt: 'desc'
                            }
                        }),
                        index_1.prisma.kbDocument.count()
                    ])];
            case 1:
                _d = _e.sent(), documents = _d[0], total = _d[1];
                res.json({
                    data: documents.map(function (doc) {
                        var _a;
                        return ({
                            id: doc.id,
                            userName: ((_a = doc.user.profile) === null || _a === void 0 ? void 0 : _a.name) || doc.user.email,
                            fileName: doc.filename,
                            categoryName: doc.category.name,
                            chunkCount: doc.chunks.length,
                            createdAt: doc.createdAt
                        });
                    }),
                    total: total
                });
                return [3 /*break*/, 3];
            case 2:
                error_12 = _e.sent();
                console.error('获取知识库文档失败:', error_12);
                res.status(500).json({ message: '获取知识库文档失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 知识库分类列表
router.get('/knowledge-base/categories', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, pageSize, _d, categories, total, error_13;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.pageSize, pageSize = _c === void 0 ? 10 : _c;
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.kbCategory.findMany({
                            skip: (Number(page) - 1) * Number(pageSize),
                            take: Number(pageSize),
                            include: {
                                user: {
                                    include: {
                                        profile: true
                                    }
                                },
                                documents: {
                                    select: { id: true }
                                }
                            },
                            orderBy: {
                                createdAt: 'desc'
                            }
                        }),
                        index_1.prisma.kbCategory.count()
                    ])];
            case 1:
                _d = _e.sent(), categories = _d[0], total = _d[1];
                res.json({
                    data: categories.map(function (cat) {
                        var _a;
                        return ({
                            id: cat.id,
                            userName: ((_a = cat.user.profile) === null || _a === void 0 ? void 0 : _a.name) || cat.user.email,
                            name: cat.name,
                            documentCount: cat.documents.length,
                            createdAt: cat.createdAt
                        });
                    }),
                    total: total
                });
                return [3 /*break*/, 3];
            case 2:
                error_13 = _e.sent();
                console.error('获取知识库分类失败:', error_13);
                res.status(500).json({ message: '获取知识库分类失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 知识库使用情况
router.get('/knowledge-base/usage', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var users, usageData, error_14;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, index_1.prisma.user.findMany({
                        include: {
                            profile: true,
                            categories: {
                                select: { id: true }
                            },
                            documents: {
                                select: {
                                    id: true,
                                    fileSize: true,
                                    createdAt: true
                                }
                            }
                        }
                    })];
            case 1:
                users = _a.sent();
                return [4 /*yield*/, Promise.all(users.map(function (user) { return __awaiter(void 0, void 0, void 0, function () {
                        var chunkCount, totalSize, lastUpload;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, index_1.prisma.kbChunk.count({
                                        where: {
                                            document: {
                                                userId: user.id
                                            }
                                        }
                                    })];
                                case 1:
                                    chunkCount = _b.sent();
                                    totalSize = user.documents.reduce(function (sum, doc) { return sum + Number(doc.fileSize || 0); }, 0);
                                    lastUpload = user.documents.length > 0
                                        ? user.documents.sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })[0].createdAt
                                        : null;
                                    return [2 /*return*/, {
                                            id: user.id,
                                            userName: ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.name) || user.email,
                                            categoryCount: user.categories.length,
                                            documentCount: user.documents.length,
                                            chunkCount: chunkCount,
                                            totalSize: totalSize,
                                            lastUploadAt: lastUpload
                                        }];
                            }
                        });
                    }); }))];
            case 2:
                usageData = _a.sent();
                res.json({
                    data: usageData.filter(function (u) { return u.documentCount > 0; })
                });
                return [3 /*break*/, 4];
            case 3:
                error_14 = _a.sent();
                console.error('获取知识库使用情况失败:', error_14);
                res.status(500).json({ message: '获取知识库使用情况失败' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 下载文档
router.get('/knowledge-base/documents/:id/download', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, document_1, ossClient, url, error_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                return [4 /*yield*/, index_1.prisma.kbDocument.findUnique({
                        where: { id: id },
                        select: {
                            ossKey: true,
                            filename: true,
                            fileExt: true
                        }
                    })];
            case 1:
                document_1 = _a.sent();
                if (!document_1) {
                    return [2 /*return*/, res.status(404).json({ message: '文档不存在' })];
                }
                if (!document_1.ossKey) {
                    return [2 /*return*/, res.status(404).json({ message: '文档文件不存在' })];
                }
                ossClient = new ali_oss_1.default({
                    region: process.env.OSS_REGION,
                    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
                    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
                    bucket: process.env.OSS_BUCKET
                });
                url = ossClient.signatureUrl(document_1.ossKey, {
                    expires: 3600
                });
                res.json({ url: url });
                return [3 /*break*/, 3];
            case 2:
                error_15 = _a.sent();
                console.error('生成下载链接失败:', error_15);
                res.status(500).json({ message: '生成下载链接失败', error: error_15.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 获取文档详情和内容
router.get('/knowledge-base/documents/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, document_2, error_16;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                return [4 /*yield*/, index_1.prisma.kbDocument.findUnique({
                        where: { id: id },
                        include: {
                            user: {
                                include: {
                                    profile: true
                                }
                            },
                            category: true,
                            chunks: {
                                orderBy: {
                                    seq: 'asc'
                                }
                            }
                        }
                    })];
            case 1:
                document_2 = _b.sent();
                if (!document_2) {
                    return [2 /*return*/, res.status(404).json({ message: '文档不存在' })];
                }
                res.json({
                    id: document_2.id,
                    fileName: document_2.filename,
                    fileSize: Number(document_2.fileSize),
                    mimeType: document_2.mimeType || null,
                    status: document_2.status,
                    userName: ((_a = document_2.user.profile) === null || _a === void 0 ? void 0 : _a.name) || document_2.user.email,
                    categoryName: document_2.category.name,
                    createdAt: document_2.createdAt,
                    chunks: document_2.chunks.map(function (chunk) { return ({
                        id: chunk.id,
                        index: chunk.seq,
                        content: chunk.content
                    }); })
                });
                return [3 /*break*/, 3];
            case 2:
                error_16 = _b.sent();
                console.error('获取文档详情失败:', error_16);
                console.error('错误详情:', error_16.message, error_16.stack);
                res.status(500).json({ message: '获取文档详情失败', error: error_16.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 系统统计
router.get('/system/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userCount, conversationCount, messageCount, chunkCount, deepseekCalls, ocrCalls, error_17;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.user.count(),
                        index_1.prisma.conversation.count(),
                        index_1.prisma.message.count(),
                        index_1.prisma.kbChunk.count()
                    ])
                    // 这些数据需要根据实际日志系统来实现
                    // 这里提供模拟数据
                ];
            case 1:
                _a = _b.sent(), userCount = _a[0], conversationCount = _a[1], messageCount = _a[2], chunkCount = _a[3];
                deepseekCalls = messageCount * 2 // 估算
                ;
                ocrCalls = Math.floor(messageCount * 0.3) // 估算 30% 的消息使用了图片
                ;
                res.json({
                    deepseekCalls: deepseekCalls,
                    ocrCalls: ocrCalls,
                    ossStorage: 0, // 需要从 OSS API 获取
                    totalFiles: 0, // 需要从 OSS API 获取
                    deepseekCost: deepseekCalls * 0.0014, // DeepSeek 价格估算
                    ocrCost: ocrCalls * 0.001, // OCR 价格估算
                    ossCost: 0, // OSS 成本估算
                    userCount: userCount,
                    conversationCount: conversationCount,
                    messageCount: messageCount,
                    chunkCount: chunkCount
                });
                return [3 /*break*/, 3];
            case 2:
                error_17 = _b.sent();
                console.error('获取系统统计失败:', error_17);
                res.status(500).json({ message: '获取系统统计失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// API 调用日志（模拟数据）
router.get('/system/api-logs', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, limit, messages, error_18;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.query.limit, limit = _a === void 0 ? 20 : _a;
                return [4 /*yield*/, index_1.prisma.message.findMany({
                        take: Number(limit),
                        where: {
                            role: 'assistant'
                        },
                        include: {
                            conversation: {
                                include: {
                                    user: {
                                        include: {
                                            profile: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    })];
            case 1:
                messages = _b.sent();
                res.json({
                    data: messages.map(function (msg) {
                        var _a;
                        return ({
                            id: msg.id,
                            type: 'deepseek',
                            userName: ((_a = msg.conversation.user.profile) === null || _a === void 0 ? void 0 : _a.name) || msg.conversation.user.email,
                            model: 'deepseek-chat',
                            tokens: msg.content.length, // 粗略估算
                            cost: msg.content.length * 0.000001,
                            duration: Math.floor(Math.random() * 2000) + 500, // 模拟
                            createdAt: msg.createdAt
                        });
                    })
                });
                return [3 /*break*/, 3];
            case 2:
                error_18 = _b.sent();
                console.error('获取 API 日志失败:', error_18);
                res.status(500).json({ message: '获取 API 日志失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ========== 飞书同步接口 ==========
// 手动触发飞书同步
router.post('/feishu/sync', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_19;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('收到飞书同步请求');
                return [4 /*yield*/, (0, feishuSync_1.syncAllToFeishu)()];
            case 1:
                result = _a.sent();
                if (result.success) {
                    res.json({ message: result.message });
                }
                else {
                    res.status(500).json({ message: result.message });
                }
                return [3 /*break*/, 3];
            case 2:
                error_19 = _a.sent();
                console.error('飞书同步失败:', error_19);
                res.status(500).json({ message: error_19.message || '飞书同步失败' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 获取飞书同步配置状态
router.get('/feishu/status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var configured;
    return __generator(this, function (_a) {
        try {
            configured = !!(process.env.FEISHU_APP_ID &&
                process.env.FEISHU_APP_SECRET &&
                process.env.FEISHU_TABLE_APP_TOKEN &&
                process.env.FEISHU_USER_TABLE_ID);
            res.json({
                configured: configured,
                config: {
                    hasAppId: !!process.env.FEISHU_APP_ID,
                    hasAppSecret: !!process.env.FEISHU_APP_SECRET,
                    hasTableAppToken: !!process.env.FEISHU_TABLE_APP_TOKEN,
                    hasUserTableId: !!process.env.FEISHU_USER_TABLE_ID,
                    hasDailyStatsTableId: !!process.env.FEISHU_DAILY_STATS_TABLE_ID
                }
            });
        }
        catch (error) {
            console.error('获取飞书配置状态失败:', error);
            res.status(500).json({ message: '获取飞书配置状态失败' });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
