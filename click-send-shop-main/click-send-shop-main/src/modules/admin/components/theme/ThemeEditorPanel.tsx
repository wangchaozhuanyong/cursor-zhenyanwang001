import { Sparkles, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { useAdminT } from "@/hooks/useAdminT";
import { useThemeStudioLabel } from "@/hooks/useThemeStudioLabel";
import type { ThemeConfig, ThemeSkin } from "@/types/theme";
import type { AutoColorAction } from "@/utils/themeStudioAuto";
import { THEME_OUTLINE_WARNING } from "@/utils/themeVisuals";
import ColorField from "./ColorField";
import ThemeHealthCheck from "./ThemeHealthCheck";
import type { ThemeHealthFixTarget } from "./themeHealthFixMeta";
import {
  EDITOR_TABS,
  FIELD_HELP_TEXTS,
  enumOptions,
  enumValueLabels,
  type ColorFieldKey,
  type EditorTabId,
} from "./themeStudioConstants";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export type ThemeEditorPanelProps = {
  themeConfig: ThemeConfig;
  selectedSkin: ThemeSkin | undefined;
  isClientSkin: boolean;
  isHolidaySkin: boolean;
  onConfigChange: <K extends keyof ThemeConfig>(field: K, value: ThemeConfig[K]) => void;
  onSkinMetaChange: (patch: Partial<Pick<ThemeSkin, "name" | "description" | "category">>) => void;
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
  basic: "管理皮肤名称、分类和启用关系。",
  colors: "调整品牌色、页面色、文字色和状态色。",
  components: "控制按钮、导航、徽标、价格、优惠券、会员卡和分类图标样式。",
  product: "控制商品卡模板、卡片外壳、文案对齐和图片比例。",
  home: "控制首页布局、头部和 Banner 气质。",
  advanced: "控制圆角、阴影、动效、密度、字体和后台跟随策略。",
};

const CONFIG_FIELD_LABELS: Partial<Record<keyof ThemeConfig, string>> = {
  buttonStyle: "按钮样式",
  navStyle: "底部导航",
  badgeStyle: "徽标样式",
  priceStyle: "价格样式",
  couponStyle: "优惠券样式",
  memberCardStyle: "会员卡样式",
  categoryIconStyle: "分类图标样式",
  productCardVariant: "商品卡模板",
  cardStyle: "卡片外壳",
  cardTextAlign: "文案对齐",
  imageRatio: "商品图比例",
  imageFit: "商品图裁切",
  homeLayout: "首页布局",
  headerStyle: "头部样式",
  bannerStyle: "Banner 样式",
  radius: "全局圆角",
  shadowStyle: "阴影强度",
  motionLevel: "动效强度",
  density: "页面密度",
  adminThemeMode: "后台主题策略",
  fontFamily: "字体族",
};

type EnumFieldKey = Extract<keyof typeof enumOptions, keyof ThemeConfig>;
type TextFieldKey = Extract<"radius" | "fontFamily", keyof ThemeConfig>;

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
  return sectionId === "basic" ? "basic" : "colors";
}

function ThemeSelectField<K extends EnumFieldKey>({
  field,
  value,
  highlighted,
  onChange,
}: {
  field: K;
  value: ThemeConfig[K];
  highlighted: boolean;
  onChange: (field: K, value: ThemeConfig[K]) => void;
}) {
  const tl = useThemeStudioLabel();
  const options = enumOptions[field] as readonly ThemeConfig[K][];
  const label = CONFIG_FIELD_LABELS[field] || field;
  return (
    <label
      id={`theme-field-${field}`}
      className={`grid gap-1.5 rounded-xl border bg-background/60 p-3 transition ${
        highlighted ? "border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/20" : "border-border/80"
      }`}
    >
      <span className="text-xs font-semibold text-foreground">{tl(label)}</span>
      <select
        value={String(value)}
        onChange={(event) => onChange(field, event.target.value as ThemeConfig[K])}
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
      >
        {options.map((option) => (
          <option key={String(option)} value={String(option)}>
            {tl(enumValueLabels[String(option)] || String(option))}
          </option>
        ))}
      </select>
      <span className="text-[11px] leading-5 text-muted-foreground">{tl(FIELD_HELP_TEXTS[field] || "")}</span>
    </label>
  );
}

function ThemeTextField<K extends TextFieldKey>({
  field,
  value,
  placeholder,
  highlighted,
  onChange,
}: {
  field: K;
  value: ThemeConfig[K];
  placeholder?: string;
  highlighted: boolean;
  onChange: (field: K, value: ThemeConfig[K]) => void;
}) {
  const tl = useThemeStudioLabel();
  const label = CONFIG_FIELD_LABELS[field] || field;
  return (
    <label
      id={`theme-field-${field}`}
      className={`grid gap-1.5 rounded-xl border bg-background/60 p-3 transition ${
        highlighted ? "border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/20" : "border-border/80"
      }`}
    >
      <span className="text-xs font-semibold text-foreground">{tl(label)}</span>
      <input
        value={String(value)}
        onChange={(event) => onChange(field, event.target.value as ThemeConfig[K])}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
      />
      <span className="text-[11px] leading-5 text-muted-foreground">{tl(FIELD_HELP_TEXTS[field] || "")}</span>
    </label>
  );
}

function ThemeFieldGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const { tText } = useAdminT();
  return (
    <section className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
      <div className="mb-3">
        <AdminSectionTitle title={tText(title)} hint={tText(hint)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function ThemeEditorPanel({
  themeConfig,
  selectedSkin,
  isClientSkin,
  isHolidaySkin,
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
  const [highlightField, setHighlightField] = useState<keyof ThemeConfig | null>(null);
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
      if (target.autoAction) onAutoColor(target.autoAction);
      const field = target.fieldKeys?.[0] ?? null;
      if (!field) return;
      setHighlightField(field);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightField(null), 3500);
    },
    [onAutoColor, selectTab],
  );

  const statusText = useMemo(() => {
    if (isClientSkin && isHolidaySkin) return tText("这套皮肤同时作为前台日常皮肤和节日自动皮肤。");
    if (isClientSkin) return tText("这套皮肤是前台日常皮肤，非节日时前台会使用它。");
    if (isHolidaySkin) return tText("这套皮肤是节日自动皮肤，命中节日规则时前台会使用它。");
    return tText("这套皮肤目前只是皮肤库方案，保存后不会自动影响前台，除非设为日常皮肤或节日皮肤。");
  }, [isClientSkin, isHolidaySkin, tText]);

  return (
    <section ref={panelRef} className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-5 rounded-2xl border border-border/70 bg-secondary/25 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">{tText("设置分类")}</p>
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={tText("设置分类")}
        >
          {EDITOR_TABS.map((tab) => (
            <UnifiedButton
              key={tab.id}
              type="button"
              role="tab"
              data-theme-editor-tab={tab.id}
              aria-selected={activeTab === tab.id}
              aria-current={activeTab === tab.id ? "true" : undefined}
              onClick={() => selectTab(tab.id)}
              className={`shrink-0 touch-manipulation rounded-xl px-3 py-2 text-xs font-medium sm:py-1.5 ${
                activeTab === tab.id ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-secondary text-muted-foreground"
              }`}
            >
              {tl(tab.label)}
            </UnifiedButton>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{tl(TAB_PANEL_HINTS[activeTab])}</p>
      </div>

      <div ref={contentRef} className="min-h-[280px] space-y-5">
        {activeTab === "basic" ? (
          <section id="theme-section-basic" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
            <div className="mb-3">
              <AdminSectionTitle
                title={tText("基础信息")}
                hint={tText("皮肤名称、分类和前台启用关系。")}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">{tText("皮肤名称")}</span>
                <input
                  value={selectedSkin?.name || ""}
                  onChange={(e) => onSkinMetaChange({ name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-muted-foreground">{tText("皮肤描述")}</span>
                <textarea
                  value={selectedSkin?.description || ""}
                  onChange={(e) => onSkinMetaChange({ description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-border px-3 py-2 text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">{tText("皮肤分类")}</span>
                <input
                  value={selectedSkin?.category || ""}
                  onChange={(e) => onSkinMetaChange({ category: e.target.value })}
                  placeholder={tText("比如：日常商城 / 高端商城 / 节日活动")}
                  maxLength={32}
                  className="h-10 w-full rounded-xl border border-border px-3 text-xs"
                />
              </label>
              <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground md:col-span-2">{statusText}</p>

              <div className="md:col-span-2 rounded-xl border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
                {tText("这套皮肤的颜色、组件形态、商品卡、首页模块、动效和密度会同步到客户端；后台可读性仍由系统安全策略保护。")}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "colors" ? (
          <section id="theme-section-colors" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
            <div className="mb-3">
              <AdminSectionTitle
                title={tText("颜色系统")}
                hint={tText("品牌色、页面色、文字色和状态色会同步影响前台与预览。")}
              />
            </div>
            <div className="space-y-4">
              <div id="theme-auto-toolbar" className="flex flex-wrap gap-2">
                <UnifiedButton type="button" onClick={() => onAutoColor("secondary")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("自动生成辅色")}</UnifiedButton>
                <UnifiedButton type="button" onClick={() => onAutoColor("accent")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("自动生成强调色")}</UnifiedButton>
                <UnifiedButton type="button" onClick={() => onAutoColor("border")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("自动生成边框色")}</UnifiedButton>
                <UnifiedButton type="button" onClick={() => onAutoColor("textContrast")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("优化文字对比度")}</UnifiedButton>
                <UnifiedButton type="button" onClick={() => onAutoColor("foreground")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("生成前景色变量")}</UnifiedButton>
                {canUndoOptimize ? (
                  <UnifiedButton type="button" onClick={onUndoOptimize} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] ${THEME_OUTLINE_WARNING}`}><Undo2 size={12} />{tText("撤销优化")}</UnifiedButton>
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
              <div className="rounded-2xl border border-border/80 bg-background/45 p-4">
                <ThemeHealthCheck config={themeConfig} onGoToFix={goToFix} />
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "components" ? (
          <ThemeFieldGroup title="组件形态" hint="这些字段会同步改变客户端按钮、导航、标签、营销和会员模块。">
            {(["buttonStyle", "navStyle", "badgeStyle", "priceStyle", "couponStyle", "memberCardStyle", "categoryIconStyle"] as const).map((field) => (
              <ThemeSelectField
                key={field}
                field={field}
                value={themeConfig[field]}
                highlighted={highlightField === field}
                onChange={onConfigChange}
              />
            ))}
          </ThemeFieldGroup>
        ) : null}

        {activeTab === "product" ? (
          <ThemeFieldGroup title="商品卡" hint="控制商品列表、首页商品卡和分类页商品卡的结构气质。">
            {(["productCardVariant", "cardStyle", "cardTextAlign", "imageRatio", "imageFit"] as const).map((field) => (
              <ThemeSelectField
                key={field}
                field={field}
                value={themeConfig[field]}
                highlighted={highlightField === field}
                onChange={onConfigChange}
              />
            ))}
          </ThemeFieldGroup>
        ) : null}

        {activeTab === "home" ? (
          <ThemeFieldGroup title="首页模块" hint="控制首页布局、头部和 Banner 的整体呈现方式。">
            {(["homeLayout", "headerStyle", "bannerStyle"] as const).map((field) => (
              <ThemeSelectField
                key={field}
                field={field}
                value={themeConfig[field]}
                highlighted={highlightField === field}
                onChange={onConfigChange}
              />
            ))}
          </ThemeFieldGroup>
        ) : null}

        {activeTab === "advanced" ? (
          <ThemeFieldGroup title="高级设置" hint="控制全局圆角、阴影、动效、密度、字体和后台跟随策略。">
            <ThemeTextField
              field="radius"
              value={themeConfig.radius}
              placeholder="14px"
              highlighted={highlightField === "radius"}
              onChange={onConfigChange}
            />
            <ThemeSelectField
              field="shadowStyle"
              value={themeConfig.shadowStyle}
              highlighted={highlightField === "shadowStyle"}
              onChange={onConfigChange}
            />
            <ThemeSelectField
              field="motionLevel"
              value={themeConfig.motionLevel}
              highlighted={highlightField === "motionLevel"}
              onChange={onConfigChange}
            />
            <ThemeSelectField
              field="density"
              value={themeConfig.density}
              highlighted={highlightField === "density"}
              onChange={onConfigChange}
            />
            <ThemeSelectField
              field="adminThemeMode"
              value={themeConfig.adminThemeMode}
              highlighted={highlightField === "adminThemeMode"}
              onChange={onConfigChange}
            />
            <ThemeTextField
              field="fontFamily"
              value={themeConfig.fontFamily}
              placeholder="system-ui, -apple-system, sans-serif"
              highlighted={highlightField === "fontFamily"}
              onChange={onConfigChange}
            />
          </ThemeFieldGroup>
        ) : null}
      </div>
    </section>
  );
}
