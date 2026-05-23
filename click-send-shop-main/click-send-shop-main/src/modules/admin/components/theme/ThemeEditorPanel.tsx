import { Sparkles, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThemeConfig, ThemeSceneTag, ThemeSkin } from "@/types/theme";
import type { AutoColorAction } from "@/utils/themeStudioAuto";
import { THEME_OUTLINE_WARNING } from "@/utils/themeVisuals";
import AdminFieldHint, { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import ColorField from "./ColorField";
import ThemeHealthCheck from "./ThemeHealthCheck";
import type { ThemeHealthFixTarget } from "./themeHealthFixMeta";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { useThemeStudioLabel } from "@/hooks/useThemeStudioLabel";
import {
  EDITOR_TABS,
  FIELD_HELP_TEXTS,
  SCENE_TAG_LABELS,
  enumOptions,
  enumValueLabels,
  type ColorFieldKey,
  type EditorTabId,
} from "./themeStudioConstants";

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
  fieldKey,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  fieldKey?: string;
}) {
  const tl = useThemeStudioLabel();
  const help = fieldKey ? FIELD_HELP_TEXTS[fieldKey] : undefined;
  return (
    <label className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{tl(label)}</span>
        {help ? <AdminFieldHint text={tl(help)} /> : null}
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-10 w-full rounded-xl border border-border bg-background px-2 text-xs">
        {options.map((option) => (
          <option key={option} value={option}>
            {tl(enumValueLabels[option] || option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export type ThemeEditorPanelProps = {
  themeConfig: ThemeConfig;
  selectedSkin: ThemeSkin | undefined;
  isDefaultSkin: boolean;
  onConfigChange: <K extends keyof ThemeConfig>(field: K, value: ThemeConfig[K]) => void;
  onSkinMetaChange: (patch: Partial<Pick<ThemeSkin, "name" | "description" | "sceneTag" | "clientEnabled">>) => void;
  onAutoColor: (action: AutoColorAction) => void;
  canUndoOptimize: boolean;
  onUndoOptimize: () => void;
};

const colorTabSections: Array<{ title: string; fields: ColorFieldKey[] }> = [
  { title: "品牌颜色", fields: ["primaryColor", "secondaryColor", "accentColor", "priceColor"] },
  { title: "页面颜色", fields: ["bgColor", "surfaceColor", "borderColor"] },
  { title: "文字颜色", fields: ["textColor", "mutedTextColor"] },
  { title: "状态颜色", fields: ["successColor", "warningColor", "dangerColor"] },
];

const THEME_EDITOR_TAB_STORAGE_KEY = "admin-theme-editor-tab";

const TAB_PANEL_HINTS: Record<EditorTabId, string> = {
  basic: "皮肤名称、适用场景和前台可见状态",
  colors: "品牌色、页面色、文字色与状态色",
  components: "按钮、导航、圆角、阴影、动效与页面密度",
  product: "商品卡片、图片比例、价格与徽标样式",
  home: "首页布局、头部、Banner、优惠券与会员卡",
  advanced: "后台主题模式、字体与可访问性体检",
};

function isEditorTabId(value: string): value is EditorTabId {
  return EDITOR_TABS.some((tab) => tab.id === value);
}

function readStoredEditorTab(): EditorTabId {
  try {
    const stored = sessionStorage.getItem(THEME_EDITOR_TAB_STORAGE_KEY);
    if (stored && isEditorTabId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "basic";
}

function mapHealthSectionToTab(sectionId: ThemeHealthFixTarget["sectionId"]): EditorTabId {
  if (sectionId === "toolbar" || sectionId === "colors" || sectionId === "text" || sectionId === "status") return "colors";
  if (sectionId === "buttons") return "components";
  if (sectionId === "card") return "product";
  if (sectionId === "marketing") return "home";
  return "advanced";
}

export default function ThemeEditorPanel({
  themeConfig,
  selectedSkin,
  isDefaultSkin,
  onConfigChange,
  onSkinMetaChange,
  onAutoColor,
  canUndoOptimize,
  onUndoOptimize,
}: ThemeEditorPanelProps) {
  const { tText } = useAdminT();
  const tl = useThemeStudioLabel();
  const panelRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<EditorTabId>(readStoredEditorTab);
  const [highlightField, setHighlightField] = useState<ColorFieldKey | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectTab = useCallback((tabId: EditorTabId) => {
    setActiveTab(tabId);
    try {
      sessionStorage.setItem(THEME_EDITOR_TAB_STORAGE_KEY, tabId);
    } catch {
      /* ignore */
    }
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  useEffect(() => {
    if (!highlightField) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector(`#theme-field-${highlightField}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, highlightField]);

  const goToFix = useCallback(
    (target: ThemeHealthFixTarget) => {
      selectTab(mapHealthSectionToTab(target.sectionId));
      if (target.autoAction) {
        onAutoColor(target.autoAction);
      }
      const field = target.fieldKeys?.[0] ?? null;
      if (field) {
        setHighlightField(field);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setHighlightField(null), 3500);
      }
    },
    [onAutoColor, selectTab],
  );

  const statusText = useMemo(() => {
    if (isDefaultSkin) return tText("当前是默认皮肤。默认皮肤仅影响新用户默认看到的样式。");
    return tText("当前不是默认皮肤。可在顶部或皮肤卡菜单设为默认。");
  }, [isDefaultSkin, tText]);

  return (
    <section ref={panelRef} className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-5 rounded-2xl border border-border/70 bg-secondary/25 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground"><Tx>设置分类</Tx></p>
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={tText("设置分类")}
        >
        {EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-current={activeTab === tab.id ? "true" : undefined}
            onClick={() => selectTab(tab.id)}
            className={`shrink-0 touch-manipulation rounded-xl px-3 py-2 text-xs font-medium sm:py-1.5 ${
              activeTab === tab.id ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-secondary text-muted-foreground"
            }`}
          >
            {tl(tab.label)}
          </button>
        ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{tl(TAB_PANEL_HINTS[activeTab])}</p>
      </div>

      <div ref={contentRef} className="min-h-[280px] space-y-5">
      {activeTab === "basic" ? (
      <section id="theme-section-basic" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title={tText("基础信息")} hint="皮肤名称、适用场景和前台可见状态。" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground"><Tx>皮肤名称</Tx></span>
            <input
              value={selectedSkin?.name || ""}
              onChange={(e) => onSkinMetaChange({ name: e.target.value })}
              className="h-10 w-full rounded-xl border border-border px-3 text-sm"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground"><Tx>皮肤描述</Tx></span>
            <textarea
              value={selectedSkin?.description || ""}
              onChange={(e) => onSkinMetaChange({ description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-border px-3 py-2 text-xs"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground"><Tx>适合场景</Tx></span>
            <select
              value={selectedSkin?.sceneTag || "default"}
              onChange={(e) => onSkinMetaChange({ sceneTag: e.target.value as ThemeSceneTag })}
              className="h-10 w-full rounded-xl border border-border px-2 text-xs"
            >
              {Object.entries(SCENE_TAG_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{tl(label)}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={selectedSkin?.clientEnabled !== false}
              onChange={(e) => onSkinMetaChange({ clientEnabled: e.target.checked })}
            />
            前台可切换
          </label>
          <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground md:col-span-2">{statusText}</p>
        </div>
      </section>
      ) : null}

      {activeTab === "colors" ? (
      <section id="theme-section-colors" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title={tText("颜色系统")} hint="品牌色、页面色、文字色和状态色会同步影响前台与预览。" />
        </div>
        <div className="space-y-4">
          <div id="theme-auto-toolbar" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onAutoColor("secondary")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} /><Tx>自动生成辅色</Tx></button>
            <button type="button" onClick={() => onAutoColor("accent")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} /><Tx>自动生成强调色</Tx></button>
            <button type="button" onClick={() => onAutoColor("border")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} /><Tx>自动生成边框色</Tx></button>
            <button type="button" onClick={() => onAutoColor("textContrast")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} /><Tx>优化文字对比度</Tx></button>
            <button type="button" onClick={() => onAutoColor("foreground")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} /><Tx>生成前景色变量</Tx></button>
            {canUndoOptimize ? (
              <button type="button" onClick={onUndoOptimize} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] ${THEME_OUTLINE_WARNING}`}><Undo2 size={12} /><Tx>撤销优化</Tx></button>
            ) : null}
          </div>

          {colorTabSections.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{tl(group.title)}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {group.fields.map((field) => (
                  <ColorField
                    key={field}
                    field={field}
                    value={themeConfig[field]}
                    config={themeConfig}
                    highlighted={highlightField === field}
                    onChange={(v) => onConfigChange(field, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      ) : null}

      {activeTab === "components" ? (
      <section id="theme-section-components" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title={tText("组件风格")} hint="按钮、导航、圆角、阴影、动效与页面密度。" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectRow fieldKey="buttonStyle" label={tText("按钮风格")} value={themeConfig.buttonStyle} options={enumOptions.buttonStyle} onChange={(v) => onConfigChange("buttonStyle", v)} />
          <SelectRow fieldKey="navStyle" label={tText("底部导航")} value={themeConfig.navStyle} options={enumOptions.navStyle} onChange={(v) => onConfigChange("navStyle", v)} />
          <label className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground"><Tx>圆角 radius</Tx></span>
              <AdminFieldHint text={FIELD_HELP_TEXTS.radius} />
            </div>
            <input value={themeConfig.radius} onChange={(e) => onConfigChange("radius", e.target.value)} className="h-10 w-full rounded-xl border border-border px-2 text-xs" />
          </label>
          <SelectRow fieldKey="shadowStyle" label={tText("阴影")} value={themeConfig.shadowStyle} options={enumOptions.shadowStyle} onChange={(v) => onConfigChange("shadowStyle", v)} />
          <SelectRow fieldKey="motionLevel" label={tText("动效")} value={themeConfig.motionLevel} options={enumOptions.motionLevel} onChange={(v) => onConfigChange("motionLevel", v)} />
          <SelectRow fieldKey="density" label={tText("密度")} value={themeConfig.density} options={enumOptions.density} onChange={(v) => onConfigChange("density", v)} />
        </div>
      </section>
      ) : null}

      {activeTab === "product" ? (
      <section id="theme-section-product" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title={tText("商品展示")} hint="商品卡片、图片比例、价格与徽标样式。" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectRow fieldKey="productCardVariant" label={tText("商品卡变体")} value={themeConfig.productCardVariant} options={enumOptions.productCardVariant} onChange={(v) => onConfigChange("productCardVariant", v)} />
          <SelectRow fieldKey="cardStyle" label={tText("卡片风格")} value={themeConfig.cardStyle} options={enumOptions.cardStyle} onChange={(v) => onConfigChange("cardStyle", v)} />
          <SelectRow fieldKey="cardTextAlign" label={tText("文字对齐")} value={themeConfig.cardTextAlign} options={enumOptions.cardTextAlign} onChange={(v) => onConfigChange("cardTextAlign", v)} />
          <SelectRow fieldKey="imageRatio" label={tText("图片比例")} value={themeConfig.imageRatio} options={enumOptions.imageRatio} onChange={(v) => onConfigChange("imageRatio", v)} />
          <SelectRow fieldKey="imageFit" label={tText("图片填充")} value={themeConfig.imageFit} options={enumOptions.imageFit} onChange={(v) => onConfigChange("imageFit", v)} />
          <SelectRow fieldKey="priceStyle" label={tText("价格样式")} value={themeConfig.priceStyle} options={enumOptions.priceStyle} onChange={(v) => onConfigChange("priceStyle", v)} />
          <SelectRow fieldKey="badgeStyle" label={tText("标签风格")} value={themeConfig.badgeStyle} options={enumOptions.badgeStyle} onChange={(v) => onConfigChange("badgeStyle", v)} />
        </div>
      </section>
      ) : null}

      {activeTab === "home" ? (
      <section id="theme-section-home" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title={tText("首页与营销")} hint="首页布局、头部、Banner、优惠券、会员卡和分类图标。" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectRow fieldKey="homeLayout" label={tText("首页布局")} value={themeConfig.homeLayout} options={enumOptions.homeLayout} onChange={(v) => onConfigChange("homeLayout", v)} />
          <SelectRow fieldKey="headerStyle" label={tText("头部风格")} value={themeConfig.headerStyle} options={enumOptions.headerStyle} onChange={(v) => onConfigChange("headerStyle", v)} />
          <SelectRow fieldKey="bannerStyle" label="Banner" value={themeConfig.bannerStyle} options={enumOptions.bannerStyle} onChange={(v) => onConfigChange("bannerStyle", v)} />
          <SelectRow fieldKey="couponStyle" label={tText("优惠券")} value={themeConfig.couponStyle} options={enumOptions.couponStyle} onChange={(v) => onConfigChange("couponStyle", v)} />
          <SelectRow fieldKey="memberCardStyle" label={tText("会员卡")} value={themeConfig.memberCardStyle} options={enumOptions.memberCardStyle} onChange={(v) => onConfigChange("memberCardStyle", v)} />
          <SelectRow fieldKey="categoryIconStyle" label={tText("分类图标")} value={themeConfig.categoryIconStyle} options={enumOptions.categoryIconStyle} onChange={(v) => onConfigChange("categoryIconStyle", v)} />
        </div>
      </section>
      ) : null}

      {activeTab === "advanced" ? (
      <section id="theme-section-advanced" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle
            title={tText("高级与体检")}
            hint="后台主题模式、字体和可访问性体检建议。CSS 变量会由系统根据当前配置自动生成并同步，不需要手动维护。"
          />
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SelectRow fieldKey="adminThemeMode" label={tText("后台主题模式")} value={themeConfig.adminThemeMode} options={enumOptions.adminThemeMode} onChange={(v) => onConfigChange("adminThemeMode", v)} />
            <label className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground"><Tx>字体</Tx></span>
                <AdminFieldHint text={FIELD_HELP_TEXTS.fontFamily} />
              </div>
              <input value={themeConfig.fontFamily} onChange={(e) => onConfigChange("fontFamily", e.target.value)} className="h-10 w-full rounded-xl border border-border px-2 text-xs" />
            </label>
          </div>
          <ThemeHealthCheck config={themeConfig} onGoToFix={goToFix} />
        </div>
      </section>
      ) : null}
      </div>
    </section>
  );
}
