// ⚠️ 重要：所有敏感信息应该通过环境变量或 .env 文件配置，不要硬编码在这里！
// 在服务器上使用 PM2 时，通过 ecosystem.config.js 或系统环境变量传入

module.exports = {
  apps: [{
    name: 'lyc-ai-api',
    script: 'dist/index.js',
    cwd: '/root/api',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: '3001'
      // 以下环境变量应该在服务器上单独配置：
      // DATABASE_URL
      // JWT_SECRET
      // DEEPSEEK_API_KEY
      // TONGYI_API_KEY
      // OSS_ACCESS_KEY_ID
      // OSS_ACCESS_KEY_SECRET
      // OSS_BUCKET
      // OSS_REGION
    }
  }]
}
