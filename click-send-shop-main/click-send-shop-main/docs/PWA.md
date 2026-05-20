# PWA 接入说明（第一版）

## 1. 功能范围
- 支持安装到手机桌面（Android + iOS）
- 支持静态资源缓存
- 提供离线提示页（`/offline.html`）
- 提供新版本可用提示（用户手动刷新）

不包含：
- 离线下单
- 离线支付
- 推送通知
- 用户/订单/支付/后台数据离线缓存

## 2. 安装方式
- Android Chrome：首次访问后会出现“安装到桌面”提示，可点击安装。
- iOS Safari：点击浏览器“分享”按钮，再选择“添加到主屏幕”。

## 3. 缓存策略
会缓存：
- JS/CSS/Worker 静态资源（`StaleWhileRevalidate`）
- 公共图片资源（`/assets/`、`/uploads/` 等，`CacheFirst`）
- `offline.html`、manifest、favicon、PWA 图标
- 前台导航页面（`NetworkFirst`，失败回落离线页）

不会缓存（`NetworkOnly`）：
- `/api/admin/*`
- `/api/auth/*`
- `/api/user/*`
- `/api/orders/*`
- `/api/cart/*`
- `/api/checkout/*`
- `/api/payment/*`
- `/api/upload/*`
- `/admin/*` 导航页面

## 4. 如何测试
1. `npm run pwa:icons` 生成图标。
2. `npm run build` 构建。
3. `npm run verify:pwa` 校验构建产物。
4. `npm run preview` 启动预览。
5. 浏览器 DevTools > Application：
   - 检查 Manifest 可读且图标正常。
   - 检查 Service Worker 已注册。
   - 勾选 Offline，访问前台页面可看到离线页兜底。
   - 访问 `/admin` 和 `/api/*`，应走网络，不应被离线缓存命中。

## 5. 回滚方案
1. 回滚 `vite.config.ts` 中 `VitePWA(...)` 配置。
2. 删除新增组件接入：
   - `src/components/PwaInstallPrompt.tsx`
   - `src/components/PwaUpdateToast.tsx`
3. 删除 `manifest.webmanifest`、`offline.html`、PWA 图标。
4. 重新构建部署。

## 6. 清除旧 Service Worker
- 用户端：浏览器 DevTools > Application > Service Workers > Unregister，然后清理站点数据并强刷。
- 运维端：确保 `sw.js` 返回 `Cache-Control: no-cache`，避免旧 SW 长时间滞留。

## 7. iOS / Android 注意事项
- iOS 不支持 `beforeinstallprompt`，只能走“添加到主屏幕”引导。
- Android 通常支持原生安装提示。
- 新版本更新采用“提示后手动刷新”，避免下单过程被强刷打断。
