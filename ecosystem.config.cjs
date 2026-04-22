/**
 * 项目根目录的 PM2 ecosystem（在 PROJECT_DIR 下启动）
 *
 * 用法：
 *   cd /var/www/click-send-shop
 *   pm2 start ecosystem.config.cjs --env production
 *
 * 与 server/ecosystem.config.cjs 等价；只是 cwd 设在仓库根，便于在面板/计划任务里直接 pm2 start。
 *
 * 入口必须是 server/src/index.js（server/src/app.js 仅导出 Express app，不会 listen）。
 */
const path = require('path');

const appName = process.env.PM2_APP || 'gc-api';
const projectDir = process.env.PROJECT_DIR || __dirname;

module.exports = {
  apps: [
    {
      name: appName,
      cwd: projectDir,
      script: path.join('server', 'src', 'index.js'),
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',

      restart_delay: 3000,
      min_uptime: '10s',
      max_restarts: 10,

      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
      },

      error_file: path.join(projectDir, 'logs', 'pm2-error.log'),
      out_file: path.join(projectDir, 'logs', 'pm2-out.log'),
      log_file: path.join(projectDir, 'logs', 'pm2-combined.log'),
      time: true,
      merge_logs: true,

      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
