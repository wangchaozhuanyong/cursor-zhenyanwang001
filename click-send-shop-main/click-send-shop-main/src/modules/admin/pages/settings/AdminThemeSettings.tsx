import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import ThemePreviewScope from "@/components/admin/ThemePreviewScope";
import BannerCarousel from "@/components/BannerCarousel";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import ProductCard from "@/components/ProductCard";
import StoreBadge from "@/components/ui/StoreBadge";
import StoreButton from "@/components/ui/StoreButton";
import StorePrice from "@/components/ui/StorePrice";
import banner1Image from "@/assets/banner1.jpg";
import { DEFAULT_SKIN_ID, THEME_PRESETS } from "@/constants/themePresets";
import { notifyGlobalThemeUpdated } from "@/lib/themeRevision";
import { fetchThemeSkins, saveSystemThemeSkins } from "@/services/admin/themeService";
import type { Banner } from "@/types/banner";
import type { Product } from "@/types/product";
import type { ThemeConfig, ThemeSkin } from "@/types/theme";
import { toastErrorMessage } from "@/utils/errorMessage";
import { normalizeThemeConfig, normalizeThemeSkinsPayload } from "@/utils/themeConfig";
import { getThemeReadabilityReport } from "@/utils/themeContrast";

type ConfigTab = "colors" | "base" | "nav" | "card" | "marketing" | "advanced";
type PreviewTab = "home" | "product" | "member" | "components";
const configTabLabels: Record<ConfigTab, string> = {
  colors: "配色",
  base: "基础",
  nav: "导航",
  card: "卡片",
  marketing: "营销",
  advanced: "高级",
};
const previewTabLabels: Record<PreviewTab, string> = {
  home: "首页",
  product: "商品",
  member: "会员",
  components: "组件",
};
const enumValueLabels: Record<string, string> = {
  none: "无",
  subtle: "轻微",
  soft: "柔和",
  medium: "中等",
  glow: "发光",
  pill: "胶囊",
  rounded: "圆角",
  square: "方角",
  clean: "简洁",
  floating: "悬浮",
  glass: "玻璃",
  solid: "实心",
  outline: "描边",
  normal: "常规",
  bold: "加粗",
  luxury: "高级",
  standard: "标准",
  premium: "高级",
  deal: "促销",
  compact: "紧凑",
  bordered: "描边",
  seamless: "无缝",
  elevated: "悬浮",
  minimal: "极简",
  left: "左对齐",
  center: "居中",
  cover: "裁切铺满",
  contain: "完整显示",
  classic: "经典",
  magazine: "杂志",
  transparent: "透明",
  dark: "深色",
  ticket: "券样式",
  light: "浅色",
  gold: "金色",
  blackGold: "黑金",
  fresh: "清新",
  circle: "圆形",
  rich: "丰富",
  comfortable: "舒适",
  follow_store: "跟随前台",
  fixed: "固定",
};

const presetMap = new Map(THEME_PRESETS.map((skin) => [skin.id, skin]));

const enumOptions = {
  shadowStyle: ["none", "subtle", "soft", "medium", "glow"] as const,
  buttonStyle: ["pill", "rounded", "square"] as const,
  navStyle: ["clean", "floating", "glass"] as const,
  badgeStyle: ["solid", "soft", "outline"] as const,
  priceStyle: ["normal", "bold", "luxury"] as const,
  productCardVariant: ["standard", "premium", "deal", "compact"] as const,
  cardStyle: ["bordered", "seamless", "elevated", "minimal"] as const,
  cardTextAlign: ["left", "center"] as const,
  imageRatio: ["1 / 1", "4 / 5", "3 / 4", "16 / 9"] as const,
  imageFit: ["cover", "contain"] as const,
  homeLayout: ["classic", "premium", "deal", "magazine"] as const,
  headerStyle: ["clean", "premium", "transparent", "dark"] as const,
  bannerStyle: ["clean", "premium", "deal", "dark", "fresh"] as const,
  couponStyle: ["ticket", "premium", "deal", "minimal"] as const,
  memberCardStyle: ["light", "gold", "blackGold", "fresh"] as const,
  categoryIconStyle: ["circle", "soft", "solid", "outline"] as const,
  motionLevel: ["none", "soft", "rich"] as const,
  density: ["comfortable", "compact"] as const,
  adminThemeMode: ["fixed", "follow_store"] as const,
};

const previewBanner: Banner = {
  id: "preview-banner",
  title: "首页预览 Banner",
  image: banner1Image,
  link: "/products",
};

const previewProduct = {
  id: "preview-product",
  name: "商品卡预览",
  price: 88,
  original_price: 108,
  points: 20,
  stock: 30,
  sales_count: 128,
  cover_image: banner1Image,
  images: [banner1Image],
  tags: [],
  is_hot: true,
  is_new: true,
} as unknown as Product;

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
        <input type="color" value={color} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 rounded border-0 p-0" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-xs font-mono outline-none" />
      </div>
    </label>
  );
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const toLabel = (option: string) => enumValueLabels[option] || option;
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs">
        {options.map((option) => (
          <option key={option} value={option}>
            {toLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminThemeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skins, setSkins] = useState<ThemeSkin[]>([]);
  const [defaultSkinId, setDefaultSkinId] = useState(DEFAULT_SKIN_ID);
  const [activeSkinId, setActiveSkinId] = useState(DEFAULT_SKIN_ID);
  const [selectedSkinId, setSelectedSkinId] = useState(DEFAULT_SKIN_ID);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(normalizeThemeConfig(THEME_PRESETS[0]?.config));
  const [configTab, setConfigTab] = useState<ConfigTab>("colors");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("home");
  const [dirty, setDirty] = useState(false);

  const selectedSkin = useMemo(() => skins.find((skin) => skin.id === selectedSkinId), [skins, selectedSkinId]);
  const readability = useMemo(() => getThemeReadabilityReport(themeConfig), [themeConfig]);

  useEffect(() => {
    setLoading(true);
    fetchThemeSkins()
      .then((data) => {
        const normalized = normalizeThemeSkinsPayload({
          defaultSkinId: data?.defaultSkinId,
          activeSkinId: data?.activeSkinId || data?.defaultSkinId,
          skins: Array.isArray(data?.skins) ? data.skins : THEME_PRESETS,
        });
        setSkins(normalized.skins);
        setDefaultSkinId(normalized.defaultSkinId);
        setActiveSkinId(normalized.activeSkinId);
        setSelectedSkinId(normalized.activeSkinId);
        const current = normalized.skins.find((skin) => skin.id === normalized.activeSkinId) || normalized.skins[0];
        setThemeConfig(normalizeThemeConfig(current?.config));
      })
      .catch((error) => toast.error(toastErrorMessage(error, "加载皮肤配置失败")))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (nextSkins: ThemeSkin[], nextDefaultSkinId: string, nextActiveSkinId: string, message: string) => {
    setSaving(true);
    try {
      await saveSystemThemeSkins({
        defaultSkinId: nextDefaultSkinId,
        activeSkinId: nextActiveSkinId,
        skins: nextSkins,
      });
      setSkins(nextSkins);
      setDefaultSkinId(nextDefaultSkinId);
      setActiveSkinId(nextActiveSkinId);
      notifyGlobalThemeUpdated();
      setDirty(false);
      toast.success(message);
    } catch (error) {
      toast.error(toastErrorMessage(error, "保存失败"));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = <K extends keyof ThemeConfig>(field: K, value: ThemeConfig[K]) => {
    const next = normalizeThemeConfig({ ...themeConfig, [field]: value });
    setThemeConfig(next);
    setSkins((prev) => prev.map((skin) => (skin.id === selectedSkinId ? { ...skin, config: next } : skin)));
    setDirty(true);
  };

  const onSelectSkin = (id: string) => {
    if (dirty && !window.confirm("当前有未保存修改，确定切换皮肤吗？")) return;
    setSelectedSkinId(id);
    const target = skins.find((skin) => skin.id === id);
    setThemeConfig(normalizeThemeConfig(target?.config));
    setDirty(false);
  };

  const onApplyPreset = (presetId: string) => {
    const preset = presetMap.get(presetId);
    if (!preset) return;
    const nextConfig = normalizeThemeConfig(preset.config);
    setThemeConfig(nextConfig);
    setSkins((prev) => prev.map((skin) => (skin.id === selectedSkinId ? { ...skin, config: nextConfig } : skin)));
    setDirty(true);
    toast.success("已载入预设，请点击“保存皮肤配置”生效");
  };

  const onAddSkin = () => {
    if (skins.length >= 20) return toast.info("最多保留 20 套皮肤");
    const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `skin_${Date.now()}`;
    const newSkin: ThemeSkin = {
      id: newId,
      name: `自定义皮肤 ${skins.length + 1}`,
      clientEnabled: true,
      config: normalizeThemeConfig(themeConfig),
    };
    setSkins((prev) => [...prev, newSkin]);
    setSelectedSkinId(newId);
    setThemeConfig(newSkin.config);
    setDirty(true);
  };

  const onCopySkin = (id: string) => {
    const source = skins.find((skin) => skin.id === id);
    if (!source) return;
    const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `skin_${Date.now()}`;
    const clone: ThemeSkin = { ...source, id: newId, name: `${source.name} 副本`, clientEnabled: source.clientEnabled !== false };
    setSkins((prev) => [...prev, clone]);
    setSelectedSkinId(newId);
    setThemeConfig(clone.config);
    setDirty(true);
  };

  const onDeleteSkin = async (id: string) => {
    if (THEME_PRESETS.some((preset) => preset.id === id)) return toast.info("系统预设不允许删除，可复制后修改");
    if (skins.length <= 1) return toast.error("至少保留一套皮肤");

    const nextSkins = skins.filter((skin) => skin.id !== id);
    const fallbackId = nextSkins[0]?.id || DEFAULT_SKIN_ID;
    const nextDefaultSkinId = defaultSkinId === id ? fallbackId : defaultSkinId;
    const nextActiveSkinId = activeSkinId === id ? fallbackId : activeSkinId;
    const nextSelectedSkinId = selectedSkinId === id ? fallbackId : selectedSkinId;

    setSkins(nextSkins);
    setDefaultSkinId(nextDefaultSkinId);
    setActiveSkinId(nextActiveSkinId);
    setSelectedSkinId(nextSelectedSkinId);
    const target = nextSkins.find((skin) => skin.id === nextSelectedSkinId) || nextSkins[0];
    setThemeConfig(normalizeThemeConfig(target?.config));

    await persist(nextSkins, nextDefaultSkinId, nextActiveSkinId, "已删除皮肤");
  };

  const onSetDefault = async (id: string) => {
    if (id === defaultSkinId) return;
    await persist(skins, id, activeSkinId, "已设为默认皮肤");
  };

  const onApplyCurrent = async (id: string) => {
    if (id === activeSkinId) return;
    await persist(skins, defaultSkinId, id, "已应用为当前前台皮肤");
  };

  const onToggleClientEnabled = (id: string, checked: boolean) => {
    setSkins((prev) => prev.map((skin) => (skin.id === id ? { ...skin, clientEnabled: checked } : skin)));
    setDirty(true);
  };

  const onSave = async () => {
    await persist(skins, defaultSkinId, activeSkinId, "皮肤配置已保存");
  };

  const onResetCurrent = () => {
    if (!selectedSkin) return;
    const preset = presetMap.get(selectedSkin.id) || THEME_PRESETS[0];
    const nextConfig = normalizeThemeConfig(preset.config);
    setThemeConfig(nextConfig);
    setSkins((prev) => prev.map((skin) => (skin.id === selectedSkinId ? { ...skin, config: nextConfig } : skin)));
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">商城皮肤系统 V2.1</h1>
          <p className="text-sm text-muted-foreground">后台保持固定管理台主题，右侧仅预览当前编辑皮肤，不污染后台 UI。</p>
        </div>
        <StoreButton variant="ghost" size="sm" onClick={onResetCurrent} disabled={saving}>
          <RotateCcw size={14} />
          恢复当前预设
        </StoreButton>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr_420px]">
        <section className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">皮肤列表</p>
            <button type="button" onClick={onAddSkin} className="rounded-md border border-border p-1.5 hover:bg-secondary">
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {skins.map((skin) => (
              <div key={skin.id} className={`rounded-lg border p-2 ${skin.id === selectedSkinId ? "border-primary" : "border-border"}`}>
                <button type="button" className="w-full text-left text-sm font-medium" onClick={() => onSelectSkin(skin.id)}>
                  {skin.name}
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {skin.id === defaultSkinId ? (
                    <StoreBadge type="success">默认</StoreBadge>
                  ) : (
                    <button onClick={() => void onSetDefault(skin.id)} className="rounded border border-border px-1.5 py-0.5 text-[10px]">设为默认</button>
                  )}
                  {skin.id === activeSkinId ? (
                    <StoreBadge type="coupon">当前生效</StoreBadge>
                  ) : (
                    <button onClick={() => void onApplyCurrent(skin.id)} className="rounded border border-border px-1.5 py-0.5 text-[10px]">应用当前</button>
                  )}
                  <label className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px]">
                    <input
                      type="checkbox"
                      checked={skin.clientEnabled !== false}
                      onChange={(e) => onToggleClientEnabled(skin.id, e.target.checked)}
                    />
                    前台可切换
                  </label>
                  <button onClick={() => onCopySkin(skin.id)} className="rounded border border-border p-1"><Copy size={12} /></button>
                  <button onClick={() => void onDeleteSkin(skin.id)} className="rounded border border-border p-1"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {(["colors", "base", "nav", "card", "marketing", "advanced"] as ConfigTab[]).map((tab) => (
              <button key={tab} onClick={() => setConfigTab(tab)} className={`rounded-full px-3 py-1 text-xs ${configTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {configTabLabels[tab]}
              </button>
            ))}
          </div>

          <div className="mb-4 rounded-lg border border-border p-3">
            <p className="mb-2 text-xs text-muted-foreground">一键载入预设（不会自动保存）</p>
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map((preset) => (
                <button key={preset.id} onClick={() => onApplyPreset(preset.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary">
                  载入{preset.name}
                </button>
              ))}
            </div>
          </div>

          {configTab === "colors" && (
            <div className="grid gap-3 md:grid-cols-2">
              <ColorInput label="页面背景" value={themeConfig.bgColor} onChange={(v) => updateConfig("bgColor", v)} />
              <ColorInput label="卡片背景" value={themeConfig.surfaceColor} onChange={(v) => updateConfig("surfaceColor", v)} />
              <ColorInput label="主色" value={themeConfig.primaryColor} onChange={(v) => updateConfig("primaryColor", v)} />
              <ColorInput label="辅色" value={themeConfig.secondaryColor} onChange={(v) => updateConfig("secondaryColor", v)} />
              <ColorInput label="强调色" value={themeConfig.accentColor} onChange={(v) => updateConfig("accentColor", v)} />
              <ColorInput label="价格色" value={themeConfig.priceColor} onChange={(v) => updateConfig("priceColor", v)} />
              <ColorInput label="正文色" value={themeConfig.textColor} onChange={(v) => updateConfig("textColor", v)} />
              <ColorInput label="次文字色" value={themeConfig.mutedTextColor} onChange={(v) => updateConfig("mutedTextColor", v)} />
              <ColorInput label="边框色" value={themeConfig.borderColor} onChange={(v) => updateConfig("borderColor", v)} />
              <ColorInput label="成功色" value={themeConfig.successColor} onChange={(v) => updateConfig("successColor", v)} />
              <ColorInput label="警告色" value={themeConfig.warningColor} onChange={(v) => updateConfig("warningColor", v)} />
              <ColorInput label="危险色" value={themeConfig.dangerColor} onChange={(v) => updateConfig("dangerColor", v)} />
            </div>
          )}

          {configTab === "base" && (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1"><span className="text-xs text-muted-foreground">字体</span><input value={themeConfig.fontFamily} onChange={(e) => updateConfig("fontFamily", e.target.value)} className="h-9 w-full rounded-lg border border-border px-2 text-xs" /></label>
              <label className="space-y-1"><span className="text-xs text-muted-foreground">圆角</span><input value={themeConfig.radius} onChange={(e) => updateConfig("radius", e.target.value)} className="h-9 w-full rounded-lg border border-border px-2 text-xs" /></label>
              <SelectRow label="阴影" value={themeConfig.shadowStyle} options={enumOptions.shadowStyle} onChange={(v) => updateConfig("shadowStyle", v)} />
              <SelectRow label="密度" value={themeConfig.density} options={enumOptions.density} onChange={(v) => updateConfig("density", v)} />
              <SelectRow label="动效强度" value={themeConfig.motionLevel} options={enumOptions.motionLevel} onChange={(v) => updateConfig("motionLevel", v)} />
            </div>
          )}

          {configTab === "nav" && (
            <div className="grid gap-3 md:grid-cols-2">
              <SelectRow label="按钮风格" value={themeConfig.buttonStyle} options={enumOptions.buttonStyle} onChange={(v) => updateConfig("buttonStyle", v)} />
              <SelectRow label="底部导航" value={themeConfig.navStyle} options={enumOptions.navStyle} onChange={(v) => updateConfig("navStyle", v)} />
              <SelectRow label="头部风格" value={themeConfig.headerStyle} options={enumOptions.headerStyle} onChange={(v) => updateConfig("headerStyle", v)} />
            </div>
          )}

          {configTab === "card" && (
            <div className="grid gap-3 md:grid-cols-2">
              <SelectRow label="商品卡变体" value={themeConfig.productCardVariant} options={enumOptions.productCardVariant} onChange={(v) => updateConfig("productCardVariant", v)} />
              <SelectRow label="卡片风格" value={themeConfig.cardStyle} options={enumOptions.cardStyle} onChange={(v) => updateConfig("cardStyle", v)} />
              <SelectRow label="文字对齐" value={themeConfig.cardTextAlign} options={enumOptions.cardTextAlign} onChange={(v) => updateConfig("cardTextAlign", v)} />
              <SelectRow label="图片比例" value={themeConfig.imageRatio} options={enumOptions.imageRatio} onChange={(v) => updateConfig("imageRatio", v)} />
              <SelectRow label="图片填充" value={themeConfig.imageFit} options={enumOptions.imageFit} onChange={(v) => updateConfig("imageFit", v)} />
              <SelectRow label="价格样式" value={themeConfig.priceStyle} options={enumOptions.priceStyle} onChange={(v) => updateConfig("priceStyle", v)} />
            </div>
          )}

          {configTab === "marketing" && (
            <div className="grid gap-3 md:grid-cols-2">
              <SelectRow label="首页布局" value={themeConfig.homeLayout} options={enumOptions.homeLayout} onChange={(v) => updateConfig("homeLayout", v)} />
              <SelectRow label="Banner 风格" value={themeConfig.bannerStyle} options={enumOptions.bannerStyle} onChange={(v) => updateConfig("bannerStyle", v)} />
              <SelectRow label="优惠券风格" value={themeConfig.couponStyle} options={enumOptions.couponStyle} onChange={(v) => updateConfig("couponStyle", v)} />
              <SelectRow label="会员卡风格" value={themeConfig.memberCardStyle} options={enumOptions.memberCardStyle} onChange={(v) => updateConfig("memberCardStyle", v)} />
              <SelectRow label="分类图标风格" value={themeConfig.categoryIconStyle} options={enumOptions.categoryIconStyle} onChange={(v) => updateConfig("categoryIconStyle", v)} />
              <SelectRow label="标签风格" value={themeConfig.badgeStyle} options={enumOptions.badgeStyle} onChange={(v) => updateConfig("badgeStyle", v)} />
            </div>
          )}

          {configTab === "advanced" && (
            <div className="grid gap-3 md:grid-cols-2">
              <p className="col-span-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                后台与前台已统一使用系统皮肤，全局实时生效。旧的“后台固定主题模式”已停用。
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {(["home", "product", "member", "components"] as PreviewTab[]).map((tab) => (
              <button key={tab} onClick={() => setPreviewTab(tab)} className={`rounded-full px-3 py-1 text-xs ${previewTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {previewTabLabels[tab]}
              </button>
            ))}
          </div>
          <div className={`mb-3 rounded-md border p-2 text-xs ${readability.pass ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
            {readability.pass ? "可读性检测通过" : "可读性检测有警告，请检查文字与背景对比度"}
          </div>

          <ThemePreviewScope config={themeConfig} className="space-y-3 rounded-xl border border-border bg-background p-3">
            {previewTab === "home" && (
              <>
                <div className="rounded-lg border border-border p-2">
                  <BannerCarousel banners={[previewBanner]} themeConfigOverride={themeConfig} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="store-card p-3"><p className="text-sm font-semibold">新人礼包</p><StorePrice price={99} originalPrice={129} /></div>
                  <div className="store-card p-3"><p className="text-sm font-semibold">热门推荐</p><StoreBadge type="hot">热销</StoreBadge></div>
                </div>
              </>
            )}
            {previewTab === "product" && (
              <div className="grid grid-cols-1 gap-2">
                <ProductCard product={previewProduct} />
              </div>
            )}
            {previewTab === "member" && (
              <div className="space-y-2">
                <div className="store-card p-3"><p className="text-sm font-semibold">会员中心预览</p><p className="text-xs store-muted">等级 / 资产 / 订单入口</p></div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="store-card p-2 text-center text-xs">积分</div>
                  <div className="store-card p-2 text-center text-xs">优惠券</div>
                  <div className="store-card p-2 text-center text-xs">收藏</div>
                  <div className="store-card p-2 text-center text-xs">返现</div>
                </div>
              </div>
            )}
            {previewTab === "components" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <StoreButton size="sm">主按钮</StoreButton>
                  <StoreButton size="sm" variant="secondary">次按钮</StoreButton>
                  <StoreButton size="sm" variant="ghost">幽灵按钮</StoreButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StoreBadge type="sale">满减</StoreBadge>
                  <StoreBadge type="coupon">优惠券</StoreBadge>
                  <StoreBadge type="danger">危险</StoreBadge>
                </div>
                <StorePrice price={79} originalPrice={99} />
                <PremiumCouponCard compact title="组件预览券" amount="20" conditionText="满 RM100 可用" expireText="2026-12-31" actionLabel="领取" />
              </div>
            )}
          </ThemePreviewScope>
        </section>
      </div>

      <div className="sticky bottom-0 z-30 -mx-6 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{dirty ? "有未保存修改" : "已与服务器同步"}</p>
          <PermissionGate permission="settings.manage">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              保存皮肤配置
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
