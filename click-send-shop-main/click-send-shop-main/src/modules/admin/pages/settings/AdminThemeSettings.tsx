import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Settings2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_HOLIDAY_SKIN_ID, DEFAULT_SKIN_ID, DEFAULT_THEME_HOLIDAY_RULES, THEME_PRESETS } from "@/constants/themePresets";
import { AdminThemeStudioSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { AnimatedConfirmDialog } from "@/modules/micro-interactions";
import ThemeEditorPanel from "@/modules/admin/components/theme/ThemeEditorPanel";
import ThemeFullscreenPreview from "@/modules/admin/components/theme/ThemeFullscreenPreview";
import ThemePreviewDock from "@/modules/admin/components/theme/ThemePreviewDock";
import ThemeSkinSidebar from "@/modules/admin/components/theme/ThemeSkinSidebar";
import ThemeStudioHeader from "@/modules/admin/components/theme/ThemeStudioHeader";
import type { PreviewDevice, PreviewMode } from "@/modules/admin/components/theme/themeStudioConstants";
import { AdminSideDrawer } from "@/modules/admin/components/AdminSideDrawer";
import { notifyGlobalThemeUpdated } from "@/lib/themeRevision";
import { fetchThemeSkins, saveSystemThemeSkins } from "@/services/admin/themeService";
import type { ThemeConfig, ThemeHolidayRule, ThemeSkin } from "@/types/theme";
import { toastErrorMessage } from "@/utils/errorMessage";
import { normalizeThemeConfig, normalizeThemeSkinsPayload } from "@/utils/themeConfig";
import { applyAutoColorAction, type AutoColorAction } from "@/utils/themeStudioAuto";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminDirtyForm } from "@/modules/admin/hooks/useAdminDirtyForm";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function applyThemePayload(
  normalized: ReturnType<typeof normalizeThemeSkinsPayload>,
  setters: {
    setSkins: (v: ThemeSkin[]) => void;
    setDefaultSkinId: (v: string) => void;
    setActiveSkinId: (v: string) => void;
    setRuntimeSkinId: (v: string | undefined) => void;
    setHolidaySkinId: (v: string) => void;
    setHolidayRules: (v: ThemeHolidayRule[]) => void;
    setSelectedSkinId: (v: string) => void;
    setThemeConfig: (v: ThemeConfig) => void;
  },
  options?: { selectedSkinId?: string },
) {
  setters.setSkins(normalized.skins);
  setters.setDefaultSkinId(normalized.defaultSkinId);
  setters.setActiveSkinId(normalized.activeSkinId);
  setters.setRuntimeSkinId(normalized.runtimeSkinId);
  setters.setHolidaySkinId(normalized.holidaySkinId);
  setters.setHolidayRules(normalized.holidayRules);
  const preferred = options?.selectedSkinId;
  const selectedId =
    preferred && normalized.skins.some((s) => s.id === preferred)
      ? preferred
      : normalized.activeSkinId;
  setters.setSelectedSkinId(selectedId);
  const current = normalized.skins.find((s) => s.id === selectedId) || normalized.skins[0];
  setters.setThemeConfig(normalizeThemeConfig(current?.config));
}

function monthDayFromDate(date = new Date()) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}-${day}`;
}

function isMonthDayInRange(value: string, start: string, end: string) {
  if (start <= end) return value >= start && value <= end;
  return value >= start || value <= end;
}

function getActiveHolidayRuleIds(rules: ThemeHolidayRule[], date = new Date()) {
  const today = monthDayFromDate(date);
  return rules
    .filter((rule) => rule.enabled && isMonthDayInRange(today, rule.start, rule.end))
    .map((rule) => rule.id);
}

export default function AdminThemeSettings() {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = useCallback((zh: string, en: string) => (isEn ? en : zh), [isEn]);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [skins, setSkins] = useState<ThemeSkin[]>([]);
  const [defaultSkinId, setDefaultSkinId] = useState(DEFAULT_SKIN_ID);
  const [activeSkinId, setActiveSkinId] = useState(DEFAULT_SKIN_ID);
  const [runtimeSkinId, setRuntimeSkinId] = useState<string | undefined>(undefined);
  const [holidaySkinId, setHolidaySkinId] = useState(DEFAULT_HOLIDAY_SKIN_ID);
  const [holidayRules, setHolidayRules] = useState<ThemeHolidayRule[]>(DEFAULT_THEME_HOLIDAY_RULES);
  const [selectedSkinId, setSelectedSkinId] = useState(DEFAULT_SKIN_ID);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(normalizeThemeConfig(THEME_PRESETS[0]?.config));
  const [dirty, setDirty] = useState(false);
  const [pendingSkinId, setPendingSkinId] = useState<string | null>(null);
  const [skinSearch, setSkinSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("home");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("phone");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [holidayDrawerOpen, setHolidayDrawerOpen] = useState(false);
  const undoSnapshot = useRef<ThemeConfig | null>(null);
  const skipServerSyncRef = useRef(false);
  const hasAppliedServerThemeRef = useRef(false);

  const selectedSkin = useMemo(() => skins.find((s) => s.id === selectedSkinId), [skins, selectedSkinId]);
  const activeSkinName = skins.find((skin) => skin.id === activeSkinId)?.name || activeSkinId;
  const defaultSkinName = skins.find((skin) => skin.id === defaultSkinId)?.name || defaultSkinId;
  const holidaySkinName = skins.find((skin) => skin.id === holidaySkinId)?.name || holidaySkinId;
  const runtimeSkinName = runtimeSkinId ? skins.find((skin) => skin.id === runtimeSkinId)?.name || runtimeSkinId : defaultSkinName;
  const isSelectedClientSkin = selectedSkinId === activeSkinId;
  const isSelectedHolidaySkin = selectedSkinId === holidaySkinId;
  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    skins.forEach((skin) => {
      const category = skin.category?.trim();
      if (category) values.add(category);
    });
    return Array.from(values);
  }, [skins]);
  const enabledHolidayRuleCount = useMemo(
    () => holidayRules.filter((rule) => rule.enabled).length,
    [holidayRules],
  );
  const activeHolidayRuleIds = useMemo(() => getActiveHolidayRuleIds(holidayRules), [holidayRules]);
  const isHolidayRuleActiveNow = activeHolidayRuleIds.length > 0;

  const themeQuery = useQuery({
    queryKey: adminQueryKeys.themeSkins(),
    queryFn: fetchThemeSkins,
    staleTime: 60_000,
  });

  const loading = themeQuery.isLoading && !themeQuery.data;
  const { markSaved } = useAdminDirtyForm({ isDirty: dirty, isReady: !loading });

  useEffect(() => {
    if (skipServerSyncRef.current) return;
    if (themeQuery.isError) {
      toast.error(toastErrorMessage(themeQuery.error, L("加载皮肤配置失败，已使用本地预设", "Failed to load theme config; using local presets")));
      applyThemePayload(normalizeThemeSkinsPayload({ skins: THEME_PRESETS }), {
        setSkins,
        setDefaultSkinId,
        setActiveSkinId,
        setRuntimeSkinId,
        setHolidaySkinId,
        setHolidayRules,
        setSelectedSkinId,
        setThemeConfig,
      });
      return;
    }
    if (!themeQuery.data || dirty) return;
    const data = themeQuery.data;
    const normalized = normalizeThemeSkinsPayload({
      defaultSkinId: data?.defaultSkinId,
      activeSkinId: data?.activeSkinId || data?.defaultSkinId,
      runtimeSkinId: data?.runtimeSkinId,
      holidaySkinId: data?.holidaySkinId,
      holidayRules: data?.holidayRules,
      skins: Array.isArray(data?.skins) ? data.skins : THEME_PRESETS,
    });
    const shouldPreserveSelectedSkin = hasAppliedServerThemeRef.current;
    applyThemePayload(normalized, { setSkins, setDefaultSkinId, setActiveSkinId, setRuntimeSkinId, setHolidaySkinId, setHolidayRules, setSelectedSkinId, setThemeConfig }, {
      selectedSkinId: shouldPreserveSelectedSkin ? selectedSkinId : undefined,
    });
    hasAppliedServerThemeRef.current = true;
  }, [themeQuery.data, themeQuery.isError, themeQuery.error, dirty, selectedSkinId, L]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const applySavedPayload = (
    saved: Awaited<ReturnType<typeof saveSystemThemeSkins>>,
    options?: { selectedSkinId?: string },
  ) => {
    const normalized = normalizeThemeSkinsPayload(saved);
    skipServerSyncRef.current = true;
    applyThemePayload(normalized, { setSkins, setDefaultSkinId, setActiveSkinId, setRuntimeSkinId, setHolidaySkinId, setHolidayRules, setSelectedSkinId, setThemeConfig }, options);
    skipServerSyncRef.current = false;
    queryClient.setQueryData(adminQueryKeys.themeSkins(), saved);
    notifyGlobalThemeUpdated();
    setDirty(false);
    markSaved();
  };

  const persist = async (
    nextSkins: ThemeSkin[],
    nextDefaultSkinId: string,
    nextActiveSkinId: string,
    message: string,
    options?: { selectedSkinId?: string; nextHolidaySkinId?: string; nextHolidayRules?: ThemeHolidayRule[] },
  ) => {
    const nextHolidaySkinId = options?.nextHolidaySkinId ?? holidaySkinId;
    const nextHolidayRules = options?.nextHolidayRules ?? holidayRules;
    const normalized = normalizeThemeSkinsPayload({
      defaultSkinId: nextDefaultSkinId,
      activeSkinId: nextActiveSkinId,
      holidaySkinId: nextHolidaySkinId,
      holidayRules: nextHolidayRules,
      skins: nextSkins,
    });
    setSaving(true);
    try {
      const saved = await saveSystemThemeSkins({
        defaultSkinId: normalized.defaultSkinId,
        activeSkinId: normalized.activeSkinId,
        runtimeSkinId: normalized.runtimeSkinId,
        holidaySkinId: normalized.holidaySkinId,
        holidayRules: normalized.holidayRules,
        skins: normalized.skins,
      });
      applySavedPayload(saved, { selectedSkinId: options?.selectedSkinId ?? selectedSkinId });
      toast.success(message);
    } catch (error) {
      toast.error(toastErrorMessage(error, L("保存失败", "Save failed")));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = useCallback(
    <K extends keyof ThemeConfig>(field: K, value: ThemeConfig[K]) => {
      const next = normalizeThemeConfig({ ...themeConfig, [field]: value });
      setThemeConfig(next);
      setSkins((prev) => prev.map((skin) => (skin.id === selectedSkinId ? { ...skin, config: next } : skin)));
      setDirty(true);
    },
    [themeConfig, selectedSkinId],
  );

  const onSkinMetaChange = (patch: Partial<Pick<ThemeSkin, "name" | "description" | "category">>) => {
    setSkins((prev) =>
      prev.map((skin) => (skin.id === selectedSkinId ? { ...skin, ...patch, name: patch.name ?? skin.name } : skin)),
    );
    setDirty(true);
  };

  const onHolidaySkinChange = (id: string) => {
    setHolidaySkinId(id);
    setHolidayRules((prev) => prev.map((rule) => ({ ...rule, skinId: id })));
    setDirty(true);
  };

  const onHolidayRuleChange = (ruleId: string, patch: Partial<ThemeHolidayRule>) => {
    setHolidayRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
    );
    setDirty(true);
  };

  const applySkinSwitch = (id: string) => {
    setSelectedSkinId(id);
    const target = skins.find((s) => s.id === id);
    setThemeConfig(normalizeThemeConfig(target?.config));
    setDirty(false);
    markSaved();
    undoSnapshot.current = null;
  };

  const onSelectSkin = (id: string) => {
    if (id === selectedSkinId) return;
    if (dirty) {
      setPendingSkinId(id);
      return;
    }
    applySkinSwitch(id);
  };

  const buildNextSkins = () => {
    const name = selectedSkin?.name?.trim();
    if (!name) return null;
    return skins.map((s) => (s.id === selectedSkinId ? { ...s, config: themeConfig, name } : s));
  };

  const onSaveSettings = async () => {
    const nextSkins = buildNextSkins();
    if (!nextSkins) return toast.error(L("皮肤名称不能为空", "Skin name cannot be empty"));
    try {
      await persist(nextSkins, defaultSkinId, activeSkinId, L("已保存皮肤配置", "Skin settings saved"), { selectedSkinId });
    } catch {
      // noop
    }
  };

  const onSetClientSkin = async () => {
    const nextSkins = buildNextSkins();
    if (!nextSkins) return toast.error(L("皮肤名称不能为空", "Skin name cannot be empty"));
    const nextHolidayRules = isHolidayRuleActiveNow
      ? holidayRules.map((rule) => (activeHolidayRuleIds.includes(rule.id) ? { ...rule, skinId: selectedSkinId } : rule))
      : holidayRules;
    try {
      await persist(
        nextSkins,
        selectedSkinId,
        selectedSkinId,
        isHolidayRuleActiveNow
          ? L("已设为默认皮肤，并同步当前节日规则", "Set as default and synced current holiday rule")
          : L("已设为客户端日常皮肤", "Set as storefront daily skin"),
        {
          selectedSkinId,
          nextHolidaySkinId: isHolidayRuleActiveNow ? selectedSkinId : holidaySkinId,
          nextHolidayRules,
        },
      );
    } catch {
      // noop
    }
  };

  const onSetHolidaySkin = async () => {
    const nextSkins = buildNextSkins();
    if (!nextSkins) return toast.error(L("皮肤名称不能为空", "Skin name cannot be empty"));
    const nextHolidayRules = holidayRules.map((rule) => ({ ...rule, skinId: selectedSkinId }));
    setHolidaySkinId(selectedSkinId);
    setHolidayRules(nextHolidayRules);
    try {
      await persist(nextSkins, defaultSkinId, activeSkinId, L("已设为节日自动皮肤", "Set as holiday skin"), {
        selectedSkinId,
        nextHolidaySkinId: selectedSkinId,
        nextHolidayRules,
      });
    } catch {
      // noop
    }
  };

  const onAutoColor = (action: AutoColorAction) => {
    undoSnapshot.current = themeConfig;
    const next = applyAutoColorAction(themeConfig, action);
    setThemeConfig(next);
    setSkins((prev) => prev.map((s) => (s.id === selectedSkinId ? { ...s, config: next } : s)));
    setDirty(true);
    toast.success(L("已自动优化，可在预览区确认效果", "Auto-optimized; check the preview area"));
  };

  const openClientPreview = useCallback(() => {
    setPreviewMode("home");
    setPreviewDevice("phone");
    setFullscreenOpen(true);
  }, []);

  const openAdminPreview = useCallback(() => {
    setPreviewMode("admin_home");
    setPreviewDevice("desktop");
    setFullscreenOpen(true);
  }, []);

  return (
    <AdminPageShell hint={L("统一管理前台、移动端和管理后台的视觉风格；保存草稿或保存并应用后才会写入站点配置。", "Manage the visual style for storefront, mobile, and admin in one place; changes are written only after saving draft or saving and applying.")}>
    <div className="w-full bg-muted/20 p-2 pb-12 sm:p-4">
      {loading ? (
        <AdminThemeStudioSkeleton />
      ) : (
        <>
          <ThemeStudioHeader
            skinName={selectedSkin?.name || ""}
            activeSkinName={activeSkinName}
            runtimeSkinName={runtimeSkinName}
            isClientSkin={isSelectedClientSkin}
            isHolidaySkin={isSelectedHolidaySkin}
            dirty={dirty}
            saving={saving}
            saveDisabled={!selectedSkin?.name?.trim()}
            onClientPreview={openClientPreview}
            onAdminPreview={openAdminPreview}
            onFullscreenPreview={() => setFullscreenOpen(true)}
            onSave={() => void onSaveSettings()}
            onSetClientSkin={() => void onSetClientSkin()}
            onSetHolidaySkin={() => void onSetHolidaySkin()}
          />

          <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
                    <CalendarDays size={19} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">节日自动皮肤</h2>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        已启用 {enabledHolidayRuleCount}/{holidayRules.length} 条规则
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      平时使用「{defaultSkinName}」，节日命中时使用「{holidaySkinName}」。当前前台实际生效：{runtimeSkinName}。
                    </p>
                  </div>
                </div>
              </div>
              <UnifiedButton
                type="button"
                onClick={() => setHolidayDrawerOpen(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--theme-primary)]/25 bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)] shadow-sm transition hover:opacity-90 lg:w-auto"
              >
                <Settings2 size={16} />
                配置节日自动皮肤
              </UnifiedButton>
            </div>
          </section>

          <AdminSideDrawer
            open={holidayDrawerOpen}
            onOpenChange={setHolidayDrawerOpen}
            title="节日自动皮肤"
            description={`当前节日皮肤：${holidaySkinName}；已启用 ${enabledHolidayRuleCount}/${holidayRules.length} 条规则。`}
            className="lg:w-[min(620px,calc(100vw-2rem))] xl:w-[min(680px,calc(100vw-2rem))]"
            bodyClassName="bg-muted/20"
            footer={(
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <UnifiedButton
                  type="button"
                  onClick={() => setHolidayDrawerOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  关闭
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={() => void onSaveSettings()}
                  disabled={saving || !selectedSkin?.name?.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {saving ? "保存中..." : "保存配置"}
                </UnifiedButton>
              </div>
            )}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">节日统一使用皮肤</span>
                  <select
                    value={holidaySkinId}
                    onChange={(e) => onHolidaySkinChange(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs"
                  >
                    {skins.map((skin) => (
                      <option key={skin.id} value={skin.id}>{skin.name}</option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  这里只决定节日期间自动切换哪套皮肤，不会改动日常客户端皮肤。修改后请点击保存配置。
                </p>
              </div>

              <div className="space-y-3">
                {holidayRules.map((rule) => (
                  <article key={rule.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{rule.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{rule.start} 到 {rule.end}</p>
                      </div>
                      <label className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => onHolidayRuleChange(rule.id, { enabled: e.target.checked })}
                        />
                        启用
                      </label>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">开始</span>
                        <input
                          value={rule.start}
                          onChange={(e) => onHolidayRuleChange(rule.id, { start: e.target.value })}
                          placeholder="MM-DD"
                          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">结束</span>
                        <input
                          value={rule.end}
                          onChange={(e) => onHolidayRuleChange(rule.id, { end: e.target.value })}
                          placeholder="MM-DD"
                          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </AdminSideDrawer>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[300px_minmax(0,1fr)_clamp(560px,36vw,760px)]">
            <ThemeSkinSidebar
              skins={skins}
              selectedSkinId={selectedSkinId}
              defaultSkinId={defaultSkinId}
              activeSkinId={activeSkinId}
              holidaySkinId={holidaySkinId}
              search={skinSearch}
              categoryFilter={categoryFilter}
              categoryOptions={categoryOptions}
              onSearchChange={setSkinSearch}
              onCategoryFilterChange={setCategoryFilter}
              onSelect={onSelectSkin}
            />

            <ThemeEditorPanel
              themeConfig={themeConfig}
              selectedSkin={selectedSkin}
              isClientSkin={isSelectedClientSkin}
              isHolidaySkin={isSelectedHolidaySkin}
              onConfigChange={updateConfig}
              onSkinMetaChange={onSkinMetaChange}
              onAutoColor={onAutoColor}
              canUndoOptimize={!!undoSnapshot.current}
              onUndoOptimize={() => {
                const snapshot = undoSnapshot.current;
                if (!snapshot) return;
                const restored = normalizeThemeConfig(snapshot);
                undoSnapshot.current = null;
                setThemeConfig(restored);
                setSkins((prev) =>
                  prev.map((s) => (s.id === selectedSkinId ? { ...s, config: restored } : s)),
                );
                setDirty(true);
              }}
            />

            <ThemePreviewDock
              config={themeConfig}
              skinKey={selectedSkinId}
              mode={previewMode}
              device={previewDevice}
              onModeChange={setPreviewMode}
              onDeviceChange={setPreviewDevice}
              onFullscreen={() => setFullscreenOpen(true)}
              onOptimizeTextContrast={() => onAutoColor("textContrast")}
            />
          </div>

          <AnimatedConfirmDialog
            open={!!pendingSkinId}
            onOpenChange={(open) => !open && setPendingSkinId(null)}
            title={L("切换皮肤", "Switch skin")}
            description={L("当前有未保存修改，切换后将丢失这些修改，确定继续吗？", "You have unsaved changes. Switching will discard them. Continue?")}
            confirmText={L("切换", "Switch")}
            danger
            onConfirm={() => {
              if (pendingSkinId) applySkinSwitch(pendingSkinId);
              setPendingSkinId(null);
            }}
          />

          <ThemeFullscreenPreview
            open={fullscreenOpen}
            config={themeConfig}
            skinKey={selectedSkinId}
            mode={previewMode}
            device={previewDevice}
            onModeChange={setPreviewMode}
            onDeviceChange={setPreviewDevice}
            onClose={() => setFullscreenOpen(false)}
          />
        </>
      )}
    </div>
    </AdminPageShell>
  );
}
