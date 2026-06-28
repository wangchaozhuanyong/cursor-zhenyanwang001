export type HomeModuleAudience = "member" | "guest";

export type HomeModuleKey =
  | "banner"
  | "trust_bar"
  | "nav_grid"
  | "new_arrivals"
  | "hot_sales"
  | "recommend"
  | "guest_recommend"
  | "invite_entry"
  | "flash_sale_section"
  | "coupon_center"
  | "full_reduction_notice"
  | "promotion_banner";

export type HomeModuleSettings = {
  modules: Record<HomeModuleKey, boolean>;
  titles: Partial<Record<HomeModuleKey, string>>;
  bannerAutoplaySeconds: number;
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
    label: "快捷入口",
    description: "图标快捷入口（可在「快捷入口」分类配置）",
    audiences: ["member", "guest"],
    category: "common",
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
  {
    key: "invite_entry",
    label: "邀请好友",
    description: "首页邀请好友入口，受邀请奖励配置同步控制",
    audiences: ["member", "guest"],
    category: "common",
  },
  {
    key: "flash_sale_section",
    label: "首页秒杀专区",
    description: "展示限时秒杀活动与倒计时",
    audiences: ["member", "guest"],
    category: "common",
  },
  {
    key: "coupon_center",
    label: "优惠券模块",
    description: "统一展示普通券、新人券、会员券和活动券",
    audiences: ["member", "guest"],
    category: "common",
  },
  {
    key: "full_reduction_notice",
    label: "满减活动提示",
    description: "首页满减活动横幅/说明",
    audiences: ["member", "guest"],
    category: "common",
  },
  {
    key: "promotion_banner",
    label: "促销横幅",
    description: "通用营销活动横幅位",
    audiences: ["member", "guest"],
    category: "common",
  },
];

export const DEFAULT_HOME_MODULE_SETTINGS: HomeModuleSettings = {
  modules: {
    banner: true,
    trust_bar: true,
    nav_grid: true,
    new_arrivals: true,
    hot_sales: true,
    recommend: true,
    guest_recommend: true,
    invite_entry: true,
    flash_sale_section: true,
    coupon_center: true,
    full_reduction_notice: false,
    promotion_banner: false,
  },
  titles: {},
  bannerAutoplaySeconds: 5,
  hotBatchSize: 4,
  recBatchSize: 4,
  guestRecommendMax: 8,
};

function normalizeHomeModuleTitle(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, 40);
  return text || undefined;
}

function clampHomeBatchSize(value: unknown, fallback: number) {
  return typeof value === "number" && value >= 2 ? Math.min(12, Math.trunc(value)) : fallback;
}

function clampGuestRecommendMax(value: unknown, fallback: number) {
  return typeof value === "number" && value >= 4 ? Math.min(24, Math.trunc(value)) : fallback;
}

function clampBannerAutoplaySeconds(value: unknown, fallback: number) {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) && numeric >= 3
    ? Math.min(20, Math.trunc(numeric))
    : fallback;
}

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
  const titles: Partial<Record<HomeModuleKey, string>> = {};
  if (partial?.titles && typeof partial.titles === "object") {
    for (const def of HOME_MODULE_DEFINITIONS) {
      const title = normalizeHomeModuleTitle(partial.titles[def.key]);
      if (title) titles[def.key] = title;
    }
  }
  return {
    modules,
    titles,
    bannerAutoplaySeconds: clampBannerAutoplaySeconds(
      partial?.bannerAutoplaySeconds ?? (partial as { banner_autoplay_seconds?: number })?.banner_autoplay_seconds,
      DEFAULT_HOME_MODULE_SETTINGS.bannerAutoplaySeconds,
    ),
    hotBatchSize: clampHomeBatchSize(
      partial?.hotBatchSize ?? (partial as { hot_batch_size?: number })?.hot_batch_size,
      DEFAULT_HOME_MODULE_SETTINGS.hotBatchSize,
    ),
    recBatchSize: clampHomeBatchSize(
      partial?.recBatchSize ?? (partial as { rec_batch_size?: number })?.rec_batch_size,
      DEFAULT_HOME_MODULE_SETTINGS.recBatchSize,
    ),
    guestRecommendMax: clampGuestRecommendMax(
      partial?.guestRecommendMax ?? (partial as { guest_recommend_max?: number })?.guest_recommend_max,
      DEFAULT_HOME_MODULE_SETTINGS.guestRecommendMax,
    ),
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

export function getHomeModuleCustomTitle(
  settings: HomeModuleSettings,
  key: HomeModuleKey,
): string {
  return normalizeHomeModuleTitle(settings.titles?.[key]) || "";
}

export function getHomeModuleTitle(
  settings: HomeModuleSettings,
  key: HomeModuleKey,
  fallback: string,
): string {
  return getHomeModuleCustomTitle(settings, key) || fallback;
}
