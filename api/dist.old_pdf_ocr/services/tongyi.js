"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImage = analyzeImage;
exports.analyzeHomework = analyzeHomework;
exports.analyzePdfPage = analyzePdfPage;
exports.analyzeScannedPdfDocument = analyzeScannedPdfDocument;
const axios_1 = __importDefault(require("axios"));
const TONGYI_API_KEY = process.env.TONGYI_API_KEY || '';
const TONGYI_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
async function analyzeImage(imageUrl, prompt = '请分析这张图片的内容') {
    try {
        console.log('=== 通义千问 OCR 请求 ===');
        console.log('API Key 状态:', TONGYI_API_KEY ? `存在 (${TONGYI_API_KEY.substring(0, 10)}...)` : '❌ 未配置');
        console.log('图片 URL:', imageUrl.substring(0, 100) + '...');
        const response = await axios_1.default.post(TONGYI_API_URL, {
            model: 'qwen-vl-plus', // 🚀 Plus 版本，速度快且准确度高
            input: {
                messages: [
                    {
                        role: 'user',
                        content: [
                            { text: prompt },
                            { image: imageUrl }
                        ]
                    }
                ]
            },
            parameters: {
                max_tokens: 3000, // 增加 token 限制，确保完整识别
                temperature: 0.1, // 降低随机性，提高准确性
                top_p: 0.8 // 控制采样范围，平衡多样性与准确性
            }
        }, {
            headers: {
                'Authorization': `Bearer ${TONGYI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60秒超时 - Plus版本通常10-20秒就能完成
        });
        console.log('通义千问响应状态:', response.status);
        console.log('响应数据:', JSON.stringify(response.data).substring(0, 200));
        if (response.data.output && response.data.output.choices) {
            const result = response.data.output.choices[0].message.content[0].text;
            console.log('✅ OCR 成功，结果长度:', result.length);
            return result;
        }
        console.error('❌ 响应格式不正确:', response.data);
        return '无法识别图片内容';
    }
    catch (error) {
        console.error('===  通义千问 API 错误详情 ===');
        console.error('错误类型:', error.name);
        console.error('错误消息:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        else if (error.request) {
            console.error('请求已发送但无响应');
        }
        else {
            console.error('请求配置错误:', error.message);
        }
        console.error('API Key 配置:', TONGYI_API_KEY ? '已配置' : '❌ 未配置');
        return '图片识别服务暂时不可用，请稍后重试';
    }
}
async function analyzeHomework(imageUrl, userQuestion = '') {
    const prompt = `你是一个智能图片识别助手，这张图片可能包含：印刷体题目 + 手写解答过程。

【用户问题】
${userQuestion || '（用户未输入问题，请识别所有内容）'}

【智能识别策略】
根据用户的问题，智能判断识别重点：

🔍 **判断逻辑：**
- 如果用户问的是"题目是什么"、"帮我解题"、"这道题怎么做"等 → **优先识别印刷体题目**，手写内容可忽略
- 如果用户问的是"我做对了吗"、"解答正确吗"、"批改作业"等 → **需要识别印刷题目 + 手写解答**
- 如果用户未输入问题 → 识别所有内容（印刷+手写）

📝 **识别要求：**
1. 印刷体识别：
   - 完整识别题号、问题描述、条件、选项等
   - 准确识别数学公式、几何符号、化学方程式

2. 手写体识别（按需）：
   - 如果需要识别手写内容，尽力识别计算步骤和答案
   - 字迹不清晰的地方标注 [不清晰]

3. 输出格式：
   - 清晰区分【题目内容】和【手写解答】（如果需要）
   - 保持原有的题目结构和编号

⚠️ **重点**：根据用户问题智能输出，不要无脑全部识别！`;
    return analyzeImage(imageUrl, prompt);
}
/**
 * 分析PDF页面图片，提取文字并理解图形/图表
 * 适用于扫描版PDF的OCR识别，能够理解几何图形、电路图、化学装置图等
 * @param imageUrl - PDF页面的图片URL（OSS预签名URL）
 * @param pageNumber - 页码（用于日志记录）
 * @returns 提取的文字内容和图形描述
 */
async function analyzePdfPage(imageUrl, pageNumber) {
    const prompt = `你是一个专业的PDF页面识别助手，需要提取这个PDF页面中的所有文字内容和图形信息。

【识别要求】

📝 **文字提取：**
1. 完整提取页面中的所有文字内容
2. 保持原有的段落结构和层次
3. 准确识别数学公式、化学方程式、物理公式等
4. 保留标题、小标题、列表等格式信息

📊 **图形理解：**
1. 几何图形（数学）：
   - 描述图形类型（三角形、圆、多边形等）
   - 说明图形中的标注（角度、长度、点的标记等）
   - 保留图形之间的关系（如平行、垂直、相切等）

2. 物理图形：
   - 力学图：描述物体、力的方向和大小标注
   - 电路图：描述电路元件、连接关系、标注值
   - 光路图：描述光线路径、镜面、透镜等

3. 化学图形：
   - 实验装置图：描述仪器名称、连接方式
   - 分子结构图：描述原子、化学键
   - 化学方程式图解

4. 地理/生物图形：
   - 地图：描述地形、标记、图例
   - 生物结构图：描述器官、组织、标注

📋 **输出格式：**
1. 按阅读顺序输出内容
2. 遇到图形时，用【图：描述内容】标记
3. 保持内容的连贯性和完整性
4. 不要遗漏任何文字和重要图形信息

⚠️ **注意事项：**
- 这是扫描版PDF，文字可能不够清晰，请尽力识别
- 图形是学习的重要部分，必须详细描述
- 输出的内容将用于知识库检索，务必准确完整`;
    console.log(`=== PDF页面OCR识别：第${pageNumber}页 ===`);
    const result = await analyzeImage(imageUrl, prompt);
    console.log(`✅ 第${pageNumber}页识别完成，内容长度: ${result.length}`);
    return result;
}
/**
 * 分析整个扫描版 PDF 文档（简化版：一次性识别）
 * 适用于无法逐页转图片的场景
 * @param pdfUrl - PDF 文件的 OSS URL
 * @param totalPages - PDF 总页数
 * @returns 提取的全部文字内容
 */
async function analyzeScannedPdfDocument(pdfUrl, totalPages) {
    const prompt = `你是一个专业的扫描版PDF文档识别助手。这是一个${totalPages}页的扫描版PDF文档，需要提取所有文字内容。

【识别要求】
1. 完整提取所有页面的文字内容
2. 保持原有的章节、段落结构
3. 准确识别数学公式、化学方程式、物理公式等
4. 如果有图表，简要描述图表内容
5. 按页面顺序组织内容

【输出格式】
按照原文档的顺序和结构输出，清晰易读。`;
    console.log(`=== 扫描版PDF文档OCR识别：共${totalPages}页 ===`);
    const result = await analyzeImage(pdfUrl, prompt);
    console.log(`✅ PDF文档识别完成，总内容长度: ${result.length}`);
    return result;
}
