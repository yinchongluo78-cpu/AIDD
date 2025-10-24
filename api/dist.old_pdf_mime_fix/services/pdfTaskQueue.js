"use strict";
/**
 * PDF 处理任务队列管理器
 * 限制并发数量，防止服务器资源耗尽
 * 支持任务排队、优先级、超时控制
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalPdfTaskQueue = exports.PdfTaskQueue = void 0;
class PdfTaskQueue {
    constructor(config) {
        this.runningTasks = new Map();
        this.queuedTasks = [];
        this.taskIdCounter = 0;
        this.config = {
            maxConcurrent: config?.maxConcurrent || 2, // 默认最多 2 个并发
            maxQueueSize: config?.maxQueueSize || 10, // 默认最多 10 个排队
            defaultTimeout: config?.defaultTimeout || 3600000, // 默认 1 小时超时
        };
        console.log('=== PDF 任务队列初始化 ===');
        console.log(`   - 最大并发: ${this.config.maxConcurrent}`);
        console.log(`   - 最大队列: ${this.config.maxQueueSize}`);
        console.log(`   - 默认超时: ${this.config.defaultTimeout / 1000}秒`);
    }
    /**
     * 添加任务到队列
     * @param fn - 异步任务函数
     * @param options - 任务选项
     * @returns Promise（任务结果）
     */
    async addTask(fn, options) {
        return new Promise((resolve, reject) => {
            // 检查队列是否已满
            if (this.queuedTasks.length >= this.config.maxQueueSize) {
                reject(new Error(`任务队列已满（最多 ${this.config.maxQueueSize} 个任务排队），请稍后重试`));
                return;
            }
            // 创建任务
            const taskId = `task-${++this.taskIdCounter}-${Date.now()}`;
            const task = {
                id: taskId,
                fn,
                priority: options?.priority || 0,
                timeout: options?.timeout || this.config.defaultTimeout,
                createdAt: Date.now(),
                resolve,
                reject,
            };
            console.log(`📋 任务入队: ${taskId}，优先级: ${task.priority}`);
            // 添加到队列（按优先级排序）
            this.queuedTasks.push(task);
            this.queuedTasks.sort((a, b) => b.priority - a.priority); // 优先级高的在前
            // 尝试执行任务
            this.processQueue();
        });
    }
    /**
     * 处理队列中的任务
     */
    async processQueue() {
        // 如果没有可用的执行槽位，直接返回
        if (this.runningTasks.size >= this.config.maxConcurrent) {
            console.log(`⏸️ 已达到最大并发数 (${this.config.maxConcurrent})，等待任务完成...`);
            return;
        }
        // 如果队列为空，直接返回
        if (this.queuedTasks.length === 0) {
            return;
        }
        // 取出优先级最高的任务
        const task = this.queuedTasks.shift();
        this.runningTasks.set(task.id, task);
        task.startedAt = Date.now();
        const queueWaitTime = task.startedAt - task.createdAt;
        console.log(`▶️ 任务开始: ${task.id}`);
        console.log(`   - 排队时间: ${(queueWaitTime / 1000).toFixed(1)}秒`);
        console.log(`   - 当前并发: ${this.runningTasks.size}/${this.config.maxConcurrent}`);
        console.log(`   - 队列长度: ${this.queuedTasks.length}`);
        // 执行任务（带超时控制）
        try {
            const result = await this.executeWithTimeout(task);
            task.finishedAt = Date.now();
            const executionTime = task.finishedAt - task.startedAt;
            console.log(`✅ 任务完成: ${task.id}`);
            console.log(`   - 执行时间: ${(executionTime / 1000).toFixed(1)}秒`);
            task.resolve(result);
        }
        catch (error) {
            task.finishedAt = Date.now();
            console.error(`❌ 任务失败: ${task.id}`);
            console.error(`   - 错误信息: ${error.message}`);
            task.reject(error);
        }
        finally {
            // 移除已完成的任务
            this.runningTasks.delete(task.id);
            // 继续处理下一个任务
            this.processQueue();
        }
    }
    /**
     * 执行任务（带超时控制）
     */
    async executeWithTimeout(task) {
        return Promise.race([
            // 任务本身
            task.fn(),
            // 超时控制
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`任务超时（${task.timeout / 1000}秒）`));
                }, task.timeout);
            }),
        ]);
    }
    /**
     * 获取队列状态
     */
    getStatus() {
        return {
            running: this.runningTasks.size,
            queued: this.queuedTasks.length,
            maxConcurrent: this.config.maxConcurrent,
            maxQueueSize: this.config.maxQueueSize,
            runningTasks: Array.from(this.runningTasks.keys()),
            queuedTasks: this.queuedTasks.map(t => t.id),
        };
    }
    /**
     * 检查是否可以立即执行任务（无需排队）
     */
    canExecuteImmediately() {
        return this.runningTasks.size < this.config.maxConcurrent;
    }
    /**
     * 获取预估等待时间（秒）
     */
    getEstimatedWaitTime() {
        if (this.canExecuteImmediately()) {
            return 0;
        }
        // 简单估算：假设每个任务平均 15 分钟（900 秒）
        const averageTaskTime = 900;
        const tasksAhead = this.queuedTasks.length;
        const availableSlots = this.config.maxConcurrent;
        return Math.ceil((tasksAhead / availableSlots) * averageTaskTime);
    }
}
exports.PdfTaskQueue = PdfTaskQueue;
// 全局单例队列（根据服务器资源配置）
exports.globalPdfTaskQueue = new PdfTaskQueue({
    maxConcurrent: 2, // 最多 2 个并发（适用于 1.8GB RAM 服务器）
    maxQueueSize: 10, // 最多 10 个排队
    defaultTimeout: 3600000, // 1 小时超时
});
