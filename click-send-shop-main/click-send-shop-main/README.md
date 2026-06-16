# 大马通 - 马来西亚华人一站式生活服务与合规精选好物平台

基于 React + TypeScript + Vite + Tailwind CSS 构建的前端项目。

## 技术栈

- 框架：React 18 + TypeScript
- 构建工具：Vite
- 样式系统：Tailwind CSS + shadcn/ui
- 状态管理：Zustand
- 路由：React Router
- 数据请求：TanStack React Query
- 表单：React Hook Form + Zod

## 本地开发

```bash
npm install
npm run dev
```

## 打包构建

```bash
npm run build
npm run preview
```

## 交易重构相关前端入口

- 活动中心：`/promotions`
- 活动详情：`/promotions/:slug`
- 支付结果页：`/payment/result`
- 商品/购物车/结算金额以服务端 pricing service 和 promotion rule engine 返回为准。
- 物流弹窗展示后端 `logistics_snapshot` 和 `logistics_timeline`，前端不自行修改订单履约状态。

涉及活动、购物车、结算、支付结果、订单详情、后台报表或物流展示时，至少运行：

```bash
npm run typecheck
npm run build
```
