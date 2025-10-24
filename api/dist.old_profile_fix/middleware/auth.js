"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: '未登录' });
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default-secret', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'token无效' });
        }
        req.userId = decoded.userId;
        next();
    });
};
exports.authenticateToken = authenticateToken;
