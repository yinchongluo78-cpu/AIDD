module.exports = {
  apps: [
    {
      name: "super-scholar-api",
      script: "dist/index.js",
      cwd: "/root/myproject/lyc2/api",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
}
