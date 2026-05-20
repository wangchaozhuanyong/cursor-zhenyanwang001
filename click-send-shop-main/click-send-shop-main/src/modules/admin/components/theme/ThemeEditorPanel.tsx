import { Sparkles, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThemeConfig, ThemeSceneTag, ThemeSkin } from "@/types/theme";
import type { AutoColorAction } from "@/utils/themeStudioAuto";
import { THEME_OUTLINE_WARNING } from "@/utils/themeVisuals";
import AdminFieldHint, { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import ColorField from "./ColorField";
import ThemeHealthCheck from "./ThemeHealthCheck";
import type { ThemeHealthFixTarget } from "./themeHealthFixMeta";
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
  const help = fieldKey ? FIELD_HELP_TEXTS[fieldKey] : undefined;
  return (
    <label className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {help ? <AdminFieldHint text={help} /> : null}
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-10 w-full rounded-xl border border-border bg-background px-2 text-xs">
        {options.map((option) => (
          <option key={option} value={option}>
            {enumValueLabels[option] || option}
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
  const panelRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<EditorTabId>("basic");
  const [highlightField, setHighlightField] = useState<ColorFieldKey | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  const goToFix = useCallback(
    (target: ThemeHealthFixTarget) => {
      setActiveTab(mapHealthSectionToTab(target.sectionId));
      if (target.autoAction) {
        onAutoColor(target.autoAction);
      }
      const field = target.fieldKeys?.[0] ?? null;
      if (field) {
        setHighlightField(field);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setHighlightField(null), 3500);
      }
      window.requestAnimationFrame(() => {
        if (field) {
          panelRef.current?.querySelector(`#theme-field-${field}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    },
    [onAutoColor],
  );

  const statusText = useMemo(() => {
    if (isDefaultSkin) return "当前是默认皮肤。默认皮肤仅影响新用户默认看到的样式。";
    return "当前不是默认皮肤。可在顶部或皮肤卡菜单设为默认。";
  }, [isDefaultSkin]);

  return (
    <section ref={panelRef} className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-5 rounded-2xl border border-border/70 bg-secondary/25 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">快速定位设置区</p>
        <div className="flex flex-wrap gap-2">
        {EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              window.requestAnimationFrame(() => panelRef.current?.querySelector(`#theme-section-${tab.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
              activeTab === tab.id ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-secondary text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      <div className="space-y-5">
      <section id="theme-section-basic" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title="基础信息" hint="皮肤名称、适用场景和前台可见状态。" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">皮肤名称</span>
            <input
              value={selectedSkin?.name || ""}
              onChange={(e) => onSkinMetaChange({ name: e.target.value })}
              className="h-10 w-full rounded-xl border border-border px-3 text-sm"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">皮肤描述</span>
            <textarea
              value={selectedSkin?.description || ""}
              onChange={(e) => onSkinMetaChange({ description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-border px-3 py-2 text-xs"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">适合场景</span>
            <select
              value={selectedSkin?.sceneTag || "default"}
              onChange={(e) => onSkinMetaChange({ sceneTag: e.target.value as ThemeSceneTag })}
              className="h-10 w-full rounded-xl border border-border px-2 text-xs"
            >
              {Object.entries(SCENE_TAG_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
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

      <section id="theme-section-colors" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title="颜色系统" hint="品牌色、页面色、文字色和状态色会同步影响前台与预览。" />
        </div>
        <div className="space-y-4">
          <div id="theme-auto-toolbar" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onAutoColor("secondary")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />自动生成辅色</button>
            <button type="button" onClick={() => onAutoColor("accent")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />自动生成强调色</button>
            <button type="button" onClick={() => onAutoColor("border")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />自动生成边框色</button>
            <button type="button" onClick={() => onAutoColor("textContrast")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />优化文字对比度</button>
            <button type="button" onClick={() => onAutoColor("foreground")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />生成前景色变量</button>
            {canUndoOptimize ? (
              <button type="button" onClick={onUndoOptimize} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] ${THEME_OUTLINE_WARNING}`}><Undo2 size={12} />撤销优化</button>
            ) : null}
          </div>

          {colorTabSections.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
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

      <section id="theme-section-components" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title="组件风格" hint="按钮、导航、圆角、阴影、动效与页面密度。" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectRow fieldKey="buttonStyle" label="按钮风格" value={themeConfig.buttonStyle} options={enumOptions.buttonStyle} onChange={(v) => onConfigChange("buttonStyle", v)} />
          <SelectRow fieldKey="navStyle" label="底部导航" value={themeConfig.navStyle} options={enumOptions.navStyle} onChange={(v) => onConfigChange("navStyle", v)} />
          <label className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">圆角 radius</span>
              <AdminFieldHint text={FIELD_HELP_TEXTS.radius} />
            </div>
            <input value={themeConfig.radius} onChange={(e) => onConfigChange("radius", e.target.value)} className="h-10 w-full rounded-xl border border-border px-2 text-xs" />
          </label>
          <SelectRow fieldKey="shadowStyle" label="阴影" value={themeConfig.shadowStyle} options={enumOptions.shadowStyle} onChange={(v) => onConfigChange("shadowStyle", v)} />
          <SelectRow fieldKey="motionLevel" label="动效" value={themeConfig.motionLevel} options={enumOptions.motionLevel} onChange={(v) => onConfigChange("motionLevel", v)} />
          <SelectRow fieldKey="density" label="密度" value={themeConfig.density} options={enumOptions.density} onChange={(v) => onConfigChange("density", v)} />
        </div>
      </section>

      <section id="theme-section-product" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title="商品展示" hint="商品卡片、图片比例、价格与徽标样式。" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectRow fieldKey="productCardVariant" label="商品卡变体" value={themeConfig.productCardVariant} options={enumOptions.productCardVariant} onChange={(v) => onConfigChange("productCardVariant", v)} />
          <SelectRow fieldKey="cardStyle" label="卡片风格" value={themeConfig.cardStyle} options={enumOptions.cardStyle} onChange={(v) => onConfigChange("cardStyle", v)} />
          <SelectRow fieldKey="cardTextAlign" label="文字对齐" value={themeConfig.cardTextAlign} options={enumOptions.cardTextAlign} onChange={(v) => onConfigChange("cardTextAlign", v)} />
          <SelectRow fieldKey="imageRatio" label="图片比例" value={themeConfig.imageRatio} options={enumOptions.imageRatio} onChange={(v) => onConfigChange("imageRatio", v)} />
          <SelectRow fieldKey="imageFit" label="图片填充" value={themeConfig.imageFit} options={enumOptions.imageFit} onChange={(v) => onConfigChange("imageFit", v)} />
          <SelectRow fieldKey="priceStyle" label="价格样式" value={themeConfig.priceStyle} options={enumOptions.priceStyle} onChange={(v) => onConfigChange("priceStyle", v)} />
          <SelectRow fieldKey="badgeStyle" label="标签风格" value={themeConfig.badgeStyle} options={enumOptions.badgeStyle} onChange={(v) => onConfigChange("badgeStyle", v)} />
        </div>
      </section>

      <section id="theme-section-home" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle title="首页与营销" hint="首页布局、头部、Banner、优惠券、会员卡和分类图标。" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectRow fieldKey="homeLayout" label="首页布局" value={themeConfig.homeLayout} options={enumOptions.homeLayout} onChange={(v) => onConfigChange("homeLayout", v)} />
          <SelectRow fieldKey="headerStyle" label="头部风格" value={themeConfig.headerStyle} options={enumOptions.headerStyle} onChange={(v) => onConfigChange("headerStyle", v)} />
          <SelectRow fieldKey="bannerStyle" label="Banner" value={themeConfig.bannerStyle} options={enumOptions.bannerStyle} onChange={(v) => onConfigChange("bannerStyle", v)} />
          <SelectRow fieldKey="couponStyle" label="优惠券" value={themeConfig.couponStyle} options={enumOptions.couponStyle} onChange={(v) => onConfigChange("couponStyle", v)} />
          <SelectRow fieldKey="memberCardStyle" label="会员卡" value={themeConfig.memberCardStyle} options={enumOptions.memberCardStyle} onChange={(v) => onConfigChange("memberCardStyle", v)} />
          <SelectRow fieldKey="categoryIconStyle" label="分类图标" value={themeConfig.categoryIconStyle} options={enumOptions.categoryIconStyle} onChange={(v) => onConfigChange("categoryIconStyle", v)} />
        </div>
      </section>

      <section id="theme-section-advanced" className="rounded-2xl border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3">
          <AdminSectionTitle
            title="高级与体检"
            hint="后台主题模式、字体和可访问性体检建议。CSS 变量会由系统根据当前配置自动生成并同步，不需要手动维护。"
          />
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SelectRow fieldKey="adminThemeMode" label="后台主题模式" value={themeConfig.adminThemeMode} options={enumOptions.adminThemeMode} onChange={(v) => onConfigChange("adminThemeMode", v)} />
            <label className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">字体</span>
                <AdminFieldHint text={FIELD_HELP_TEXTS.fontFamily} />
              </div>
              <input value={themeConfig.fontFamily} onChange={(e) => onConfigChange("fontFamily", e.target.value)} className="h-10 w-full rounded-xl border border-border px-2 text-xs" />
            </label>
          </div>
          <ThemeHealthCheck config={themeConfig} onGoToFix={goToFix} />
        </div>
      </section>
      </div>
    </section>
  );
}
