# PWA 真机验收 — 自动化执行结果

**域名**：https://flashcast.com.my  
**时间**：2026-05-20T11:28:40.352Z  
**环境**：Playwright（清 SW + Android/iPhone 模拟 + 离线模拟）

**统计**：通过 20 · 失败 0 · 需真机/发版 11

| 段 | 项 | 结果 | 说明 |
|----|-----|:----:|------|
| A | A1 | ☑ | /manifest.webmanifest → 200 |
| A | A2 | ☑ | /sw.js → 200 |
| A | A3 | ☑ | /offline.html → 200 |
| A | A5 | ☑ | 首页无全站安装条 |
| A | A4 | ☑ | 最终 URL: https://flashcast.com.my/support-download?tab=download |
| B | B1 | ☑ | 客服下载页正常渲染 |
| B | B2 | ☑ | 有安装相关 UI |
| B | B3 | △ 待人工 | 需真机：系统安装确认框 Playwright 无法触发 |
| B | B4 | △ 待人工 | 需真机：桌面图标 |
| B | B5 | △ 待人工 | 需真机：standalone 启动 |
| B | B6 | ☑ | 捕获埋点: pwa_download_page_view, pwa_download_page_view |
| C | C1 | ☑ | 显示 iOS 教程 |
| C | C2 | △ 待人工 | 需真机：Safari 分享 → 添加到主屏幕 |
| C | C3 | △ 待人工 | 需真机：主屏幕启动 |
| C | C4 | ☑ | 捕获: pwa_ios_guide_shown, pwa_download_page_view |
| D | D1 | ☑ | 已在线访问首页与分类 |
| D | D2 | ☑ | 离线首页有缓存或离线提示 |
| D | D3 | ☑ | 购物车离线无内容（未展示伪造结算数据） |
| D | D4 | ☑ | 恢复网络后页面可加载 |
| D | D5 | △ 待人工 | 可选：DevTools Cache Storage 需人工 |
| E | E1 | △ 待人工 | 需二次发版：旧 SW 用户才出现更新 Toast |
| E | E2 | △ 待人工 | 需真机 + 发版对比 |
| E | E3 | △ 待人工 | 需二次发版 |
| E | E4 | △ 待人工 | 代码为 prompt 模式，需发版回归 |
| F | F1 | ☑ | 离线下不应出现可点击下单主流程 |
| F | F2 | ☑ | 离线无法完成真实支付（自动化未触发支付） |
| F | F3 | ☑ | 离线结算页 |
| F | F4 | ☑ | 后台离线无缓存管理页 |
| G | G1 | ☑ | 登录页可打开 |
| G | G2 | △ 待人工 | 加购→结算需登录账号，未自动化下单 |
| G | G3 | ☑ | 客服 Tab 有入口 |

## 结论

- 自动化可测项已通过；标 **△** 的项请用手机完成（Android 安装、iOS 主屏幕、更新 Toast 二次发版）。

```bash
PWA_ACCEPTANCE_URL=https://flashcast.com.my node scripts/pwa-device-acceptance.mjs
```