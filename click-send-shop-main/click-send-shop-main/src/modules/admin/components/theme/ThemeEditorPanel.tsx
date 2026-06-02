import { Sparkles, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { LOCKED_STOREFRONT_THEME_FIELDS } from "@/constants/themeDesignLocks";
import { useAdminT } from "@/hooks/useAdminT";
import { useThemeStudioLabel } from "@/hooks/useThemeStudioLabel";
import type { ThemeConfig, ThemeSkin } from "@/types/theme";
import type { AutoColorAction } from "@/utils/themeStudioAuto";
import { THEME_OUTLINE_WARNING } from "@/utils/themeVisuals";
import ColorField from "./ColorField";
import ThemeHealthCheck from "./ThemeHealthCheck";
import type { ThemeHealthFixTarget } from "./themeHealthFixMeta";
import type { ColorFieldKey } from "./themeStudioConstants";

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
const EDITOR_TABS = [
  { id: "basic", label: "基础" },
  { id: "colors", label: "颜色" },
] as const;

type EditorTabId = (typeof EDITOR_TABS)[number]["id"];

const TAB_PANEL_HINTS: Record<EditorTabId, string> = {
  basic: "管理皮肤名称、分类和启用关系；前台骨架由系统统一。",
  colors: "只调整品牌色、页面色、文字色和状态色。",
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
  return sectionId === "basic" ? "basic" : "colors";
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
            <button
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
            </button>
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

              <div data-testid="theme-design-lock-summary" className="md:col-span-2 border-t border-border/70 pt-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{tText("统一视觉骨架")}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {tText("商品卡、优惠券、导航和首页结构由系统套装统一，后台只调整品牌气质，避免页面越调越散。")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {LOCKED_STOREFRONT_THEME_FIELDS.map((item) => (
                    <div
                      key={item.key}
                      data-theme-lock-field={item.key}
                      className="flex items-center justify-between gap-2 rounded-lg bg-secondary/45 px-2.5 py-2 text-[11px]"
                    >
                      <span className="font-medium text-foreground">{tl(item.label)}</span>
                      <span className="text-muted-foreground">{tl(item.reason)}</span>
                    </div>
                  ))}
                </div>
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
                <button type="button" onClick={() => onAutoColor("secondary")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("自动生成辅色")}</button>
                <button type="button" onClick={() => onAutoColor("accent")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("自动生成强调色")}</button>
                <button type="button" onClick={() => onAutoColor("border")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("自动生成边框色")}</button>
                <button type="button" onClick={() => onAutoColor("textContrast")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("优化文字对比度")}</button>
                <button type="button" onClick={() => onAutoColor("foreground")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] hover:bg-secondary"><Sparkles size={12} />{tText("生成前景色变量")}</button>
                {canUndoOptimize ? (
                  <button type="button" onClick={onUndoOptimize} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] ${THEME_OUTLINE_WARNING}`}><Undo2 size={12} />{tText("撤销优化")}</button>
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
      </div>
    </section>
  );
}
