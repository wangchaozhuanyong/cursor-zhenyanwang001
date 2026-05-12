type UnknownRecord = Record<string, unknown>;

const OBJECT_TYPE_ZH: Record<string, string> = {
  user: "用户",
  admin_user: "管理员",
  role: "角色",
  site_settings: "站点设置",
  banner: "Banner",
  product: "商品",
  product_tag: "商品标签",
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
};

const VERB_ZH: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
  enable: "启用",
  disable: "禁用",
  reset_password: "重置密码",
  status_update: "状态更新",
  approve: "批准",
  reject: "拒绝",
  ship: "发货",
  cancel: "取消",
  refund: "退款",
  replay: "事件重放",
};

const ACTION_OVERRIDES_ZH: Record<string, string> = {
  "rbac.create_role": "创建角色",
  "rbac.update_role": "更新角色",
  "rbac.delete_role": "删除角色",
  "admin.create_user": "创建管理员",
  "admin.enable_user": "启用管理员",
  "admin.disable_user": "禁用管理员",
  "admin.reset_password": "重置管理员密码",
  "settings.shipping_update": "更新运费设置",
  "return.status_update": "售后状态更新",
  "return.approve": "售后批准",
  "return.reject": "售后拒绝",
  "banner.create": "创建 Banner",
  "banner.update": "更新 Banner",
  "banner.delete": "删除 Banner",
  "tag.create": "创建标签",
  "tag.update": "更新标签",
  "tag.delete": "删除标签",
  "shipping_template.create": "创建运费模板",
  "shipping_template.update": "更新运费模板",
  "shipping_template.delete": "删除运费模板",
  "coupon.create": "创建优惠券",
  "coupon.update": "更新优惠券",
  "coupon.delete": "删除优惠券",
};

const FIELD_ZH: Record<string, string> = {
  id: "ID",
  name: "名称",
  title: "标题",
  slug: "Slug",
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

function toDisplayValue(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `数组(${v.length})`;
  if (isPlainObject(v)) return `对象(${Object.keys(v).length})`;
  return safeStringify(v);
}

export function zhObjectType(objectType?: string) {
  const raw = String(objectType || "").trim();
  return OBJECT_TYPE_ZH[raw] || raw || "—";
}

export function zhActionType(actionType?: string) {
  const raw = String(actionType || "").trim();
  if (!raw) return "—";
  if (ACTION_OVERRIDES_ZH[raw]) return ACTION_OVERRIDES_ZH[raw];

  // 形如 "module.verb" / "verb" / "module.verb_extra"
  const parts = raw.split(".");
  const last = parts[parts.length - 1] || raw;
  const verb = VERB_ZH[last];
  if (verb) return parts.length > 1 ? `${verb}` : verb;

  // 尝试把下划线动词翻译
  const underscoreVerb = VERB_ZH[last.replace(/-/g, "_")];
  if (underscoreVerb) return underscoreVerb;

  return raw;
}

export function zhFieldName(key: string) {
  return FIELD_ZH[key] || FIELD_ZH[key.toLowerCase()] || key;
}

export function buildAuditChangeSummary(beforeJson: unknown, afterJson: unknown, limit = 12) {
  if (!isPlainObject(beforeJson) || !isPlainObject(afterJson)) return [];
  const keys = new Set([...Object.keys(beforeJson), ...Object.keys(afterJson)]);
  const changed: Array<{ key: string; from: unknown; to: unknown }> = [];
  keys.forEach((k) => {
    const a = beforeJson[k];
    const b = afterJson[k];
    if (safeStringify(a) !== safeStringify(b)) changed.push({ key: k, from: a, to: b });
  });
  return changed.slice(0, limit).map((it) => ({
    key: it.key,
    label: zhFieldName(it.key),
    fromText: toDisplayValue(it.from),
    toText: toDisplayValue(it.to),
  }));
}

