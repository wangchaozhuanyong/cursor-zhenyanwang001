# PWA 真机验收结果（2026-05-20）

**生产域名**：`https://damatong.net`  
**部署**：本地 `npm run build` → SCP → EC2 `/var/www/flashcast/dist`（`scripts/upload-frontend-dist-ec2.ps1`）  
**构建产物**：`assets/index-CeLglg88.js`，`rel="manifest" href="/manifest.webmanifest"`

---

## 部署后自动化验收（HTTPS）

| # | 检查项 | 结果 | 备注 |
|---|--------|:----:|------|
| A1 | manifest 200 + JSON | ☑ | `Content-Type: application/manifest+json` |
| A2 | sw.js 200 + no-cache | ☑ | `Cache-Control: no-cache, no-store, must-revalidate` |
| A3 | offline / 图标 | ☑ | `/offline.html` 200；图标路径可用 |
| A4 | `/install` → 客服/APP 安装 Tab | ☑* | SPA 客户端 `Navigate`；需浏览器执行路由（非 302） |
| A5 | 首页无全站安装条 | ☑ | 新 `index.html` 无「可安装到手机桌面」文案 |

---

## 本地集成测试（SSH 隧道 3307）

| 命令 | 结果 |
|------|------|
| `npm test` | 10/10 通过 |
| `npm run test:integration` | 9/9 通过 |

---

## 旧 Service Worker 清理（重要）

部署后若仍看到 **「当前离线」** 或旧首页安装条，是浏览器里 **旧 SW 缓存** 未更新，不是服务器未发布。

**用户 / 测试人操作**：

1. Chrome：设置 → 隐私 → 清除 `damatong.net` 站点数据；或 DevTools → Application → Service Workers → Unregister → 硬刷新。
2. 已安装的 PWA：卸载桌面图标后重新从客服/APP 页安装 Tab 安装。

自动化浏览器会话在部署后仍可能显示离线页，直至清 SW；curl/新 HTML 已确认为新版。

---

## B–G 真机（待人工打勾）

见 [PWA_DEVICE_ACCEPTANCE.md](./PWA_DEVICE_ACCEPTANCE.md) 表格 B–G。建议在清 SW 后于 Android Chrome / iPhone Safari 完成。

---

## 验收结论

- [x] **生产静态资源与 A 段** — 已通过自动化  
- [ ] **整包 PWA 验收通过** — B–G 真机 + 清 SW 后复测待完成

**执行人**：Cursor Agent  
**时间**：2026-05-20
