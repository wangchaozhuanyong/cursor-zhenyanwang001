/**
 * PM2：生产环境进程守护
 * 用法：npm i -g pm2 && cd server && pm2 start ecosystem.config.cjs --env production
 */
module.exports = {
  apps: [
    {
      name: 'click-send-shop-api',
      cwd: __dirname,
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
