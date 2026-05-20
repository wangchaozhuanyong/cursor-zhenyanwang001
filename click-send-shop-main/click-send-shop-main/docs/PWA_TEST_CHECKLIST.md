# PWA 线上最终核验清单

## 1. 部署前确认（配置层）
- [ ] Nginx 已发布最新前端目录（含 `manifest.webmanifest`、`offline.html`、`sw.js`、`workbox-*.js`、`pwa-*.png`）。
- [ ] `sw.js` 返回 `Cache-Control: no-cache, no-store, must-revalidate`。
- [ ] `manifest.webmanifest` 返回 `Content-Type: application/manifest+json`。
- [ ] `manifest.webmanifest` 中 `icons.src` 与线上文件路径完全一致：
  - `/pwa-192x192.png`
  - `/pwa-512x512.png`
  - `/pwa-maskable-512x512.png`
- [ ] `/admin/*` 不走离线 fallback。
- [ ] `/api/*`（尤其敏感接口）不被 Service Worker 缓存。

## 2. 线上 curl 检查命令
把 `YOUR_DOMAIN` 替换为线上域名。

```bash
curl -I https://YOUR_DOMAIN/manifest.webmanifest
curl -I https://YOUR_DOMAIN/sw.js
curl -I https://YOUR_DOMAIN/offline.html
curl -I https://YOUR_DOMAIN/workbox-xxxxxxxx.js
curl -I https://YOUR_DOMAIN/pwa-192x192.png
curl -I https://YOUR_DOMAIN/pwa-512x512.png
curl -I https://YOUR_DOMAIN/pwa-maskable-512x512.png
```

重点检查：
- `manifest.webmanifest`：`Content-Type: application/manifest+json`
- `sw.js`：`Cache-Control: no-cache, no-store, must-revalidate`
- 其余文件返回 `200 OK`，无 404

## 3. Chrome DevTools 验证步骤（桌面）
1. 打开站点首页，按 `F12`，进入 `Application`。
2. `Manifest` 面板：
   - 无报错
   - 名称、图标、start_url 正常显示
3. `Service Workers` 面板：
   - 已注册
   - 作用域正确（通常为 `/`）
4. `Cache Storage` 面板：
   - 存在 PWA 相关缓存分组（静态资源缓存）
5. `Network` 面板配合 `Disable cache`、`Offline`：
   - 断网后已访问过首页可打开，或回退到 `offline.html`
   - `/admin` 导航不应被离线页面错误接管
   - `/api/*` 不应出现缓存命中（应走网络）

## 4. Android Chrome 安装步骤
1. 手机 Chrome 打开首页。
2. 等待地址栏/菜单出现“安装应用”或“添加到主屏幕”。
3. 点击安装并确认。
4. 返回桌面，确认图标、名称、启动正常。

## 5. iPhone Safari 添加到主屏幕步骤
1. 用 Safari 打开首页（不要用微信内置浏览器）。
2. 点击底部/顶部“分享”按钮。
3. 选择“添加到主屏幕”。
4. 确认图标和名称，点击“添加”。
5. 从主屏幕启动，确认可进入站点。

## 6. 断网测试步骤
1. 在线访问首页至少一次（让 SW 与静态资源缓存生效）。
2. DevTools 切换 `Offline`（或手机断网）。
3. 访问首页：
   - 已缓存页面可正常展示，或显示 `offline.html` 提示页。
4. 尝试进入订单/支付/后台：
   - 不应伪造历史数据，不应离线下单，不应离线支付。

## 7. 清除旧 Service Worker 方法
### 开发者本地（DevTools）
1. Application > Service Workers > `Unregister`
2. Application > Storage > `Clear site data`
3. 强制刷新（`Ctrl+Shift+R`）

### 用户侧引导（必要时）
- 提示用户关闭页面重开，或清理浏览器站点数据后重试。

## 8. PWA 回滚方法
1. 回滚 `vite.config.ts` 的 `VitePWA(...)` 配置。
2. 删除 PWA 入口组件接入（安装提示、更新提示）。
3. 删除 `manifest.webmanifest`、`offline.html`、`pwa-*.png`。
4. 重新构建部署。
5. 对线上用户执行一次 SW 清理指引（避免旧 SW 滞留）。

## 9. 风险红线（商城）
- 不做离线下单
- 不做离线支付
- 不缓存用户资料、订单详情、购物车、支付状态、后台管理数据
- 新版本仅提示刷新，不做强制静默刷新
