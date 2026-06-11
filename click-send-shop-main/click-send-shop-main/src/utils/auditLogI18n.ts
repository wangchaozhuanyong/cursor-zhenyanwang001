import {
  getOrderStatusLabel,
  getPaymentStatusLabel,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  RETURN_STATUS_META,
} from "@/constants/statusDictionary";
import { translateApiErrorMessage } from "@/utils/apiErrorMessage";
import { DATA_CLEANUP_POLICY_LABELS } from "@/utils/dataRetentionLabels";
import {
  FRONTEND_CHUNK_LOAD_ERROR_MESSAGE,
  formatSystemErrorMessage,
  isFrontendChunkLoadErrorMessage,
} from "@/utils/systemErrorMessage";

type UnknownRecord = Record<string, unknown>;

const OBJECT_TYPE_ZH: Record<string, string> = {
  user: "用户",
  admin_user: "管理员",
  role: "角色",
  auth: "认证",
  site_settings: "站点设置",
  banner: "轮播图",
  product: "商品",
  product_tag: "商品标签",
  product_variant: "商品规格",
  product_review: "商品评价",
  category: "分类",
  coupon: "优惠券",
  order: "订单",
  return_request: "售后单",
  shipping_template: "运费模板",
  points_rule: "积分规则",
  referral_rule: "返现规则",
  content_page: "内容页",
  theme_skin: "主题皮肤",
  privacy_request: "隐私请求",
  payment: "支付单",
  payment_channel: "支付渠道",
  payment_event: "支付事件",
  payment_reconciliation: "支付对账",
  marketing_activity: "营销活动",
  coupon_campaign: "优惠券活动",
  member_level: "会员等级",
  user_tag: "用户标签",
  user_feedback: "用户反馈",
  upload: "上传",
  notification_batch: "通知批次",
  inventory: "库存",
  inventory_pack_rule: "组装拆包规则",
  inventory_conversion_order: "库存转换单",
  inventory_daily_snapshot: "库存每日快照",
  inventory_replenishment_profile: "智能补货配置",
  inventory_replenishment_run: "智能补货任务",
  loyalty_points_settings: "积分设置",
  loyalty_points_product_rule: "商品积分规则",
  operating_expense: "经营支出",
  data_cleanup: "数据清理",
  admin_api: "管理端 API",
  frontend_asset: "前端资源",
  admin_trusted_device: "管理员可信设备",
  rbac: "权限",
  export_task: "导出任务",
  export: "导出",
  backup: "备份",
};

const ACTION_ZH: Record<string, string> = {
  "admin.login": "管理员登录",
  "admin.logout": "管理员退出",
  "frontend.chunk_load_failed": "前端版本文件加载失败",
  "admin.create_user": "创建管理员",
  "admin.enable_user": "启用管理员",
  "admin.disable_user": "禁用管理员",
  "admin.reset_password": "重置管理员密码",
  "admin.delete_user": "删除管理员",
  "admin.rbac.set_roles": "设置用户角色",
  "rbac.create_role": "创建角色",
  "rbac.update_role": "更新角色",
  "rbac.delete_role": "删除角色",
  "settings.shipping_update": "更新运费设置",
  "settings.site_update": "更新站点设置",
  "settings.site_asset_upload": "上传站点图片",
  "settings.theme_update": "更新主题配置",
  "settings.theme_skins_update": "更新主题皮肤",
  "home_ops.module_settings_update": "更新首页模块开关",
  "inventory.adjust": "调整库存",
  "inventory.warning_update": "更新库存预警",
  "user.unbind_wechat": "解绑用户微信",
  "user.subordinate_toggle": "切换用户下级功能",
  "user.tags_update": "更新用户标签",
  "user.points_adjust": "调整用户积分",
  "user.reset_password": "重置用户密码",
  "user.data_export": "导出用户数据",
  "user.account_cancel": "用户注销账号",
  "user_tag.create": "创建用户标签",
  "user_tag.update": "更新用户标签",
  "user_tag.delete": "删除用户标签",
  "product.create": "创建商品",
  "product.update": "更新商品",
  "product.tags.update": "更新商品标签",
  "product.patch_status": "更新商品状态",
  "product.delete": "删除商品",
  "product.batch_status": "批量更新商品状态",
  "category.create": "创建分类",
  "category.update": "更新分类",
  "category.delete": "删除分类",
  "category.sort": "调整分类排序",
  "order.status_update": "更新订单状态",
  "order.ship": "订单发货",
  "order.create": "用户下单",
  "order.cancel": "用户取消订单",
  "order.confirm_receive": "用户确认收货",
  "return.create": "用户申请售后",
  "return.status_update": "更新售后状态",
  "return.approve": "批准售后",
  "return.reject": "拒绝售后",
  "coupon.create": "创建优惠券",
  "coupon.update": "更新优惠券",
  "coupon.delete": "删除优惠券",
  "coupon_campaign.create": "创建优惠券活动",
  "coupon_campaign.update": "更新优惠券活动",
  "coupon_campaign.delete": "删除优惠券活动",
  "banner.create": "创建 Banner",
  "banner.update": "更新 Banner",
  "banner.delete": "删除 Banner",
  "tag.create": "创建标签",
  "tag.update": "更新标签",
  "tag.delete": "删除标签",
  "shipping_template.create": "创建运费模板",
  "shipping_template.update": "更新运费模板",
  "shipping_template.delete": "删除运费模板",
  "points_rule.update": "更新积分规则",
  "referral_rule.update": "更新返现规则",
  "content.publish": "发布内容",
  "activity.create": "创建营销活动",
  "activity.update": "更新营销活动",
  "activity.disable": "禁用营销活动",
  "activity.enable": "启用营销活动",
  "activity.delete": "删除营销活动",
  "member_level.create": "创建会员等级",
  "member_level.update": "更新会员等级",
  "member_level.delete": "删除会员等级",
  "recycle_bin.restore": "从回收站恢复",
  "recycle_bin.permanent_delete": "彻底删除",
  "payment.channel_update": "更新支付渠道",
  "payment.order_mark_paid": "标记订单已支付",
  "payment.refund_record": "记录退款",
  "payment.event_replay": "重放支付事件",
  "payment.reconciliation_create": "创建对账记录",
  "upload.presign_ticket": "签发上传凭证",
  "upload.presign_complete": "完成预签名上传",
  "upload.media": "上传媒体文件",
  "upload.media_batch": "批量上传媒体",
  "notification.send": "发送通知",
  "notification.draft.create": "创建通知草稿",
  "notification.publish": "发布通知",
  "notification.trigger_settings.update": "更新通知触发设置",
  "notification.delete": "删除通知",
  "review.hide": "隐藏评价",
  "review.show": "显示评价",
  "review.reply": "回复评价",
  "review.delete": "删除评价",
  "review.restore": "恢复评价",
  "review.permanent_delete": "永久删除评价",
  "review.batch_hide": "批量隐藏评价",
  "review.batch_delete": "批量删除评价",
  "review.unfeature": "取消精选评价",
  "review.feature": "设为精选评价",
  "admin.mfa.challenge": "管理员多因素验证挑战",
  "admin.mfa.verify": "管理员多因素验证",
  "admin.mfa.reverify": "管理员多因素验证（再次确认）",
  "admin.security.require_mfa": "要求管理员启用多因素验证",
  "admin.security.disable_mfa_requirement": "关闭管理员多因素验证要求",
  "admin.security.enable_mfa_policy": "开启后台 MFA 强制保护",
  "admin.security.disable_mfa_policy": "关闭后台 MFA 强制保护",
  "admin.security.reset_mfa": "重置管理员多因素验证",
  "admin.security.revoke_trusted_devices": "撤销管理员全部可信设备",
  "admin.security.revoke_trusted_device": "撤销管理员单个可信设备",
  "data_cleanup.preview": "生成数据清理预览",
  "data_cleanup.run": "执行数据清理",
  "data_cleanup.run.cancel": "取消数据清理",
  "data_cleanup.policy.update": "更新数据清理策略",
  "data_cleanup.policy.reset_defaults": "重置数据清理策略默认值",
  "security.admin_gateway_block": "管理端网关安全拦截",
  "security.rbac_change": "权限配置变更",
  "security.payment_config_change": "支付配置变更",
  "security.refund_operation": "退款操作",
  "security.payment_manual_change": "手动改支付状态",
  "security.payment_event_replay": "支付事件重放",
  "security.site_settings_change": "站点设置变更",
  "security.notification_config_change": "通知配置变更",
  "security.theme_change": "主题配置变更",
  "security.inventory_change": "库存变更",
  "security.return_operation": "售后操作",
  "security.permanent_delete": "永久删除",
  "security.export_operation": "导出操作",
  "security.product_change": "商品变更",
  "security.user_points_change": "用户积分变更",
  "security.user_password_reset": "重置用户密码",
  "security.user_status_change": "用户状态变更",
  "security.data_export": "数据导出",
  "backup.full.create": "创建全量备份",
  "backup.restore.request": "申请备份恢复",
  "backup.restore.approve": "批准备份恢复",
  "backup.restore.switch": "执行备份生产切换",
  "order.batch_ship": "批量订单发货",
  "content.create": "创建内容",
  "settings.features_update": "更新功能开关",
  "settings.telegram_update": "更新 Telegram 配置",
  "points.settings.update": "更新积分设置",
  "points.product_rule.create": "创建商品积分规则",
  "points.product_rule.update": "更新商品积分规则",
  "points.product_rule.delete": "删除商品积分规则",
  "points.expire.run": "执行积分过期扣减",
  "feedback.update": "处理用户反馈",
  "operating_expense.create": "创建经营支出",
  "operating_expense.update": "更新经营支出",
  "operating_expense.delete": "删除经营支出",
  "inventory.smart_replenishment.preview": "生成智能补货预览",
  "inventory.smart_replenishment.apply": "应用智能补货建议",
  "inventory.smart_replenishment.create_purchase_order": "智能补货生成采购单",
  "inventory.smart_replenishment.execute_unpack": "智能补货执行拆包",
  "inventory.replenishment_profile.batch_upsert": "保存智能补货配置",
  "inventory.daily_snapshot.generate": "生成库存每日快照",
  "inventory.warning_batch_update": "批量更新库存预警",
  "inventory.conversion.unpack": "手动拆包",
  "inventory.conversion.assemble": "手动组装",
  "inventory.pack_rule.create": "创建组装拆包规则",
  "inventory.pack_rule.update": "更新组装拆包规则",
  "inventory.pack_rule.delete": "删除组装拆包规则",
  "notification.trigger.test_send": "测试通知触发",
  "notification.cancel": "取消通知",
  "notification.revoke": "撤回通知",
  "review.approve": "通过评价",
  "review.reject": "驳回评价",
  "review.complaint_update": "更新评价投诉",
  "member_level.recalc_user": "重算用户会员等级",
  "member_level.recalc_all": "全量重算会员等级",
  "member_level.assign_user": "手动指定会员等级",
  "member_level.unlock_user": "解除会员等级锁定",
  "telegram_escalation_failed": "Telegram 告警升级失败",
};

const MODULE_ZH: Record<string, string> = {
  admin: "管理",
  settings: "设置",
  user: "用户",
  product: "商品",
  order: "订单",
  return: "售后",
  payment: "支付",
  upload: "上传",
  inventory: "库存",
  activity: "活动",
  review: "评价",
  notification: "通知",
  content: "内容",
  feedback: "反馈",
  home_ops: "首页运营",
  recycle_bin: "回收站",
  member_level: "会员等级",
  rbac: "权限",
  "admin-users": "管理员账号",
  admin_users: "管理员账号",
  security: "安全",
  data_cleanup: "数据清理",
  backup: "备份",
  mfa: "多因素验证",
  points: "积分",
  telegram: "Telegram",
  content: "内容",
};

const TOKEN_ZH: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
  enable: "启用",
  disable: "禁用",
  login: "登录",
  logout: "退出",
  adjust: "调整",
  publish: "发布",
  send: "发送",
  restore: "恢复",
  ship: "发货",
  cancel: "取消",
  approve: "批准",
  reject: "拒绝",
  hide: "隐藏",
  show: "显示",
  feature: "精选",
  unfeature: "取消精选",
  batch: "批量",
  permanent: "永久",
  status: "状态",
  settings: "设置",
  module: "模块",
  skins: "皮肤",
  theme: "主题",
  wechat: "微信",
  points: "积分",
  password: "密码",
  tags: "标签",
  warning: "预警",
  ticket: "凭证",
  complete: "完成",
  presign: "预签名",
  media: "媒体",
  channel: "渠道",
  refund: "退款",
  replay: "重放",
  reconciliation: "对账",
  mark: "标记",
  paid: "已付",
  record: "记录",
  draft: "草稿",
  trigger: "触发",
  receive: "收货",
  export: "导出",
  account: "账号",
  unbind: "解绑",
  data: "数据",
  patch: "变更",
  sort: "排序",
  template: "模板",
  shipping: "运费",
  site: "站点",
  asset: "资源",
  ops: "运营",
  rule: "规则",
  referral: "返现",
  level: "等级",
  bin: "回收站",
  mfa: "多因素验证",
  MFA: "多因素验证",
  require: "要求",
  requirement: "要求",
  trusted: "可信",
  devices: "设备",
  device: "设备",
  security: "安全",
  challenge: "挑战",
  verify: "验证",
  reverify: "重新验证",
  gateway: "网关",
  block: "拦截",
  cleanup: "清理",
  preview: "预览",
  run: "执行",
  defaults: "默认值",
  reset_defaults: "重置默认值",
  policy: "策略",
  pack: "组装",
  recalc: "重算",
  assign: "指定",
  unlock: "解锁",
  complaint: "投诉",
  features: "功能开关",
  test_send: "测试发送",
  revoke: "撤回",
  batch_ship: "批量发货",
  full: "全量",
  restore: "恢复",
  request: "申请",
  approve: "批准",
  escalation: "升级",
  failed: "失败",
  manual_change: "手动变更",
  config_change: "配置变更",
  operation: "操作",
  export_operation: "导出",
  password_reset: "重置密码",
  status_change: "状态变更",
  points_change: "积分变更",
  permanent_delete: "永久删除",
  product_change: "商品变更",
  return_operation: "售后操作",
  inventory_change: "库存变更",
  theme_change: "主题变更",
  notification_config_change: "通知配置",
  site_settings_change: "站点设置",
  payment_config_change: "支付配置",
  payment_manual_change: "支付手动操作",
  payment_event_replay: "支付事件重放",
  rbac_change: "权限变更",
  admin_gateway_block: "网关拦截",
  trigger: "触发",
  test: "测试",
  send: "发送",
  api: "API",
  smart: "智能",
  replenishment: "补货",
  profile: "配置",
  purchase: "采购",
  order: "订单",
  daily: "每日",
  snapshot: "快照",
  conversion: "转换",
  assemble: "组装",
  unpack: "拆包",
  operating: "经营",
  expense: "支出",
};

const FIELD_ZH: Record<string, string> = {
  id: "ID",
  name: "名称",
  title: "标题",
  slug: "别名",
  status: "状态",
  price: "价格",
  stock: "库存",
  sort_order: "排序",
  category_id: "分类",
  image: "图片",
  cover_image: "封面图",
  video_url: "视频",
  shipping_fee: "运费",
  shipping_name: "配送方式",
  discount_amount: "优惠金额",
  total_amount: "应付金额",
  points: "积分",
  errorMessage: "错误信息",
  error_message: "错误信息",
  code: "编码",
  phone: "手机号",
  nickname: "昵称",
  role: "角色",
  disabled: "已禁用",
  enabled: "已启用",
  description: "描述",
  content: "内容",
  type: "类型",
  value: "面值",
  min_amount: "最低消费",
  scope_type: "适用范围",
  category_ids: "分类 ID",
  admin_remark: "管理员备注",
  refund_amount: "退款金额",
  order_no: "订单号",
  order_id: "订单 ID",
  permissionIds: "权限 ID",
  logoUrl: "Logo",
  faviconUrl: "网站图标",
  home_module_settings: "首页模块开关",
  refresh_token_version: "刷新令牌版本",
};

const ROLE_ZH: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  user: "用户",
  guest: "访客",
};

const STATUS_VALUE_ZH: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ORDER_STATUS_META).map(([k, v]) => [k, v.label])),
  ...Object.fromEntries(Object.entries(PAYMENT_STATUS_META).map(([k, v]) => [k, v.label])),
  ...Object.fromEntries(Object.entries(RETURN_STATUS_META).map(([k, v]) => [k, v.label])),
  active: "上架",
  inactive: "下架",
  draft: "草稿",
  published: "已发布",
  hidden: "已隐藏",
  success: "成功",
  failure: "失败",
  true: "是",
  false: "否",
};

const SUMMARY_EXACT_ZH: Record<string, string> = {
  "管理员登录成功": "管理员登录成功",
  "管理员登录失败": "管理员登录失败",
  "管理员退出登录": "管理员退出登录",
  "更新运费设置": "更新运费设置",
  "更新站点基础设置": "更新站点设置",
  "站点设置更新失败": "站点设置更新失败",
  "更新商城主题配置": "更新商城主题配置",
  "更新皮肤列表与当前皮肤": "更新主题皮肤列表",
  "更新首页模块开关": "更新首页模块开关",
  "更新支付渠道": "更新支付渠道",
  "积分调整失败": "积分调整失败",
  "重置密码失败": "重置密码失败",
  "商品更新失败": "商品更新失败",
  "创建商品失败": "创建商品失败",
  "删除商品失败": "删除商品失败",
  "订单状态更新失败": "订单状态更新失败",
  "订单发货失败": "订单发货失败",
  "用户下单失败": "用户下单失败",
  "用户取消订单失败": "用户取消订单失败",
  "用户确认收货失败": "用户确认收货失败",
  "用户申请售后失败": "用户申请售后失败",
  "签发预签名上传凭证": "签发预签名上传凭证",
  "签发预签名上传凭证失败": "签发预签名上传凭证失败",
  "预签名上传完成并发布": "预签名上传完成",
  "预签名上传完成失败": "预签名上传完成失败",
  "售后状态更新被拦截": "售后状态更新被拦截",
  "售后批准失败": "售后批准失败",
  "重复/非法批准被拦截": "重复或非法批准被拦截",
  "售后批准异常": "售后批准异常",
  "售后拒绝失败": "售后拒绝失败",
  "重复/非法拒绝被拦截": "重复或非法拒绝被拦截",
  "售后已拒绝": "售后已拒绝",
  "记录退款失败": "记录退款失败",
  "管理员触发事件重放（记录审计，业务幂等由网关保证）": "触发支付事件重放",
  "Admin login success": "管理员登录成功",
  "Admin login failed": "管理员登录失败",
  "Admin logout": "管理员退出登录",
  "Admin marked order paid": "管理员标记订单已支付",
  "Record refund failed": "记录退款失败",
  "Admin replay event (audit only)": "管理员触发支付事件重放（仅审计）",
  "Order status update failed": "订单状态更新失败",
  "Update home module settings": "更新首页模块开关",
  "User exported account data": "用户导出账号数据",
  "User account cancellation failed": "用户注销账号失败",
  "User account canceled and anonymized": "用户注销账号并完成匿名化",
  "Create presigned upload ticket": "签发预签名上传凭证",
  "Create presigned upload ticket failed": "签发预签名上传凭证失败",
  "Complete presigned upload": "预签名上传完成并发布",
  "Complete presigned upload failed": "预签名上传完成失败",
  "admin login success": "管理员登录成功",
  "admin login failure": "管理员登录失败",
  "admin logout": "管理员退出登录",
  "admin MFA verified": "管理员 MFA 验证成功",
  "admin MFA setup required": "需配置管理员 MFA",
  "admin MFA login required": "需完成管理员 MFA 验证",
  "admin MFA verify failed": "管理员 MFA 验证失败",
  "admin MFA reverify failed": "管理员 MFA 重新验证失败",
  "admin MFA reverify success": "管理员 MFA 重新验证成功",
  "restore job approved after MFA": "MFA 验证后批准备份恢复",
  "manual full backup requested": "手动创建全量备份",
  "pre-cleanup full backup requested": "数据清理前创建全量备份",
  "manual config backup requested": "手动创建配置备份",
  "manual uploads backup requested": "手动创建上传文件备份",
  "production database switch requested": "申请切换生产数据库备份",
  "admin passkey registered": "管理员注册通行密钥",
};

const ERROR_MSG_ZH: Record<string, string> = {
  "密码错误": "密码错误",
  "该账号无管理员权限": "该账号无管理员权限",
  "手机号或密码错误": "手机号或密码错误",
  "用户不存在": "用户不存在",
  "无管理员权限": "无管理员权限",
  "登录已过期，请重新登录": "登录已过期，请重新登录",
  "请先登录": "请先登录",
  "售后单不存在": "售后单不存在",
  Unauthorized: "未授权",
  Forbidden: "无权限",
  "Not Found": "资源不存在",
  "Bad Request": "请求参数错误",
  "Permission denied": "没有操作权限",
  "Please login first": "请先登录",
  "Failed to create upload ticket": "创建上传凭证失败",
  "Failed to complete upload": "完成上传失败",
};

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function isPlainObject(v: unknown): v is UnknownRecord {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function humanizeToken(token: string) {
  const key = token.toLowerCase().replace(/-/g, "_");
  return TOKEN_ZH[key] || TOKEN_ZH[token] || null;
}

function humanizeActionFallback(raw: string) {
  const parts = raw.split(".");
  if (parts.length === 1) {
    return parts.map((p) => humanizeToken(p) || p).join("");
  }
  const mod = MODULE_ZH[parts[0]] || OBJECT_TYPE_ZH[parts[0]] || humanizeToken(parts[0]) || parts[0];
  const rest = parts.slice(1).join("_");
  const restKey = rest.replace(/-/g, "_");
  const restParts = restKey.split("_").map((t) => humanizeToken(t) || t);
  const allZh = restParts.every((p) => /^[\u4e00-\u9fff]+$/.test(p));
  const restPhrase = restParts.join(allZh ? "" : " · ");
  if (restPhrase) return `${mod} · ${restPhrase}`;
  return raw;
}

export function zhObjectType(objectType?: string) {
  const raw = String(objectType || "").trim();
  if (!raw) return "—";
  if (OBJECT_TYPE_ZH[raw]) return OBJECT_TYPE_ZH[raw];
  const norm = raw.replace(/-/g, "_");
  if (OBJECT_TYPE_ZH[norm]) return OBJECT_TYPE_ZH[norm];
  const humanized = norm
    .split("_")
    .map((t) => TOKEN_ZH[t] || t)
    .join("");
  return humanized || raw;
}

export function zhActionType(actionType?: string) {
  const raw = String(actionType || "").trim();
  if (!raw) return "—";
  if (ACTION_ZH[raw]) return ACTION_ZH[raw];
  const normalized = raw.replace(/-/g, "_");
  if (ACTION_ZH[normalized]) return ACTION_ZH[normalized];
  return humanizeActionFallback(raw);
}

export function zhOperatorRole(role?: string) {
  const raw = String(role || "").trim();
  if (!raw) return "";
  return ROLE_ZH[raw] || ROLE_ZH[raw.toLowerCase()] || raw;
}

export function zhAuditResult(result?: string) {
  if (result === "success") return "成功";
  if (result === "failure") return "失败";
  return result || "—";
}

export function zhFieldName(key: string) {
  return FIELD_ZH[key] || FIELD_ZH[key.toLowerCase()] || key.replace(/_/g, " ");
}

function translateStatusToken(token: string) {
  const t = token.trim().toLowerCase();
  if (!t) return token;
  if (STATUS_VALUE_ZH[t]) return STATUS_VALUE_ZH[t];
  const orderLabel = getOrderStatusLabel(t);
  if (orderLabel !== "未知状态") return orderLabel;
  const payLabel = getPaymentStatusLabel(t);
  if (payLabel !== "未知支付状态") return payLabel;
  return token;
}

function isAuditIdLike(value: string) {
  const s = String(value || "").trim();
  if (!s) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  if (/^[0-9a-f]{16,}$/i.test(s)) return true;
  if (/^[a-z0-9_-]{20,}$/i.test(s) && /\d/i.test(s)) return true;
  return false;
}

function zhAuditIdLabel(id: string, label = "对象") {
  const short = shortAuditId(id);
  return short ? `${label}尾号 ${short}` : label;
}

function compactAuditIdentifiers(text: string) {
  let out = text;
  out = out.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    (m) => zhAuditIdLabel(m),
  );
  out = out.replace(/\b[0-9a-f]{24,64}\b/gi, (m) => zhAuditIdLabel(m));
  return out;
}

/** 将摘要中的英文状态码替换为中文（如 pending->paid） */
export function zhAuditSummary(summary?: string) {
  const raw = String(summary || "").trim();
  if (!raw) return "—";
  if (isFrontendChunkLoadErrorMessage(raw)) return FRONTEND_CHUNK_LOAD_ERROR_MESSAGE;
  if (SUMMARY_EXACT_ZH[raw]) return SUMMARY_EXACT_ZH[raw];

  const reviewPatterns: Array<{ test: RegExp; format: (m: RegExpMatchArray) => string }> = [
    { test: /^Toggle review visibility (.+) -> (.+)$/i, format: (m) => `切换评价 ${m[1]} 展示状态为 ${m[2]}` },
    { test: /^Approve review (.+)$/i, format: (m) => `通过评价 ${m[1]}` },
    { test: /^Reject review (.+)$/i, format: (m) => `驳回评价 ${m[1]}` },
    { test: /^Reply to review (.+)$/i, format: (m) => `回复评价 ${m[1]}` },
    { test: /^Soft delete review (.+)$/i, format: (m) => `软删除评价 ${m[1]}` },
    { test: /^Restore review (.+)$/i, format: (m) => `恢复评价 ${m[1]}` },
    { test: /^Permanently delete review (.+)$/i, format: (m) => `永久删除评价 ${m[1]}` },
    { test: /^Batch hide (\d+) reviews$/i, format: (m) => `批量隐藏 ${m[1]} 条评价` },
    { test: /^Batch delete (\d+) reviews$/i, format: (m) => `批量删除 ${m[1]} 条评价` },
    { test: /^(Unfeature|Feature) review (.+)$/i, format: (m) => `${m[1] === 'Unfeature' ? '取消精选' : '设为精选'}评价 ${m[2]}` },
    { test: /^Update complaint status (.+)$/i, format: (m) => `更新评价 ${m[1]} 投诉状态` },
    { test: /^Adjusted category sort for (\d+) items$/i, format: (m) => `调整 ${m[1]} 个分类排序` },
    { test: /^Batch (.+) (\d+) products$/i, format: (m) => `批量${m[1]} ${m[2]} 个商品` },
  ];
  for (const { test, format } of reviewPatterns) {
    const match = raw.match(test);
    if (match) return format(match);
  }

  const securityPatterns: Array<{ test: RegExp; format: (m: RegExpMatchArray) => string }> = [
    {
      test: /^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s+(allowed|failed)$/i,
      format: (m) => {
        const method = zhHttpMethod(m[1]);
        const pathLabel = zhAdminApiPath(m[2]);
        const ok = m[3].toLowerCase() === "allowed";
        return `${method}${pathLabel}（${ok ? "成功" : "失败"}）`;
      },
    },
    {
      test: /^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s+已执行$/i,
      format: (m) => `${zhHttpMethod(m[1])}${zhAdminApiPath(m[2])}（已执行）`,
    },
    { test: /^Admin API security block:\s*(.+)$/i, format: (m) => `管理端 API 安全拦截：${zhGatewayBlockReason(m[1])}` },
    { test: /^要求管理员 MFA userId=(.+)$/i, format: (m) => `要求管理员启用多因素验证（账号 ${shortAuditId(m[1])}）` },
    { test: /^关闭管理员 MFA userId=(.+)$/i, format: (m) => `关闭管理员多因素验证要求（账号 ${shortAuditId(m[1])}）` },
    { test: /^重置管理员 MFA userId=(.+)$/i, format: (m) => `重置管理员多因素验证（账号 ${shortAuditId(m[1])}）` },
    {
      test: /^撤销管理员可信设备 userId=(.+?)(?:\s+deviceId=(.+))?$/i,
      format: (m) =>
        m[2]
          ? `撤销管理员可信设备（账号 ${shortAuditId(m[1])}，设备 ${shortAuditId(m[2])}）`
          : `撤销管理员全部可信设备（账号 ${shortAuditId(m[1])}）`,
    },
    { test: /^PUT \/rbac\/admin-users\/([^/]+)\s+allowed$/i, format: (m) => `更新管理员账号 ${shortAuditId(m[1])}（成功）` },
    { test: /^PUT \/rbac\/admin-users\/([^/]+)\s+failed$/i, format: (m) => `更新管理员账号 ${shortAuditId(m[1])}（失败）` },
  ];
  for (const { test, format } of securityPatterns) {
    const match = raw.match(test);
    if (match) return format(match);
  }

  const cleanupPatterns: Array<{ test: RegExp; format: (m: RegExpMatchArray) => string }> = [
    { test: /^执行数据清理 #(\d+):\s*(\w+)$/i, format: (m) => `执行数据清理 #${m[1]}：${zhAuditResult(m[2].toLowerCase())}` },
    { test: /^生成清理预览 #(\d+)$/i, format: (m) => `生成清理预览 #${m[1]}` },
    { test: /^请求取消数据清理 #(\d+)$/i, format: (m) => `请求取消数据清理 #${m[1]}` },
    {
      test: /^更新清理策略 (.+)$/i,
      format: (m) => `更新清理策略 ${DATA_CLEANUP_POLICY_LABELS[m[1].trim()] || m[1]}`,
    },
    { test: /^执行数据清理失败$/i, format: () => "执行数据清理失败" },
  ];
  for (const { test, format } of cleanupPatterns) {
    const match = raw.match(test);
    if (match) return format(match);
  }

  const businessPatterns: Array<{ test: RegExp; format: (m: RegExpMatchArray) => string }> = [
    {
      test: /^(创建|更新|删除)(分类|商品|优惠券活动|优惠券|会员等级|用户标签|经营支出|商品积分规则|组装拆包规则)\s+(.+)$/i,
      format: (m) => {
        const target = m[3].trim();
        return isAuditIdLike(target)
          ? `${m[1]}${m[2]}（${zhAuditIdLabel(target)}）`
          : `${m[1]}${m[2]} ${compactAuditIdentifiers(target)}`;
      },
    },
    {
      test: /^更新SKU库存预警阈值\s+(.+)$/i,
      format: (m) => `更新 SKU 库存预警阈值（${zhAuditIdLabel(m[1])}）`,
    },
    {
      test: /^批量更新 SKU 预警阈值\s+(\d+)\s+个$/i,
      format: (m) => `批量更新 SKU 预警阈值 ${m[1]} 个`,
    },
    {
      test: /^用户上传\s+(.+)$/i,
      format: (m) => {
        const target = m[1].trim();
        return isAuditIdLike(target) ? `用户上传文件（${zhAuditIdLabel(target)}）` : `用户上传文件 ${compactAuditIdentifiers(target)}`;
      },
    },
    {
      test: /^上传站点品牌图片\s+(.+)$/i,
      format: (m) => `上传站点品牌图片 ${compactAuditIdentifiers(m[1])}`,
    },
    {
      test: /^Save replenishment profiles\s+(\d+)$/i,
      format: (m) => `保存智能补货配置 ${m[1]} 项`,
    },
    {
      test: /^Generate inventory daily snapshot\s+(.+)$/i,
      format: (m) => `生成库存每日快照 ${m[1]}`,
    },
    {
      test: /^restore job requested:\s*(.+)$/i,
      format: (m) => `申请备份恢复：${m[1] === "database" ? "数据库" : m[1] === "uploads" ? "上传文件" : m[1]}`,
    },
    {
      test: /^admin MFA satisfied by\s+(.+)$/i,
      format: (m) => `管理员 MFA 验证通过（方式：${m[1] === "none" ? "未记录" : m[1]}）`,
    },
    {
      test: /^admin MFA step-up success actionClass=(.+)$/i,
      format: (m) => `管理员敏感操作二次验证通过（${m[1]}）`,
    },
  ];
  for (const { test, format } of businessPatterns) {
    const match = raw.match(test);
    if (match) return format(match);
  }

  let out = raw;
  // 订单状态 pending -> paid 或 pending->paid
  out = out.replace(
    /\b([a-z][a-z0-9_]*)\s*(->|→)\s*([a-z][a-z0-9_]*)\b/gi,
    (_, a, arrow, b) => `${translateStatusToken(a)} ${arrow} ${translateStatusToken(b)}`,
  );
  // 孤立状态词（前后有空格或标点）
  out = out.replace(/\b(pending|paid|shipped|completed|cancelled|refunding|refunded|approved|rejected|processing|partially_refunded|failed)\b/gi, (m) => {
    const zh = STATUS_VALUE_ZH[m.toLowerCase()];
    return zh || m;
  });

  return compactAuditIdentifiers(out);
}

export function zhAuditErrorMessage(msg?: string) {
  const raw = String(msg || "").trim();
  if (!raw) return "";
  const localized = formatSystemErrorMessage(raw, "");
  if (localized && localized !== "-") return localized;
  const fromApi = translateApiErrorMessage(raw);
  if (fromApi) return fromApi;
  if (ERROR_MSG_ZH[raw]) return ERROR_MSG_ZH[raw];
  if (/^Invalid/i.test(raw)) return `参数无效：${raw.replace(/^Invalid\s*/i, "")}`;
  if (/^Cannot/i.test(raw)) return `无法执行：${raw.replace(/^Cannot\s*/i, "")}`;
  return raw;
}

export function formatAuditValue(v: unknown, fieldKey?: string) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "是" : "否";
  if (typeof v === "number") {
    if (fieldKey === "total_amount" || fieldKey === "amount" || fieldKey === "refund_amount") {
      return `RM ${v.toFixed(2)}`;
    }
    return String(v);
  }
  if (typeof v === "string") {
    if (!v) return "—";
    if (fieldKey === "status" || fieldKey?.endsWith("_status")) {
      const zh = STATUS_VALUE_ZH[v] || getOrderStatusLabel(v);
      if (zh && zh !== "未知状态") return zh;
      const pay = getPaymentStatusLabel(v);
      if (pay && pay !== "未知支付状态") return pay;
    }
    if (STATUS_VALUE_ZH[v]) return STATUS_VALUE_ZH[v];
    return v;
  }
  if (Array.isArray(v)) return `列表（${v.length} 项）`;
  if (isPlainObject(v)) {
    if ("_truncated" in v) return "（数据过长已截断）";
    return `对象（${Object.keys(v).length} 个字段）`;
  }
  return safeStringify(v);
}

function toDisplayValue(v: unknown, fieldKey?: string) {
  return formatAuditValue(v, fieldKey);
}

export type AuditSnapshotRow = { label: string; value: string };

const REQUEST_PATH_ZH: Record<string, string> = {
  "/api/orders": "订单",
  "/api/auth/login": "登录",
  "/api/auth/logout": "退出登录",
  "/api/admin/auth/login": "管理员登录",
  "/api/cart": "购物车",
  "/api/checkout": "结账",
  "/api/returns": "售后",
  "/api/upload/presign": "上传凭证",
};

/** 管理端 API 路径（adminSecurityAudit 写入的 req.path） */
const ADMIN_API_PATH_RULES: Array<{ pattern: RegExp; label: string | ((m: RegExpMatchArray) => string) }> = [
  { pattern: /^\/telegram\/settings\/?$/, label: "Telegram 通知配置" },
  { pattern: /^\/settings\/shipping\/?$/, label: "运费设置" },
  { pattern: /^\/settings\/assets\/faviconUrl\/?$/, label: "网站图标（Favicon）" },
  { pattern: /^\/settings\/assets\/logoUrl\/?$/, label: "站点 Logo" },
  { pattern: /^\/settings\/?$/, label: "站点设置" },
  { pattern: /^\/system\/theme\/?$/, label: "主题配置" },
  {
    pattern: /^\/rbac\/admin-users\/([^/]+)\/security\/mfa-required\/?$/,
    label: (m) => `管理员账号 ${shortAuditId(m[1])} · 多因素验证`,
  },
  {
    pattern: /^\/rbac\/admin-users\/([^/]+)\/reset-password\/?$/,
    label: (m) => `管理员账号 ${shortAuditId(m[1])} · 登录密码`,
  },
  { pattern: /^\/rbac\/admin-users\/([^/]+)$/, label: (m) => `管理员账号 ${shortAuditId(m[1])}` },
  { pattern: /^\/rbac\/roles\/?$/, label: "角色列表" },
  { pattern: /^\/rbac\/roles\/([^/]+)$/, label: (m) => `角色 ${shortAuditId(m[1])}` },
  { pattern: /^\/payments\/channels\/([^/]+)$/, label: (m) => `支付渠道「${zhPaymentChannelId(m[1])}」` },
  { pattern: /^\/payments\/channels\/?$/, label: "支付渠道" },
  { pattern: /^\/payments\/orders\/([^/]+)\/refund/, label: (m) => `订单退款 ${shortAuditId(m[1])}` },
  { pattern: /^\/payments\/orders\/([^/]+)\/mark-paid/, label: (m) => `标记订单已付 ${shortAuditId(m[1])}` },
  { pattern: /^\/payments\/events\/([^/]+)\/replay/, label: (m) => `重放支付事件 ${shortAuditId(m[1])}` },
  { pattern: /^\/inventory\//, label: "库存" },
  { pattern: /^\/returns\/([^/]+)/, label: (m) => `售后单 ${shortAuditId(m[1])}` },
  { pattern: /^\/recycle-bin\/([^/]+)\/permanent-delete/, label: (m) => `回收站彻底删除 ${shortAuditId(m[1])}` },
  { pattern: /^\/exports/, label: "数据导出" },
  { pattern: /^\/products\/([^/]+)/, label: (m) => `商品 ${shortAuditId(m[1])}` },
  { pattern: /^\/users\/([^/]+)\/points/, label: (m) => `用户积分 ${shortAuditId(m[1])}` },
  { pattern: /^\/users\/([^/]+)\/reset-password/, label: (m) => `重置用户密码 ${shortAuditId(m[1])}` },
  { pattern: /^\/users\/([^/]+)\/account-status/, label: (m) => `用户账号状态 ${shortAuditId(m[1])}` },
];

const GATEWAY_BLOCK_REASON_ZH: Record<string, string> = {
  admin_allowed_origins_not_configured: "未配置允许访问的后台来源",
  admin_api_host_not_allowed: "请求域名不在白名单",
  admin_api_origin_denied: "请求来源被拒绝",
  admin_api_missing_origin: "缺少来源信息（Origin）",
  admin_csrf_failed: "安全令牌（CSRF）校验失败",
};

const PAYMENT_CHANNEL_ID_ZH: Record<string, string> = {
  ch_manual_bank: "手动银行转账",
  ch_stripe_checkout: "Stripe 在线支付",
  ch_reward_wallet: "返现余额支付",
};

function zhPaymentChannelId(id: string) {
  const key = String(id || "").trim();
  if (PAYMENT_CHANNEL_ID_ZH[key]) return PAYMENT_CHANNEL_ID_ZH[key];
  if (key.startsWith("ch_")) return key.slice(3).replace(/_/g, " ");
  return key;
}

function shortAuditId(id: string) {
  const s = String(id || "").trim();
  if (s.length <= 12) return s;
  return `…${s.slice(-8)}`;
}

function zhAdminApiPath(path: string) {
  const route = String(path || "").split("?")[0].trim();
  if (!route) return "管理端接口";
  for (const rule of ADMIN_API_PATH_RULES) {
    const match = route.match(rule.pattern);
    if (match) {
      return typeof rule.label === "function" ? rule.label(match) : rule.label;
    }
  }
  const segments = route.replace(/^\//, "").split("/").filter(Boolean);
  if (!segments.length) return "管理端接口";
  const parts = segments.map((seg) => {
    if (/^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i.test(seg)) {
      return shortAuditId(seg);
    }
    if (PAYMENT_CHANNEL_ID_ZH[seg]) return PAYMENT_CHANNEL_ID_ZH[seg];
    const tokenKey = seg.replace(/-/g, "_");
    return TOKEN_ZH[tokenKey] || MODULE_ZH[seg] || MODULE_ZH[tokenKey] || seg;
  });
  if (parts.length === 1) return parts[0];
  return parts.join(" / ");
}

function zhGatewayBlockReason(reason: string) {
  const key = String(reason || "").trim();
  if (GATEWAY_BLOCK_REASON_ZH[key]) return GATEWAY_BLOCK_REASON_ZH[key];
  return key.replace(/_/g, " ");
}

const HTTP_METHOD_ZH: Record<string, string> = {
  GET: "查询",
  POST: "提交",
  PUT: "更新",
  PATCH: "部分更新",
  DELETE: "删除",
};

export function zhHttpMethod(method?: string) {
  const key = String(method || "").trim().toUpperCase();
  if (!key) return "";
  return HTTP_METHOD_ZH[key] || key;
}

/** 将 POST /api/orders 等接口路径译为后台可读说明 */
export function zhRequestPath(method?: string, path?: string) {
  const route = String(path || "").trim();
  if (!route) return "—";
  const verb = String(method || "").trim().toUpperCase();
  const resource = REQUEST_PATH_ZH[route] || route.replace(/^\/api\//, "").replace(/\//g, " / ");

  if (verb === "POST" && route === "/api/orders") return "用户提交订单";
  if (verb === "POST") return `提交${resource}`;
  if (verb === "GET") return `查询${resource}`;
  if (verb === "PUT" || verb === "PATCH") return `更新${resource}`;
  if (verb === "DELETE") return `删除${resource}`;
  const methodLabel = zhHttpMethod(verb);
  return methodLabel ? `${methodLabel} · ${resource}` : resource;
}

export function zhUserAgentBrief(userAgent?: string) {
  const raw = String(userAgent || "").trim();
  if (!raw) return { brief: "—" as const, full: undefined };

  let os = "未知设备";
  if (/iPhone|iPad|iPod/i.test(raw)) os = "iPhone / iPad";
  else if (/Android/i.test(raw)) os = "Android 手机";
  else if (/Mac OS X|Macintosh/i.test(raw)) os = "Mac 电脑";
  else if (/Windows/i.test(raw)) os = "Windows 电脑";

  let browser = "其他浏览器";
  if (/CriOS/i.test(raw) || (/Chrome\//i.test(raw) && !/Edg/i.test(raw))) browser = "Chrome";
  else if (/Safari/i.test(raw) && !/Chrome/i.test(raw)) browser = "Safari";
  else if (/Firefox/i.test(raw)) browser = "Firefox";
  else if (/Edg/i.test(raw)) browser = "Edge";

  return {
    brief: `${os} · ${browser}`,
    full: raw.length > 48 ? raw : undefined,
  };
}

export function buildAuditSnapshotRows(json: unknown, limit = 16): AuditSnapshotRow[] {
  if (json == null) return [];
  if (!isPlainObject(json)) {
    return [{ label: "内容", value: formatAuditValue(json) }];
  }
  return Object.entries(json)
    .slice(0, limit)
    .map(([key, value]) => ({
      label: zhFieldName(key),
      value: formatAuditValue(value, key),
    }));
}

export function buildAuditChangeSummary(beforeJson: unknown, afterJson: unknown, limit = 12) {
  const beforeObj = isPlainObject(beforeJson) ? beforeJson : null;
  const afterObj = isPlainObject(afterJson) ? afterJson : null;

  if (!beforeObj && afterObj) {
    return Object.entries(afterObj).slice(0, limit).map(([key, value]) => ({
      key,
      label: zhFieldName(key),
      fromText: "（无）",
      toText: toDisplayValue(value, key),
    }));
  }

  if (beforeObj && !afterObj) {
    return Object.entries(beforeObj).slice(0, limit).map(([key, value]) => ({
      key,
      label: zhFieldName(key),
      fromText: toDisplayValue(value, key),
      toText: "（已清空）",
    }));
  }

  if (!beforeObj || !afterObj) return [];

  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  const changed: Array<{ key: string; from: unknown; to: unknown }> = [];
  keys.forEach((k) => {
    const a = beforeObj[k];
    const b = afterObj[k];
    if (safeStringify(a) !== safeStringify(b)) changed.push({ key: k, from: a, to: b });
  });
  return changed.slice(0, limit).map((it) => ({
    key: it.key,
    label: zhFieldName(it.key),
    fromText: toDisplayValue(it.from, it.key),
    toText: toDisplayValue(it.to, it.key),
  }));
}

export type AuditFilterOption = { value: string; label: string };

let auditZhGlossaryCache: string[] | null = null;

/** 审计模块内所有可替换的中文词表（长词优先，用于英文模式逐段翻译） */
function getAuditZhGlossary(): string[] {
  if (auditZhGlossaryCache) return auditZhGlossaryCache;
  const set = new Set<string>();
  const addFrom = (obj: Record<string, string>) => {
    for (const v of Object.values(obj)) {
      if (typeof v === "string" && v.trim()) set.add(v);
    }
  };
  addFrom(OBJECT_TYPE_ZH);
  addFrom(ACTION_ZH);
  addFrom(MODULE_ZH);
  addFrom(TOKEN_ZH);
  addFrom(FIELD_ZH);
  addFrom(ROLE_ZH);
  addFrom(STATUS_VALUE_ZH);
  addFrom(SUMMARY_EXACT_ZH);
  addFrom(ERROR_MSG_ZH);
  addFrom(REQUEST_PATH_ZH);
  addFrom(HTTP_METHOD_ZH);
  [
    "成功",
    "失败",
    "是",
    "否",
    "（无）",
    "（已清空）",
    "（数据过长已截断）",
    "内容",
    "关键词",
    "结果",
    "开始",
    "结束",
    "操作人编号",
    "对象类型",
    "对象编号",
    "动作",
    "已关联对象",
    "已关联",
    "未知设备",
    "Android 手机",
    "Mac 电脑",
    "Windows 电脑",
    "其他浏览器",
    "用户提交订单",
    "用户上传文件",
    "对象尾号",
    "创建优惠券活动",
    "更新优惠券活动",
    "删除优惠券活动",
    "应用智能补货建议",
    "保存智能补货配置",
    "生成智能补货预览",
    "生成库存每日快照",
    "执行积分过期扣减",
    "处理用户反馈",
    "创建经营支出",
    "更新经营支出",
    "删除经营支出",
    "列表",
    "项",
    "个字段",
  ].forEach((s) => set.add(s));
  auditZhGlossaryCache = [...set].sort((a, b) => b.length - a.length);
  return auditZhGlossaryCache;
}

/** 先整句查词典，再按审计词表替换句内已知中文片段 */
export function applyAdminTextTranslation(text: string, tText: (zh: string) => string): string {
  const raw = String(text ?? "");
  if (!raw.trim()) return raw;
  const whole = tText(raw);
  if (whole !== raw) return whole;

  const listMatch = raw.match(/^列表（(\d+) 项）$/);
  if (listMatch) return `${tText("列表")} (${listMatch[1]} ${tText("项")})`;
  const objectMatch = raw.match(/^对象（(\d+) 个字段）$/);
  if (objectMatch) return `${tText("对象")} (${objectMatch[1]} ${tText("个字段")})`;

  let out = raw;
  for (const zh of getAuditZhGlossary()) {
    if (zh.length < 2 || !out.includes(zh)) continue;
    const translated = tText(zh);
    if (translated !== zh) out = out.split(zh).join(translated);
  }
  return out;
}

export function localizedAuditSummary(summary: string | undefined, tText: (zh: string) => string): string {
  return applyAdminTextTranslation(zhAuditSummary(summary), tText);
}

function sortOptionsZh(options: AuditFilterOption[]) {
  return [...options].sort((a, b) => a.label.localeCompare(b.label, "zh-Hans"));
}

/** 审计日志高级筛选：对象类型下拉（值为后端枚举，展示中文） */
export function getAuditObjectTypeFilterOptions(): AuditFilterOption[] {
  return sortOptionsZh(
    Object.entries(OBJECT_TYPE_ZH).map(([value, label]) => ({ value, label })),
  );
}

/** 审计日志高级筛选：动作类型下拉 */
export function getAuditActionTypeFilterOptions(): AuditFilterOption[] {
  return sortOptionsZh(
    Object.entries(ACTION_ZH).map(([value, label]) => ({ value, label })),
  );
}
