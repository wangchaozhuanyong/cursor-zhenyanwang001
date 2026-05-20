# PWA 接入说明

## 功能范围
本项目只做商城浏览体验加速和桌面快捷入口，不做全站安装弹窗、不做推送通知、不做离线下单、不做离线支付。

PWA 安装入口集中在客服/APP 页面的「安装」Tab：`/support-download?tab=download`。`/install` 会跳转到该 Tab。底部导航默认进入 `?tab=support`（客服）。首页、个人中心和全站布局不提供全站安装弹窗。

## Manifest 与图标
`index.html` 使用根路径：
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`
- `<link rel="manifest" href="/manifest.webmanifest" />`

manifest 和 PWA 图标由后端动态生成，根路径会转发到 PWA 模块，不在前端 `dist` 中生成静态 manifest 或 `pwa-*.png`。

## 缓存策略
公开内容允许缓存，用于减少 App 页面切换时的白屏 loading：
- 首页配置、站点信息、客服/APP 配置：`StaleWhileRevalidate`
- Banner、分类列表：`StaleWhileRevalidate`
- 商品列表：`StaleWhileRevalidate`，最长约 5 分钟
- 商品详情：`StaleWhileRevalidate`，最长约 10 分钟
- 公告、文章、政策页面：`StaleWhileRevalidate`，最长约 1 天
- 商品图、Banner 图、分类图、Logo、PWA 图标：`CacheFirst`，最长约 30 天

以下内容仍为 `NetworkOnly`，不能被 Service Worker 长期缓存：
- `/api/admin/*`
- `/api/auth/*`
- `/api/user/*`
- `/api/cart/*`
- `/api/orders/*`
- `/api/checkout/*`
- `/api/payment/*`
- `/api/upload/*`
- `/admin/*`
- `/cart`、`/checkout`、`/orders`、`/profile` 等交易或用户页面导航

## 更新与离线
新版本只提示用户手动刷新，不强制刷新。离线时公开页面可显示缓存或 `/offline.html`，订单、支付、购物车、个人资料和后台管理需要联网。

## 测试
1. 运行 `npm run build`。
2. 运行 `npm run verify:pwa`。
3. 用 Chrome DevTools > Application 检查 Manifest、Service Worker 和 Cache Storage。
4. 打开首页、分类页、商品列表、商品详情、客服/APP 页两次，第二次应优先显示缓存内容并后台刷新。
5. Android Chrome 打开 `/support-download?tab=download`，检查“安装网页 App”按钮。
6. iPhone Safari 打开 `/support-download?tab=download`，检查“分享 -> 添加到主屏幕”教程。
7. 断网测试公开页面缓存和离线页，确认订单、支付、个人资料不会显示长期缓存数据。

## 清除旧 Service Worker
开发者本地：Application > Service Workers > Unregister，然后 Application > Storage > Clear site data，再强刷。

用户侧：提示用户关闭桌面 App/浏览器页面后重开；必要时清理浏览器站点数据。

## 回滚
1. 回滚 `vite.config.ts` 中 `VitePWA(...)` 配置。
2. 移除 `src/components/PwaUpdateToast.tsx` 接入。
3. 移除客服/APP 页 PWA 安装逻辑。
4. 重新构建部署，并引导用户清除旧 Service Worker 和缓存。
