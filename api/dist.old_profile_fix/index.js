"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const conversations_1 = __importDefault(require("./routes/conversations"));
const kb_1 = __importDefault(require("./routes/kb"));
const chat_1 = __importDefault(require("./routes/chat"));
const upload_1 = __importDefault(require("./routes/upload"));
const admin_1 = __importDefault(require("./routes/admin"));
dotenv_1.default.config();
// 全局 BigInt 序列化支持
// @ts-ignore
BigInt.prototype.toJSON = function () {
    return Number(this);
};
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
exports.prisma = new client_1.PrismaClient();
const corsOptions = {
    origin: true, // 允许所有来源
    credentials: true
};
app.use((0, cors_1.default)(corsOptions));
// 增加请求体大小限制到120MB，支持大文件上传
app.use(express_1.default.json({ limit: '120mb' }));
app.use(express_1.default.urlencoded({ limit: '120mb', extended: true }));
// 提供静态文件服务
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/conversations', conversations_1.default);
app.use('/api/kb', kb_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/admin', admin_1.default);
app.listen(PORT, () => {
    console.log(`后端服务运行在 http://localhost:${PORT}`);
});
