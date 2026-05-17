export type HomeModuleAudience = "member" | "guest";

export type HomeModuleKey =
  | "banner"
  | "trust_bar"
  | "nav_grid"
  | "member_coupons"
  | "new_arrivals"
  | "hot_sales"
  | "recommend"
  | "guest_recommend";

export type HomeModuleSettings = {
  modules: Record<HomeModuleKey, boolean>;
  hotBatchSize: number;
  recBatchSize: number;
  guestRecommendMax: number;
};

export type HomeModuleDefinition = {
  key: HomeModuleKey;
  label: string;
  description: string;
  audiences: HomeModuleAudience[];
  category: "common" | "member" | "guest";
};

export const HOME_MODULE_DEFINITIONS: HomeModuleDefinition[] = [
  {
    key: "banner",
    label: "顶部轮播",
    description: "首页顶部 Banner 轮播图",
    audiences: ["member", "guest"],
    category: "common",
  },
  {
    key: "trust_bar",
    label: "信任条",
    description: "配送/售后等信任说明横条",
    audiences: ["member", "guest"],
    category: "common",
  },
  {
    key: "nav_grid",
    label: "金刚区导航",
    description: "图标快捷入口（可在「金刚区导航」分类配置）",
    audiences: ["member", "guest"],
    category: "common",
  },
  {
    key: "member_coupons",
    label: "会员专属礼包",
    description: "登录用户可见的优惠券横滑区",
    audiences: ["member"],
    category: "member",
  },
  {
    key: "new_arrivals",
    label: "新品专区",
    description: "新品主视觉 + 商品轮播",
    audiences: ["member", "guest"],
    category: "common",
  },
  {
    key: "hot_sales",
    label: "今日热销",
    description: "按热销标记展示，支持换一批",
    audiences: ["member"],
    category: "member",
  },
  {
    key: "recommend",
    label: "猜你喜欢",
    description: "个性化推荐，支持换一批",
    audiences: ["member"],
    category: "member",
  },
  {
    key: "guest_recommend",
    label: "全网爆款",
    description: "未登录首页的精选推荐商品区",
    audiences: ["guest"],
    category: "guest",
  },
];

export const DEFAULT_HOME_MODULE_SETTINGS: HomeModuleSettings = {
  modules: {
    banner: true,
    trust_bar: true,
    nav_grid: true,
    member_coupons: true,
    new_arrivals: true,
    hot_sales: true,
    recommend: true,
    guest_recommend: true,
  },
  hotBatchSize: 4,
  recBatchSize: 4,
  guestRecommendMax: 8,
};

export function mergeHomeModuleSettings(
  partial?: Partial<HomeModuleSettings> | null,
): HomeModuleSettings {
  const modules = { ...DEFAULT_HOME_MODULE_SETTINGS.modules };
  if (partial?.modules) {
    for (const def of HOME_MODULE_DEFINITIONS) {
      const v = partial.modules[def.key];
      if (typeof v === "boolean") modules[def.key] = v;
    }
  }
  return {
    modules,
    hotBatchSize:
      typeof partial?.hotBatchSize === "number" && partial.hotBatchSize >= 2
        ? Math.min(12, Math.trunc(partial.hotBatchSize))
        : DEFAULT_HOME_MODULE_SETTINGS.hotBatchSize,
    recBatchSize:
      typeof partial?.recBatchSize === "number" && partial.recBatchSize >= 2
        ? Math.min(12, Math.trunc(partial.recBatchSize))
        : DEFAULT_HOME_MODULE_SETTINGS.recBatchSize,
    guestRecommendMax:
      typeof partial?.guestRecommendMax === "number" && partial.guestRecommendMax >= 4
        ? Math.min(24, Math.trunc(partial.guestRecommendMax))
        : DEFAULT_HOME_MODULE_SETTINGS.guestRecommendMax,
  };
}

export function isHomeModuleEnabled(
  settings: HomeModuleSettings,
  key: HomeModuleKey,
  audience: HomeModuleAudience,
): boolean {
  const def = HOME_MODULE_DEFINITIONS.find((d) => d.key === key);
  if (!def?.audiences.includes(audience)) return false;
  return settings.modules[key] !== false;
}
