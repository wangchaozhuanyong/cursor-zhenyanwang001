/**
 * PM2：生产环境进程守护（在 server/ 下启动）
 * 用法：npm i -g pm2 && cd server && pm2 start ecosystem.config.cjs --env production
 *
 * 进程名默认 gc-api，与 deploy/*.sh 一致。
 * 进程名覆盖示例：PM2_APP=自定义名 pm2 start ecosystem.config.cjs --env production
 *
 * 入口必须是 src/index.js（src/app.js 仅导出 Express app，不会 listen）。
 */
const appName = process.env.PM2_APP || 'gc-api';

module.exports = {
  apps: [
    {
      name: appName,
      cwd: __dirname,
      script: 'src/index.js',
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

      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,

      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
