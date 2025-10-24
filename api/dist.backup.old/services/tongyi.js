"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImage = analyzeImage;
exports.analyzeHomework = analyzeHomework;
const axios_1 = __importDefault(require("axios"));
const TONGYI_API_KEY = process.env.TONGYI_API_KEY || '';
const TONGYI_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
async function analyzeImage(imageUrl, prompt = '请分析这张图片的内容') {
    try {
        const response = await axios_1.default.post(TONGYI_API_URL, {
            model: 'qwen-vl-plus',
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
                max_tokens: 1000
            }
        }, {
            headers: {
                'Authorization': `Bearer ${TONGYI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.data.output && response.data.output.choices) {
            return response.data.output.choices[0].message.content[0].text;
        }
        return '无法识别图片内容';
    }
    catch (error) {
        console.error('通义千问 API 错误:', error);
        return '图片识别服务暂时不可用';
    }
}
async function analyzeHomework(imageUrl) {
    const prompt = `请仔细分析这张作业图片：
1. 识别题目内容
2. 分析题目类型（数学、语文、英语等）
3. 如果是习题，提供解题思路
4. 如果有错误，指出并解释
5. 给出学习建议

请用友好的语言，适合学生理解的方式回答。`;
    return analyzeImage(imageUrl, prompt);
}
