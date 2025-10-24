"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = await index_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: {
                profile: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        // 如果profile不存在，创建一个默认的
        if (!user.profile) {
            const profile = await index_1.prisma.profile.create({
                data: {
                    userId: user.id,
                    name: user.email.split('@')[0], // 使用邮箱前缀作为默认昵称
                    avatarUrl: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' // 默认头像
                }
            });
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
        }
        else {
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
        }
    }
    catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ message: '获取用户信息失败' });
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, age, grade, location, phone, avatar } = req.body;
        const profile = await index_1.prisma.profile.update({
            where: { userId: req.userId },
            data: {
                name,
                age,
                grade,
                location,
                phone,
                avatarUrl: avatar
            }
        });
        res.json(profile);
    }
    catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ message: '更新用户信息失败' });
    }
});
// PATCH /profile - 部分更新用户信息（包括引导状态）
router.patch('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, age, grade, location, phone, avatar, hasCompletedTutorial, tutorialStep } = req.body;
        // 构建更新数据对象，只包含提供的字段
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (age !== undefined)
            updateData.age = age;
        if (grade !== undefined)
            updateData.grade = grade;
        if (location !== undefined)
            updateData.location = location;
        if (phone !== undefined)
            updateData.phone = phone;
        if (avatar !== undefined)
            updateData.avatarUrl = avatar;
        if (hasCompletedTutorial !== undefined)
            updateData.hasCompletedTutorial = hasCompletedTutorial;
        if (tutorialStep !== undefined)
            updateData.tutorialStep = tutorialStep;
        const profile = await index_1.prisma.profile.update({
            where: { userId: req.userId },
            data: updateData
        });
        res.json(profile);
    }
    catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ message: '更新用户信息失败' });
    }
});
// ========== 用户活跃时长记录接口 ==========
// 开始新会话
router.post('/session/start', auth_1.authenticateToken, async (req, res) => {
    try {
        // 结束所有未结束的会话
        await index_1.prisma.userSession.updateMany({
            where: {
                userId: req.userId,
                endTime: null
            },
            data: {
                endTime: new Date()
            }
        });
        // 创建新会话
        const session = await index_1.prisma.userSession.create({
            data: {
                userId: req.userId,
                startTime: new Date()
            }
        });
        res.json({ sessionId: session.id });
    }
    catch (error) {
        console.error('创建会话失败:', error);
        res.status(500).json({ message: '创建会话失败' });
    }
});
// 心跳更新（每30秒调用一次）
router.post('/session/heartbeat', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ message: '缺少 sessionId' });
        }
        // 查找会话
        const session = await index_1.prisma.userSession.findUnique({
            where: { id: sessionId }
        });
        if (!session || session.userId !== req.userId) {
            return res.status(404).json({ message: '会话不存在或无权限' });
        }
        // 计算活跃时长（秒）
        const now = new Date();
        const duration = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
        // 更新会话时长
        await index_1.prisma.userSession.update({
            where: { id: sessionId },
            data: {
                duration,
                endTime: now
            }
        });
        res.json({ success: true, duration });
    }
    catch (error) {
        console.error('更新会话失败:', error);
        res.status(500).json({ message: '更新会话失败' });
    }
});
// 结束会话
router.post('/session/end', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ message: '缺少 sessionId' });
        }
        const session = await index_1.prisma.userSession.findUnique({
            where: { id: sessionId }
        });
        if (!session || session.userId !== req.userId) {
            return res.status(404).json({ message: '会话不存在或无权限' });
        }
        const now = new Date();
        const duration = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
        await index_1.prisma.userSession.update({
            where: { id: sessionId },
            data: {
                endTime: now,
                duration
            }
        });
        res.json({ success: true, duration });
    }
    catch (error) {
        console.error('结束会话失败:', error);
        res.status(500).json({ message: '结束会话失败' });
    }
});
exports.default = router;
