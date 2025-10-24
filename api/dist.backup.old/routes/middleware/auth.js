"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var authenticateToken = function (req, res, next) {
    var authHeader = req.headers['authorization'];
    var token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: '未登录' });
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default-secret', function (err, decoded) {
        if (err) {
            return res.status(403).json({ message: 'token无效' });
        }
        req.userId = decoded.userId;
        next();
    });
};
exports.authenticateToken = authenticateToken;
