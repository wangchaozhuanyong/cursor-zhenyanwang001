export type AdminPermissionRow = { id: number; code: string; name: string; sort_order?: number };

export const PERMISSION_GROUP_LABELS: Record<string, string> = {
  dashboard: "仪表盘",
  report: "报表",
  order: "订单",
  user: "用户",
  member_level: "会员等级",
  product: "商品",
  inventory: "库存",
  category: "分类",
  tag: "标签",
  coupon: "优惠券",
  activity: "活动",
  return: "售后",
  notification: "通知",
  banner: "Banner",
  invite: "邀请",
  referral: "返现",
  points: "积分",
  payment: "支付",
  shipping: "物流",
  settings: "设置",
  content: "内容",
  home_ops: "首页运营",
  audit: "审计",
  admin_log: "操作日志",
  role: "角色权限",
  review: "评论",
  recycle_bin: "回收站",
  monitoring: "监控",
  data_cleanup: "数据清理",
  other: "其他",
};

export function permissionGroupKey(code: string) {
  if (code.startsWith("member_level.")) return "member_level";
  if (code.startsWith("home_ops.")) return "home_ops";
  if (code.startsWith("admin_log.")) return "admin_log";
  if (code.startsWith("recycle_bin.")) return "recycle_bin";
  if (code.startsWith("data_cleanup.")) return "data_cleanup";
  return code.split(".")[0] || "other";
}

export function groupAdminPermissions(perms: AdminPermissionRow[], keyword: string) {
  const q = keyword.trim().toLowerCase();
  const groups = new Map<string, AdminPermissionRow[]>();
  for (const perm of perms) {
    if (q && !`${perm.name} ${perm.code}`.toLowerCase().includes(q)) continue;
    const key = permissionGroupKey(perm.code);
    groups.set(key, [...(groups.get(key) || []), perm]);
  }
  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      label: PERMISSION_GROUP_LABELS[key] || key,
      items: items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "zh")),
    }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "zh"));
}
