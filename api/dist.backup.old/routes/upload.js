"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 创建上传目录
const uploadDir = path_1.default.join(__dirname, '../../uploads');
promises_1.default.mkdir(uploadDir, { recursive: true }).catch(console.error);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});
// 模拟文件上传服务
async function saveFile(file, folder = 'uploads') {
    const ext = path_1.default.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
    const folderPath = path_1.default.join(uploadDir, folder);
    // 确保文件夹存在
    await promises_1.default.mkdir(folderPath, { recursive: true });
    const filePath = path_1.default.join(folderPath, filename);
    const key = `${folder}/${filename}`;
    // 保存文件
    await promises_1.default.writeFile(filePath, file.buffer);
    return {
        url: `/uploads/${key}`,
        key: key
    };
}
// 上传图片
router.post('/image', auth_1.authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '请选择图片' });
        }
        const result = await saveFile(req.file, 'images');
        res.json(result);
    }
    catch (error) {
        console.error('上传图片错误:', error);
        res.status(500).json({ message: '上传失败' });
    }
});
// 上传文档
router.post('/document', auth_1.authenticateToken, upload.single('document'), async (req, res) => {
    try {
        console.log('=== 文档上传接口调用 ===');
        console.log('用户ID:', req.userId);
        console.log('接收到的文件信息:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : '无文件');
        if (!req.file) {
            console.log('错误: 没有接收到文件');
            return res.status(400).json({ message: '请选择文档' });
        }
        console.log('开始保存文件到存储...');
        const result = await saveFile(req.file, 'documents');
        console.log('文件保存结果:', result);
        // 确保文件名正确编码
        const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        console.log('处理后的文件名:', fileName);
        const response = {
            ...result,
            name: fileName,
            type: req.file.mimetype,
            size: req.file.size
        };
        console.log('文档上传成功，返回结果:', response);
        res.json(response);
    }
    catch (error) {
        console.error('上传文档错误详细信息:', {
            error: error,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: '上传失败' });
    }
});
// 上传头像
router.post('/avatar', auth_1.authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '请选择头像' });
        }
        const result = await saveFile(req.file, 'avatars');
        res.json(result);
    }
    catch (error) {
        console.error('上传头像错误:', error);
        res.status(500).json({ message: '上传失败' });
    }
});
exports.default = router;
