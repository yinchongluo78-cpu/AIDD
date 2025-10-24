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
                phone: profile.phone,
                avatar: profile.avatarUrl
            });
        }
        else {
            res.json({
                username: user.email,
                name: user.profile.name,
                age: user.profile.age,
                grade: user.profile.grade,
                phone: user.profile.phone,
                avatar: user.profile.avatarUrl
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
        const { name, age, grade, phone, avatar } = req.body;
        const profile = await index_1.prisma.profile.update({
            where: { userId: req.userId },
            data: {
                name,
                age,
                grade,
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

// Session 路由（临时模拟）
router.post('/session/start', auth_1.authenticateToken, async (req, res) => {
    try {
        // 返回成功响应，不依赖 userSession 表
        res.json({
            success: true,
            sessionId: Date.now().toString(),
            message: 'Session started'
        });
    } catch (error) {
        console.error('启动会话失败:', error);
        res.status(500).json({ message: '启动会话失败' });
    }
});

router.get('/session/:sessionId', auth_1.authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            active: true,
            sessionId: req.params.sessionId
        });
    } catch (error) {
        res.status(500).json({ message: '获取会话失败' });
    }
});

router.post('/session/:sessionId/end', auth_1.authenticateToken, async (req, res) => {
    try {
        res.json({ success: true, message: 'Session ended' });
    } catch (error) {
        res.status(500).json({ message: '结束会话失败' });
    }
});

exports.default = router;
