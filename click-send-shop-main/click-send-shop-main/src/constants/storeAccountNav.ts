export type StoreAccountNavItem = {
  label: string;
  path: string;
  requireAuth?: boolean;
  capability?: "points" | "invite";
};

export const STORE_ACCOUNT_NAV_ITEMS: StoreAccountNavItem[] = [
  { label: "个人概览", path: "/profile" },
  { label: "我的订单", path: "/orders", requireAuth: true },
  { label: "收货地址", path: "/address", requireAuth: true },
  { label: "我的优惠券", path: "/coupons", requireAuth: true },
  { label: "我的积分", path: "/points", requireAuth: true, capability: "points" },
  { label: "我的收藏", path: "/favorites" },
  { label: "浏览记录", path: "/history" },
  { label: "消息通知", path: "/notifications", requireAuth: true },
  { label: "意见反馈", path: "/feedback" },
  { label: "账户设置", path: "/settings", requireAuth: true },
];
