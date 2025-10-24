"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToOSS = uploadToOSS;
exports.getSignedUrl = getSignedUrl;
exports.deleteFromOSS = deleteFromOSS;
const ali_oss_1 = __importDefault(require("ali-oss"));
const OSS_REGION = process.env.OSS_REGION || '';
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || '';
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || '';
const OSS_BUCKET = process.env.OSS_BUCKET || '';
console.log('OSS配置加载:', {
    region: OSS_REGION,
    bucket: OSS_BUCKET,
    hasAccessKey: !!OSS_ACCESS_KEY_ID
});
// 创建OSS客户端 (使用any跳过TypeScript类型检查)
const client = new ali_oss_1.default({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    timeout: 600000 // 10分钟超时(毫秒)
});
/**
 * 上传文件到OSS
 * @param file 文件Buffer
 * @param filename 文件名
 * @param folder 文件夹(images/documents/avatars)
 * @returns OSS URL
 */
async function uploadToOSS(file, filename, folder = 'uploads') {
    try {
        const ext = filename.split('.').pop();
        const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        console.log(`开始上传文件到OSS: ${key}, 大小: ${(file.length / 1024 / 1024).toFixed(2)}MB`);
        // 上传到OSS (SDK会自动处理大文件)
        const result = await client.put(key, file);
        console.log('OSS上传成功:', result.name);
        // 返回公网访问URL
        return {
            url: result.url,
            key: result.name
        };
    }
    catch (error) {
        console.error('OSS上传失败:', error);
        throw new Error('文件上传到OSS失败');
    }
}
/**
 * 生成预签名URL(用于临时访问私有文件)
 * @param key OSS文件key
 * @param expires 过期时间(秒)
 * @returns 预签名URL
 */
async function getSignedUrl(key, expires = 3600) {
    try {
        const url = client.signatureUrl(key, {
            expires
        });
        return url;
    }
    catch (error) {
        console.error('生成预签名URL失败:', error);
        throw new Error('生成访问链接失败');
    }
}
/**
 * 删除OSS文件
 * @param key OSS文件key
 */
async function deleteFromOSS(key) {
    try {
        await client.delete(key);
        console.log('OSS文件删除成功:', key);
    }
    catch (error) {
        console.error('OSS文件删除失败:', error);
        throw new Error('文件删除失败');
    }
}
