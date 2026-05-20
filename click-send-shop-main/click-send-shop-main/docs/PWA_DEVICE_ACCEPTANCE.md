# PWA 真机验收打勾表

> 打印或复制到工单/飞书；每项测完打勾。环境：**HTTPS 生产域**（本地 `http://127.0.0.1` 无法测 iOS 安装与部分 Android 行为）。  
> 最近一次自动验收记录：[PWA_DEVICE_ACCEPTANCE_RESULT_AUTO.md](./PWA_DEVICE_ACCEPTANCE_RESULT_AUTO.md)（Playwright 清 SW + 模拟器，2026-05-20）。部署记录见 [PWA_DEVICE_ACCEPTANCE_RESULT_2026-05-20.md](./PWA_DEVICE_ACCEPTANCE_RESULT_2026-05-20.md)。  
> 复跑命令：`npm run acceptance:pwa-device`（环境变量 `PWA_ACCEPTANCE_URL` 可改域名）。

**测试人**：________　**日期**：________　**域名**：________　**构建版本 / Git**：________

---

## A. 部署与静态资源（可先 curl，再真机）

| # | 检查项 | 通过 |
|---|--------|:----:|
| A1 | `GET /manifest.webmanifest` → 200，`Content-Type: application/manifest+json` | ☐ |
| A2 | `GET /sw.js` → 200，`Cache-Control` 含 `no-cache` / `no-store` | ☐ |
| A3 | `GET /offline.html`、`/apple-touch-icon.png`、`/pwa-192x192.png`、`/pwa-512x512.png` → 200 | ☐ |
| A4 | 访问 `/install` → 跳转到 `/support-download?tab=download` | ☐ |
| A5 | 首页、个人中心、购物车、结算**无**全站安装条/弹窗 | ☐ |

---

## B. Android（Chrome，非微信内置浏览器）

| # | 检查项 | 通过 |
|---|--------|:----:|
| B1 | 打开 `/support-download?tab=download`，页面正常 | ☐ |
| B2 | 出现「一键安装到桌面」或「安装到电脑桌面」等安装引导 | ☐ |
| B3 | 点击安装 → 系统确认 → 安装成功 | ☐ |
| B4 | 桌面图标名称、图标样式正确 | ☐ |
| B5 | 从桌面启动 → 独立窗口（无浏览器地址栏） | ☐ |
| B6 | 后台/埋点可见：`pwa_download_page_view`、`pwa_install_button_shown`、`pwa_install_button_clicked`、`pwa_installed` | ☐ |

---

## C. iPhone（Safari，非微信/Chrome 内嵌）

| # | 检查项 | 通过 |
|---|--------|:----:|
| C1 | 打开 `/support-download?tab=download`，显示 Safari 添加主屏幕教程 | ☐ |
| C2 | 分享 →「添加到主屏幕」→ 添加成功 | ☐ |
| C3 | 主屏幕图标启动正常，全屏/无 Safari 底栏 | ☐ |
| C4 | 埋点可见：`pwa_ios_guide_shown`（若展示教程）、`pwa_open_standalone`（独立打开一次/会话） | ☐ |

---

## D. 缓存与弱网 / 离线

| # | 检查项 | 通过 |
|---|--------|:----:|
| D1 | **先在线**打开首页、分类各 1 次（让 SW 生效） | ☐ |
| D2 | 断网或飞行模式 → 再开首页：已缓存内容可浏览，或出现离线页文案 | ☐ |
| D3 | 离线时进入 **购物车 / 结算 / 订单 / 我的资料**：不显示伪造数据；提示需联网或网络错误 | ☐ |
| D4 | 恢复网络后刷新 → 数据与线上一致 | ☐ |
| D5 | （可选）Chrome DevTools → Application → Cache Storage：存在 public 类缓存；`/api/cart`、`/api/orders` 等敏感接口不走长期缓存 | ☐ |

---

## E. 版本更新 Toast

| # | 检查项 | 通过 |
|---|--------|:----:|
| E1 | 部署新版本后，旧 PWA 打开出现底部更新提示 | ☐ |
| E2 | Toast **不遮挡**底部导航、结算主按钮（含 iPhone 安全区） | ☐ |
| E3 | 点击「刷新」→ 页面更新；埋点 `pwa_update_accepted` | ☐ |
| E4 | 未点击前不会静默强制刷新整站 | ☐ |

---

## F. 商城红线（必过）

| # | 检查项 | 通过 |
|---|--------|:----:|
| F1 | **不能**离线下单 | ☐ |
| F2 | **不能**离线支付 | ☐ |
| F3 | 离线/弱网不展示过期的购物车数量、订单状态、余额等私密数据 | ☐ |
| F4 | `/admin` 后台在离线时不应被长期缓存页面顶替 | ☐ |

---

## G. 回归冒烟（建议同一轮完成）

| # | 检查项 | 通过 |
|---|--------|:----:|
| G1 | 登录 / 注册正常 | ☐ |
| G2 | 加购 → 结算 → 下单（或测试支付通道）正常 | ☐ |
| G3 | 客服/APP 页「客服」Tab 仍可联系客服（渠道卡片、复制/跳转） | ☐ |

---

## 验收结论

- [ ] **通过**，可发布 PWA 相关变更  
- [ ] **不通过**，阻塞项：____________________________________________

**备注**（机型、系统版本、浏览器版本、截图编号）：

---

## 附：快速命令（部署后）

```bash
# 将 YOUR_DOMAIN 换成生产域名
curl -I https://YOUR_DOMAIN/manifest.webmanifest
curl -I https://YOUR_DOMAIN/sw.js
curl -I https://YOUR_DOMAIN/offline.html
```

详细步骤见 [PWA_TEST_CHECKLIST.md](./PWA_TEST_CHECKLIST.md)、缓存说明见 [PWA_CACHE_STRATEGY.md](./PWA_CACHE_STRATEGY.md)。
