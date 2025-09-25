#!/usr/bin/env bash
set -euo pipefail

# 载入 nvm（安装 Node 用）
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

APP_DIR="/root/myproject/lyc2/api"
NODE_VERSION="18"

echo "==> 安装/启用 Node $NODE_VERSION"
nvm use --delete-prefix v$NODE_VERSION --silent || nvm install $NODE_VERSION
nvm alias default $NODE_VERSION

echo "==> 安装全局工具 pnpm/pm2"
npm -g install pnpm pm2

echo "==> 确认并进入 API 目录"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 如果没有 pm2 的配置就生成一个最小可用的
if [ ! -f ecosystem.config.js ]; then
cat > ecosystem.config.js <<'EOC'
module.exports = {
  apps: [
    {
      name: "super-scholar-api",
      script: "dist/index.js",
      cwd: "/root/myproject/lyc2/api",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
EOC
  echo "已生成默认的 ecosystem.config.js"
fi

echo "==> 配置 pm2 随机启动（systemd）"
pm2 startup systemd -u root --hp /root || true

echo "==> 版本确认："
echo -n "node: " && node -v
echo -n "pnpm: " && pnpm -v
echo -n "pm2: "  && pm2 -v

echo "==> bootstrap 完成 ✅"
echo "提示：首次上线请执行：pnpm install && pnpm approve-builds && pnpm build，然后 pm2 start ecosystem.config.js && pm2 save"
