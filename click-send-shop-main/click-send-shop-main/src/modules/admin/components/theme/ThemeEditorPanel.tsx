import { ChevronDown, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { useState } from "react";
import type { ThemeConfig, ThemeSceneTag, ThemeSkin } from "@/types/theme";
import type { AutoColorAction } from "@/utils/themeStudioAuto";
import ColorField from "./ColorField";
import ThemeHealthCheck from "./ThemeHealthCheck";
import {
  EDITOR_GROUP_LABELS,
  enumOptions,
  enumValueLabels,
  SCENE_TAG_LABELS,
  type ColorFieldKey,
  type EditorGroupId,
} from "./themeStudioConstants";

function EditorSection({
  id,
  title,
  defaultOpen,
  children,
  onReset,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">{title}</span>
        <span className="flex items-center gap-2">
          {onReset ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              onKeyDown={(e) => e.key === "Enter" && onReset()}
              className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary"
            >
              重置分组
            </span>
          ) : null}
          <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? <div className="border-t border-border px-4 pb-4 pt-2">{children}</div> : null}
    </div>
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {toLabel(option)}
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
  presetConfig?: ThemeConfig;
  onConfigChange: <K extends keyof ThemeConfig>(field: K, value: ThemeConfig[K]) => void;
  onSkinMetaChange: (patch: Partial<Pick<ThemeSkin, "name" | "description" | "sceneTag" | "clientEnabled">>) => void;
  onSetDefaultToggle: (checked: boolean) => void;
  onAutoColor: (action: AutoColorAction) => void;
  onResetGroup: (group: string) => void;
  canUndoOptimize: boolean;
  onUndoOptimize: () => void;
};

const colorGroups: Record<string, ColorFieldKey[]> = {
  colors: ["bgColor", "surfaceColor", "primaryColor", "secondaryColor", "accentColor", "priceColor"],
  text: ["textColor", "mutedTextColor", "borderColor"],
  status: ["successColor", "warningColor", "dangerColor"],
};

export default function ThemeEditorPanel({
  themeConfig,
  selectedSkin,
  isDefaultSkin,
  presetConfig: _preset,
  onConfigChange,
  onSkinMetaChange,
  onSetDefaultToggle,
  onAutoColor,
  onResetGroup,
  canUndoOptimize,
  onUndoOptimize,
}: ThemeEditorPanelProps) {
  return (
    <section className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card/50 p-3 lg:max-h-[calc(100vh-110px)]">
      <div className="mb-3 space-y-2">
        <p className="text-sm text-muted-foreground">编辑皮肤参数，右侧实时预览。保存后应用到全站。</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAutoColor("secondary")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-secondary">
            <Sparkles size={12} /> 自动生成辅色
          </button>
          <button type="button" onClick={() => onAutoColor("accent")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-secondary">
            <Sparkles size={12} /> 自动生成强调色
          </button>
          <button type="button" onClick={() => onAutoColor("border")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-secondary">
            <Sparkles size={12} /> 自动生成边框色
          </button>
          <button type="button" onClick={() => onAutoColor("textContrast")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-secondary">
            <Sparkles size={12} /> 优化文字对比度
          </button>
          <button type="button" onClick={() => onAutoColor("foreground")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-secondary">
            <Sparkles size={12} /> 生成前景色变量
          </button>
          {canUndoOptimize ? (
            <button type="button" onClick={onUndoOptimize} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
              <Undo2 size={12} /> 撤销优化
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <EditorSection id="basic" title={EDITOR_GROUP_LABELS.basic} defaultOpen>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs text-muted-foreground">皮肤名称</span>
              <input
                value={selectedSkin?.name || ""}
                onChange={(e) => onSkinMetaChange({ name: e.target.value })}
                className="h-9 w-full rounded-lg border border-border px-2 text-sm"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs text-muted-foreground">皮肤描述</span>
              <textarea
                value={selectedSkin?.description || ""}
                onChange={(e) => onSkinMetaChange({ description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">适合场景</span>
              <select
                value={selectedSkin?.sceneTag || "default"}
                onChange={(e) => onSkinMetaChange({ sceneTag: e.target.value as ThemeSceneTag })}
                className="h-9 w-full rounded-lg border border-border px-2 text-xs"
              >
                {Object.entries(SCENE_TAG_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={selectedSkin?.clientEnabled !== false}
                onChange={(e) => onSkinMetaChange({ clientEnabled: e.target.checked })}
              />
              前台可切换
            </label>
            <label className="flex items-center gap-2 text-xs md:col-span-2">
              <input type="checkbox" checked={isDefaultSkin} onChange={(e) => onSetDefaultToggle(e.target.checked)} />
              设为默认皮肤
            </label>
          </div>
        </EditorSection>

        {(Object.entries(colorGroups) as [EditorGroupId, ColorFieldKey[]][]).map(([group, fields]) => (
          <EditorSection
            key={group}
            id={group}
            title={EDITOR_GROUP_LABELS[group]}
            defaultOpen={group === "colors"}
            onReset={() => onResetGroup(group)}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((field) => (
                <ColorField
                  key={field}
                  field={field}
                  value={themeConfig[field]}
                  config={themeConfig}
                  onChange={(v) => onConfigChange(field, v)}
                />
              ))}
            </div>
          </EditorSection>
        ))}

        <EditorSection id="buttons" title={EDITOR_GROUP_LABELS.buttons} onReset={() => onResetGroup("buttons")}>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectRow label="按钮风格" value={themeConfig.buttonStyle} options={enumOptions.buttonStyle} onChange={(v) => onConfigChange("buttonStyle", v)} />
            <SelectRow label="底部导航" value={themeConfig.navStyle} options={enumOptions.navStyle} onChange={(v) => onConfigChange("navStyle", v)} />
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">圆角 radius</span>
              <input value={themeConfig.radius} onChange={(e) => onConfigChange("radius", e.target.value)} className="h-9 w-full rounded-lg border border-border px-2 text-xs" />
            </label>
            <SelectRow label="阴影" value={themeConfig.shadowStyle} options={enumOptions.shadowStyle} onChange={(v) => onConfigChange("shadowStyle", v)} />
            <SelectRow label="动效" value={themeConfig.motionLevel} options={enumOptions.motionLevel} onChange={(v) => onConfigChange("motionLevel", v)} />
            <SelectRow label="密度" value={themeConfig.density} options={enumOptions.density} onChange={(v) => onConfigChange("density", v)} />
          </div>
        </EditorSection>

        <EditorSection id="card" title={EDITOR_GROUP_LABELS.card} onReset={() => onResetGroup("card")}>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectRow label="商品卡变体" value={themeConfig.productCardVariant} options={enumOptions.productCardVariant} onChange={(v) => onConfigChange("productCardVariant", v)} />
            <SelectRow label="卡片风格" value={themeConfig.cardStyle} options={enumOptions.cardStyle} onChange={(v) => onConfigChange("cardStyle", v)} />
            <SelectRow label="文字对齐" value={themeConfig.cardTextAlign} options={enumOptions.cardTextAlign} onChange={(v) => onConfigChange("cardTextAlign", v)} />
            <SelectRow label="图片比例" value={themeConfig.imageRatio} options={enumOptions.imageRatio} onChange={(v) => onConfigChange("imageRatio", v)} />
            <SelectRow label="图片填充" value={themeConfig.imageFit} options={enumOptions.imageFit} onChange={(v) => onConfigChange("imageFit", v)} />
            <SelectRow label="价格样式" value={themeConfig.priceStyle} options={enumOptions.priceStyle} onChange={(v) => onConfigChange("priceStyle", v)} />
          </div>
        </EditorSection>

        <EditorSection id="marketing" title={EDITOR_GROUP_LABELS.marketing} onReset={() => onResetGroup("marketing")}>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectRow label="首页布局" value={themeConfig.homeLayout} options={enumOptions.homeLayout} onChange={(v) => onConfigChange("homeLayout", v)} />
            <SelectRow label="头部风格" value={themeConfig.headerStyle} options={enumOptions.headerStyle} onChange={(v) => onConfigChange("headerStyle", v)} />
            <SelectRow label="Banner" value={themeConfig.bannerStyle} options={enumOptions.bannerStyle} onChange={(v) => onConfigChange("bannerStyle", v)} />
            <SelectRow label="优惠券" value={themeConfig.couponStyle} options={enumOptions.couponStyle} onChange={(v) => onConfigChange("couponStyle", v)} />
            <SelectRow label="会员卡" value={themeConfig.memberCardStyle} options={enumOptions.memberCardStyle} onChange={(v) => onConfigChange("memberCardStyle", v)} />
            <SelectRow label="分类图标" value={themeConfig.categoryIconStyle} options={enumOptions.categoryIconStyle} onChange={(v) => onConfigChange("categoryIconStyle", v)} />
            <SelectRow label="标签风格" value={themeConfig.badgeStyle} options={enumOptions.badgeStyle} onChange={(v) => onConfigChange("badgeStyle", v)} />
          </div>
        </EditorSection>

        <EditorSection id="advanced" title={EDITOR_GROUP_LABELS.advanced} onReset={() => onResetGroup("advanced")}>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectRow label="后台主题模式" value={themeConfig.adminThemeMode} options={enumOptions.adminThemeMode} onChange={(v) => onConfigChange("adminThemeMode", v)} />
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">字体</span>
              <input value={themeConfig.fontFamily} onChange={(e) => onConfigChange("fontFamily", e.target.value)} className="h-9 w-full rounded-lg border border-border px-2 text-xs" />
            </label>
            <p className="md:col-span-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
              自定义 CSS 变量由系统自动从配色生成（--theme-primary 等）。保存后客户端与管理后台同步生效。
            </p>
          </div>
        </EditorSection>

        <EditorSection id="health" title={EDITOR_GROUP_LABELS.health}>
          <ThemeHealthCheck config={themeConfig} />
        </EditorSection>
      </div>
    </section>
  );
}
