import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bell,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  History,
  MessageSquare,
  Package,
  RotateCcw,
  Scale,
  Shield,
  ShoppingCart,
  Star,
  Ticket,
  UserCog,
  Users,
} from "lucide-react";

export type AdminEmptyGuide = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel?: string;
  primaryPath?: string;
  secondaryLabel?: string;
  secondaryPath?: string;
};

/** 将空状态引导文案按当前管理后台语言本地化（title/description 用于表格空态） */
export function localizeAdminEmptyGuide(
  guide: AdminEmptyGuide,
  tText: (zh: string) => string,
): AdminEmptyGuide {
  return {
    ...guide,
    title: tText(guide.title),
    description: tText(guide.description),
  };
}

export const ADMIN_EMPTY_GUIDES = {
  products: {
    icon: Package,
    title: "还没有商品",
    description: "上架第一件商品后，客户才能在首页和分类页看到并下单。建议先创建分类，再添加商品并设为上架状态。",
    primaryLabel: "新增商品",
    primaryPath: "/admin/products/new",
    secondaryLabel: "管理分类",
    secondaryPath: "/admin/categories",
  },
  productsFiltered: {
    icon: Package,
    title: "当前筛选无商品",
    description: "没有符合筛选条件的商品。可放宽状态/新品筛选，或清空筛选查看全部商品。",
  },
  orders: {
    icon: ShoppingCart,
    title: "暂无订单",
    description: "有客户下单后订单会出现在这里。若前台无法下单，请检查商品是否上架、支付方式与运费配置是否正常。",
    primaryLabel: "查看商品",
    primaryPath: "/admin/products",
    secondaryLabel: "支付渠道",
    secondaryPath: "/admin/payments/channels",
  },
  ordersFiltered: {
    icon: ShoppingCart,
    title: "无匹配订单",
    description: "没有符合当前筛选条件的订单。可尝试扩大日期范围、清空筛选，或从上方状态卡片快速筛选待处理订单。",
  },
  coupons: {
    icon: Ticket,
    title: "暂无礼券",
    description: "创建礼券后会按领取时间、人群和使用范围进入客户端领券中心；过期、作废或停止使用后客户端不再展示。",
    primaryLabel: "新建礼券",
    primaryPath: "/admin/marketing/coupons/new",
  },
  users: {
    icon: Users,
    title: "暂无用户",
    description: "客户注册后会出现在用户列表。可检查前台登录入口与注册流程是否可用。",
    primaryLabel: "站点设置",
    primaryPath: "/admin/settings/site",
  },
  usersFiltered: {
    icon: Users,
    title: "无匹配用户",
    description: "没有符合当前筛选条件的用户。可放宽标签/绑定/限制筛选，或清空筛选查看全部用户。",
  },
  activities: {
    icon: CalendarClock,
    title: "暂无活动",
    description: "创建秒杀、满减等活动后，可在前台营销位展示并提升转化。",
    primaryLabel: "新建活动",
    primaryPath: "/admin/marketing/activities/new",
    secondaryLabel: "新建礼券",
    secondaryPath: "/admin/marketing/coupons/new",
  },
  activitiesFiltered: {
    icon: CalendarClock,
    title: "无匹配活动",
    description: "没有符合当前筛选条件的活动。可切换上方状态标签，或清空筛选查看全部活动。",
  },
  notifications: {
    icon: Bell,
    title: "暂无通知",
    description: "系统会自动发送订单、物流等通知；也可通过「人工发布」向客户推送活动或公告。",
  },
  reviews: {
    icon: MessageSquare,
    title: "暂无评论",
    description: "客户购买并评价后评论会出现在这里。可检查商品是否开启评价、前台评价入口是否正常。",
    primaryLabel: "查看商品",
    primaryPath: "/admin/products",
  },
  reviewsFiltered: {
    icon: MessageSquare,
    title: "无匹配评论",
    description: "没有符合当前筛选条件的评论。可放宽星级/状态筛选，或清空筛选查看全部评论。",
  },
  inventorySkus: {
    icon: Package,
    title: "暂无 SKU 库存",
    description: "商品需配置规格并上架后才会出现在库存中心。缺货或低库存 SKU 会在此汇总展示。",
    primaryLabel: "管理商品",
    primaryPath: "/admin/products",
  },
  inventorySkusFiltered: {
    icon: Package,
    title: "无匹配 SKU",
    description: "没有符合筛选条件的库存记录。可清空关键词或库存状态筛选后重试。",
  },
  inventoryRecords: {
    icon: History,
    title: "暂无库存流水",
    description: "入库、出库、盘点或订单扣减后，变动记录会出现在此处，便于追溯。",
  },
  inventoryRecordsFiltered: {
    icon: History,
    title: "无匹配流水",
    description: "没有符合筛选条件的库存流水。可放宽变动类型或关键词筛选。",
  },
  paymentOrders: {
    icon: CreditCard,
    title: "暂无支付流水",
    description: "客户在线支付成功后记录会出现在这里。若订单长期待支付，请检查支付渠道配置与前台结账流程。",
    primaryLabel: "支付渠道",
    primaryPath: "/admin/payments/channels",
  },
  paymentOrdersFiltered: {
    icon: CreditCard,
    title: "无匹配支付单",
    description: "没有符合筛选条件的支付记录。可清空状态或关键词筛选后重试。",
  },
  paymentEvents: {
    icon: RotateCcw,
    title: "暂无支付事件",
    description: "支付网关回调与内部处理事件会记录在此，便于排查支付异常。",
    primaryLabel: "支付渠道",
    primaryPath: "/admin/payments/channels",
  },
  paymentEventsFiltered: {
    icon: RotateCcw,
    title: "无匹配事件",
    description: "没有符合筛选条件的支付事件。可清空网关或订单筛选后重试。",
  },
  paymentReconciliations: {
    icon: Scale,
    title: "暂无对账记录",
    description: "按日创建对账草稿后，可在此核对各渠道实收与差异。",
  },
  checkoutAbandonments: {
    icon: ShoppingCart,
    title: "暂无未完成结算",
    description: "客户进入结账但未完成支付时会产生记录，便于跟进流失订单。",
    primaryLabel: "查看订单",
    primaryPath: "/admin/orders",
  },
  checkoutAbandonmentsFiltered: {
    icon: ShoppingCart,
    title: "无匹配记录",
    description: "没有符合筛选条件的未完成结算。可扩大状态范围或清空筛选。",
  },
  couponRecords: {
    icon: ClipboardList,
    title: "暂无领券记录",
    description: "客户领取优惠券或使用后会在此展示。",
    primaryLabel: "礼券管理",
    primaryPath: "/admin/marketing/coupons",
  },
  couponRecordsFiltered: {
    icon: ClipboardList,
    title: "无匹配领券记录",
    description: "没有符合筛选条件的领券记录。可清空状态或搜索关键词。",
  },
  pointsRecords: {
    icon: Star,
    title: "暂无积分明细",
    description: "客户获得或消耗积分后会产生明细。可在积分规则中配置发放逻辑。",
    primaryLabel: "积分规则",
    primaryPath: "/admin/marketing/points",
  },
  pointsRecordsFiltered: {
    icon: Star,
    title: "无匹配积分明细",
    description: "没有符合筛选条件的积分记录。可清空类型或搜索关键词。",
  },
  invites: {
    icon: Users,
    title: "暂无邀请记录",
    description: "客户通过邀请码注册成功后，邀请关系会记录在此。",
    primaryLabel: "用户列表",
    primaryPath: "/admin/users",
  },
  invitesFiltered: {
    icon: Users,
    title: "无匹配邀请记录",
    description: "没有符合搜索条件的邀请记录。可清空关键词后查看全部。",
  },
  rewardRecords: {
    icon: RotateCcw,
    title: "暂无返现记录",
    description: "下级用户付款成功并满足返现规则后，记录会出现在此处。",
    primaryLabel: "返现规则",
    primaryPath: "/admin/marketing/rewards",
  },
  rewardRecordsFiltered: {
    icon: RotateCcw,
    title: "无匹配返现记录",
    description: "没有符合筛选条件的返现记录。可清空状态或搜索关键词。",
  },
  auditLogs: {
    icon: Shield,
    title: "暂无审计记录",
    description: "管理端操作（含失败）会记录在此，便于追溯与合规审计。",
  },
  auditLogsFiltered: {
    icon: Shield,
    title: "无匹配审计记录",
    description: "没有符合筛选条件的审计记录。可扩大日期范围或清空筛选。",
  },
  exportTasks: {
    icon: FileSpreadsheet,
    title: "暂无导出任务",
    description: "在上方选择报表类型与日期范围，创建导出任务后文件会出现在此列表供下载。",
  },
  adminAccounts: {
    icon: UserCog,
    title: "暂无管理员",
    description: "创建后台管理员账号后，可在此分配角色与重置密码。点击右上角「创建管理员」即可添加。",
  },
  adminAccountsFiltered: {
    icon: UserCog,
    title: "无匹配管理员",
    description: "没有符合搜索条件的管理员账号。可清空关键词查看全部。",
  },
  recycleBin: {
    icon: Archive,
    title: "回收站为空",
    description: "软删除的商品、分类、优惠券等会暂存在回收站，可恢复或彻底删除。",
  },
  recycleBinFiltered: {
    icon: Archive,
    title: "无匹配回收项",
    description: "当前类型筛选下没有回收站记录。可切换为「全部类型」或清空筛选。",
  },
  reportData: {
    icon: FileSpreadsheet,
    title: "暂无报表数据",
    description: "当前时间范围内没有统计数据。可调整上方时间范围或筛选条件后重新查询。",
    primaryLabel: "导出中心",
    primaryPath: "/admin/exports",
  },
  reportDataFiltered: {
    icon: FileSpreadsheet,
    title: "筛选无数据",
    description: "没有符合当前筛选条件的报表行。可放宽时间范围或清空筛选后重试。",
  },
} satisfies Record<string, AdminEmptyGuide>;
