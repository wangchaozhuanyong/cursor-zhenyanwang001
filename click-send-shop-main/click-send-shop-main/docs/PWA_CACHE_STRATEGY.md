# PWA 缓存策略

## 原则
PWA 只缓存公开浏览内容，不缓存交易、支付、购物车、用户资料和后台管理数据。页面切换优先使用缓存内容减少白屏，同时后台刷新最新数据。

## NetworkOnly
以下请求和页面必须走网络：
- `/api/admin/*`
- `/api/auth/*`
- `/api/user/*`
- `/api/cart/*`
- `/api/orders/*`
- `/api/checkout/*`
- `/api/payment/*`
- `/api/upload/*`
- `/admin/*`
- `/cart`
- `/checkout`
- `/orders/*`
- `/profile`
- `/settings`
- `/address`
- `/coupons`
- `/notifications`
- `/returns`
- `/points`
- `/rewards`
- `/invite`

## StaleWhileRevalidate
以下公开 GET 数据先显示缓存，再后台更新：
- `/api/home/bootstrap`：首页、站点信息、客服下载配置，约 10 分钟
- `/api/categories*`：分类列表，约 30 分钟
- `/api/products`、`/api/products/home`、`/api/products/tags`：商品列表，约 5 分钟
- `/api/products/:id`、`/api/products/:id/related`：商品详情，约 10 分钟
- `/api/banners*`、`/api/content/*`：Banner、文章、政策页面，约 1 天

## CacheFirst
以下图片资源优先缓存：
- `/assets/*`
- `/uploads/*`
- 商品图片、Banner 图片、分类图片
- Logo、favicon、`/apple-touch-icon.png`、`/pwa-*.png`

最长缓存约 30 天。商品价格、库存和支付状态不以图片或公开缓存为准，交易时以后端实时校验为准。

## 前端内存缓存
当前前台核心数据使用 Zustand/manual fetch：
- 首页 bootstrap：约 5 分钟
- 商品列表：按筛选参数缓存约 5 分钟
- 商品详情：约 10 分钟
- 分类列表：约 30 分钟

有缓存数据时页面不显示全屏 loading，只显示局部刷新状态或保留旧内容。

## 失效与刷新
- 加入、删除、更新、清空购物车后刷新购物车数据。
- 提交订单后刷新订单列表。
- 返现钱包支付成功后刷新订单详情。
- 修改用户资料后刷新用户资料。
- 后台修改商品后，前台公开缓存最多 3-5 分钟内更新；交易流程仍以后端实时数据为准。

## 测试页面切换速度
1. 构建并预览生产包。
2. 首次打开首页、分类页、商品列表、商品详情和客服下载页。
3. 返回并再次进入同一页面，确认优先显示缓存内容，不出现整页白屏。
4. DevTools Network 查看公开 API 是否由 Service Worker runtime cache 命中，同时后台刷新。
