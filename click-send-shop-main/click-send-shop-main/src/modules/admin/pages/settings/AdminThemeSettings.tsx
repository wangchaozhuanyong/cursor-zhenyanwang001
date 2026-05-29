import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_SKIN_ID, THEME_PRESETS } from "@/constants/themePresets";
import { STARTER_THEME_SKIN_MAP, STARTER_THEME_SKINS } from "@/constants/starterThemeSkins";
import { AdminThemeStudioSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { AnimatedConfirmDialog } from "@/modules/micro-interactions";
import ThemeEditorPanel from "@/modules/admin/components/theme/ThemeEditorPanel";
import ThemeFullscreenPreview from "@/modules/admin/components/theme/ThemeFullscreenPreview";
import ThemePreviewDock from "@/modules/admin/components/theme/ThemePreviewDock";
import ThemeSkinSidebar from "@/modules/admin/components/theme/ThemeSkinSidebar";
import ThemeStudioHeader from "@/modules/admin/components/theme/ThemeStudioHeader";
import type { PreviewDevice, PreviewMode } from "@/modules/admin/components/theme/themeStudioConstants";
import { notifyGlobalThemeUpdated } from "@/lib/themeRevision";
import { fetchThemeSkins, saveSystemThemeSkins } from "@/services/admin/themeService";
import type { ThemeConfig, ThemeSceneTag, ThemeSkin } from "@/types/theme";
import { toastErrorMessage } from "@/utils/errorMessage";
import { canDeleteThemeSkin, normalizeThemeConfig, normalizeThemeSkinsPayload } from "@/utils/themeConfig";
import { applyAutoColorAction, type AutoColorAction } from "@/utils/themeStudioAuto";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import { useAdminTOptional } from "@/hooks/useAdminT";

function applyThemePayload(
  normalized: ReturnType<typeof normalizeThemeSkinsPayload>,
  setters: {
    setSkins: (v: ThemeSkin[]) => void;
    setDefaultSkinId: (v: string) => void;
    setActiveSkinId: (v: string) => void;
    setSelectedSkinId: (v: string) => void;
    setThemeConfig: (v: ThemeConfig) => void;
  },
  options?: { selectedSkinId?: string },
) {
  setters.setSkins(normalized.skins);
  setters.setDefaultSkinId(normalized.defaultSkinId);
  setters.setActiveSkinId(normalized.activeSkinId);
  const preferred = options?.selectedSkinId;
  const selectedId =
    preferred && normalized.skins.some((s) => s.id === preferred)
      ? preferred
      : normalized.activeSkinId;
  setters.setSelectedSkinId(selectedId);
  const current = normalized.skins.find((s) => s.id === selectedId) || normalized.skins[0];
  setters.setThemeConfig(normalizeThemeConfig(current?.config));
}

export default function AdminThemeSettings() {
  const { locale, tText } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [skins, setSkins] = useState<ThemeSkin[]>([]);
  const [defaultSkinId, setDefaultSkinId] = useState(DEFAULT_SKIN_ID);
  const [activeSkinId, setActiveSkinId] = useState(DEFAULT_SKIN_ID);
  const [selectedSkinId, setSelectedSkinId] = useState(DEFAULT_SKIN_ID);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(normalizeThemeConfig(THEME_PRESETS[0]?.config));
  const [dirty, setDirty] = useState(false);
  useAdminTabDirty(dirty);
  const [pendingSkinId, setPendingSkinId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [skinSearch, setSkinSearch] = useState("");
  const [sceneFilter, setSceneFilter] = useState<"all" | ThemeSceneTag>("all");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("home");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("phone");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const undoSnapshot = useRef<ThemeConfig | null>(null);
  const skipServerSyncRef = useRef(false);

  const selectedSkin = useMemo(() => skins.find((s) => s.id === selectedSkinId), [skins, selectedSkinId]);

  const themeQuery = useQuery({
    queryKey: adminQueryKeys.themeSkins(),
    queryFn: fetchThemeSkins,
    staleTime: 60_000,
  });

  const loading = themeQuery.isLoading && !themeQuery.data;

  useEffect(() => {
    if (skipServerSyncRef.current) return;
    if (themeQuery.isError) {
      toast.error(toastErrorMessage(themeQuery.error, L("加载皮肤配置失败，已使用本地预设", "Failed to load theme config; using local presets")));
      applyThemePayload(normalizeThemeSkinsPayload({ skins: THEME_PRESETS }), {
        setSkins,
        setDefaultSkinId,
        setActiveSkinId,
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
      skins: Array.isArray(data?.skins) ? data.skins : THEME_PRESETS,
    });
    applyThemePayload(normalized, { setSkins, setDefaultSkinId, setActiveSkinId, setSelectedSkinId, setThemeConfig }, {
      selectedSkinId,
    });
  }, [themeQuery.data, themeQuery.isError, themeQuery.error, dirty, selectedSkinId]);

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
    applyThemePayload(normalized, { setSkins, setDefaultSkinId, setActiveSkinId, setSelectedSkinId, setThemeConfig }, options);
    skipServerSyncRef.current = false;
    queryClient.setQueryData(adminQueryKeys.themeSkins(), saved);
    notifyGlobalThemeUpdated();
    setDirty(false);
  };

  const persist = async (
    nextSkins: ThemeSkin[],
    nextDefaultSkinId: string,
    nextActiveSkinId: string,
    message: string,
    options?: { selectedSkinId?: string },
  ) => {
    const normalized = normalizeThemeSkinsPayload({
      defaultSkinId: nextDefaultSkinId,
      activeSkinId: nextActiveSkinId,
      skins: nextSkins,
    });
    setSaving(true);
    try {
      const saved = await saveSystemThemeSkins({
        defaultSkinId: normalized.defaultSkinId,
        activeSkinId: normalized.activeSkinId,
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

  const onSkinMetaChange = (patch: Partial<Pick<ThemeSkin, "name" | "description" | "sceneTag" | "clientEnabled">>) => {
    setSkins((prev) =>
      prev.map((skin) => (skin.id === selectedSkinId ? { ...skin, ...patch, name: patch.name ?? skin.name } : skin)),
    );
    setDirty(true);
  };

  const applySkinSwitch = (id: string) => {
    setSelectedSkinId(id);
    const target = skins.find((s) => s.id === id);
    setThemeConfig(normalizeThemeConfig(target?.config));
    setDirty(false);
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

  const onAddStarterSkin = (starterId: string) => {
    const starter = STARTER_THEME_SKIN_MAP.get(starterId);
    if (!starter) return;
    const exists = skins.some((s) => s.id === starterId);
    if (exists) {
      setSelectedSkinId(starterId);
      setThemeConfig(normalizeThemeConfig(skins.find((s) => s.id === starterId)?.config));
      toast.info(L("该推荐皮肤已存在，已为你选中", "That recommended skin already exists and has been selected"));
      return;
    }
    if (skins.length >= 20) return toast.info(L("最多保留 20 套皮肤", "Keep at most 20 skins"));
    const normalized = { ...starter, config: normalizeThemeConfig(starter.config) };
    setSkins((prev) => [...prev, normalized]);
    setSelectedSkinId(starterId);
    setThemeConfig(normalized.config);
    setDirty(true);
    toast.success(L("已添加推荐皮肤，请保存后生效", "Recommended skin added. Save to apply."));
  };

  const onAddSkin = () => {
    if (skins.length >= 20) return toast.info(L("最多保留 20 套皮肤", "Keep at most 20 skins"));
    const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `skin_${Date.now()}`;
    const newSkin: ThemeSkin = {
      id: newId,
      name: `自定义皮肤${skins.length + 1}`,
      description: L("基于当前皮肤创建", "Created from the current skin"),
      sceneTag: selectedSkin?.sceneTag || "default",
      clientEnabled: true,
      config: normalizeThemeConfig(themeConfig),
    };
    setSkins((prev) => [...prev, newSkin]);
    setSelectedSkinId(newId);
    setThemeConfig(newSkin.config);
    setDirty(true);
  };

  const onCopySkin = (id?: string) => {
    const sourceId = id || selectedSkinId;
    const source = skins.find((s) => s.id === sourceId);
    if (!source) return;
    if (skins.length >= 20) return toast.info(L("最多保留 20 套皮肤", "Keep at most 20 skins"));
    const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `skin_${Date.now()}`;
    const clone: ThemeSkin = { ...source, id: newId, name: `${source.name} ${L("副本", "Copy")}`, clientEnabled: source.clientEnabled !== false };
    setSkins((prev) => [...prev, clone]);
    setSelectedSkinId(newId);
    setThemeConfig(clone.config);
    setDirty(true);
    toast.success(L("已复制皮肤，请保存后生效", "Skin copied. Save to apply."));
  };

  const onDeleteSkin = async (id: string) => {
    const gate = canDeleteThemeSkin(id, defaultSkinId, skins.length);
    if (!gate.ok) {
      toast.error(gate.message);
      return;
    }

    const nextSkins = skins.filter((s) => s.id !== id);
    const fallbackId = nextSkins[0]?.id || DEFAULT_SKIN_ID;
    const nextActiveSkinId = activeSkinId === id ? fallbackId : activeSkinId;
    const nextSelectedSkinId = selectedSkinId === id ? fallbackId : selectedSkinId;

    try {
      await persist(nextSkins, defaultSkinId, nextActiveSkinId, L("已删除皮肤", "Skin deleted"), {
        selectedSkinId: nextSelectedSkinId,
      });
    } catch {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.themeSkins() });
    }
  };

  const buildNextSkins = () => {
    const name = selectedSkin?.name?.trim();
    if (!name) return null;
    return skins.map((s) => (s.id === selectedSkinId ? { ...s, config: themeConfig, name } : s));
  };

  const onSetDefault = async (id: string) => {
    if (id === defaultSkinId) return toast.info(L("已是默认皮肤", "Already the default skin"));
    const nextSkins = id === selectedSkinId ? buildNextSkins() : skins;
    if (!nextSkins) return toast.error(L("皮肤名称不能为空", "Skin name cannot be empty"));
    try {
      await persist(nextSkins, id, activeSkinId, L("已设为默认皮肤", "Set as default skin"));
    } catch {
      // noop
    }
  };

  const onSaveDraft = async () => {
    const nextSkins = buildNextSkins();
    if (!nextSkins) return toast.error(L("皮肤名称不能为空", "Skin name cannot be empty"));
    try {
      await persist(nextSkins, defaultSkinId, activeSkinId, L("已保存皮肤配置", "Skin settings saved"), { selectedSkinId });
    } catch {
      // noop
    }
  };

  const onSaveAndApply = async () => {
    const nextSkins = buildNextSkins();
    if (!nextSkins) return toast.error(L("皮肤名称不能为空", "Skin name cannot be empty"));
    try {
      await persist(nextSkins, defaultSkinId, selectedSkinId, L("已保存并应用到全站", "Saved and applied site-wide"), { selectedSkinId });
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

  return (
    <AdminPageShell hint={L("统一管理前台、移动端和管理后台的视觉风格；保存草稿或保存并应用后才会写入站点配置。", "Manage the visual style for storefront, mobile, and admin in one place; changes are written only after saving draft or saving and applying.")}>
    <div className="w-full bg-muted/20 p-2 pb-12 sm:p-4">
      {loading ? (
        <AdminThemeStudioSkeleton />
      ) : (
        <>
          <ThemeStudioHeader
            skinName={selectedSkin?.name || ""}
            isDefault={selectedSkinId === defaultSkinId}
            clientEnabled={selectedSkin?.clientEnabled !== false}
            dirty={dirty}
            saving={saving}
            saveDisabled={!selectedSkin?.name?.trim()}
            onPreview={() => setFullscreenOpen(true)}
            onSaveDraft={() => void onSaveDraft()}
            onSaveAndApply={() => void onSaveAndApply()}
            onCopy={() => onCopySkin()}
            onAdd={onAddSkin}
            onAddStarter={() => toast.info(L("请在左侧“从模板新建”区域选择模板", 'Please choose a template in the "Create from template" section on the left'))}
            onSetDefault={() => void onSetDefault(selectedSkinId)}
            canDelete={canDeleteThemeSkin(selectedSkinId, defaultSkinId, skins.length).ok}
            onDelete={() => {
              const gate = canDeleteThemeSkin(selectedSkinId, defaultSkinId, skins.length);
              if (!gate.ok) return toast.error(gate.message);
              setPendingDeleteId(selectedSkinId);
            }}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[300px_minmax(0,1fr)_clamp(430px,28vw,540px)]">
            <ThemeSkinSidebar
              skins={skins}
              selectedSkinId={selectedSkinId}
              defaultSkinId={defaultSkinId}
              activeSkinId={activeSkinId}
              search={skinSearch}
              sceneFilter={sceneFilter}
              onSearchChange={setSkinSearch}
              onSceneFilterChange={setSceneFilter}
              onSelect={onSelectSkin}
              onAdd={onAddSkin}
              onCopy={onCopySkin}
              canDeleteSkin={(id) => canDeleteThemeSkin(id, defaultSkinId, skins.length).ok}
              onDelete={(id) => {
                const gate = canDeleteThemeSkin(id, defaultSkinId, skins.length);
                if (!gate.ok) return toast.error(gate.message);
                setPendingDeleteId(id);
              }}
              onSetDefault={(id) => void onSetDefault(id)}
              starterQuickAdds={STARTER_THEME_SKINS.map((s) => ({ id: s.id, label: s.name }))}
              onAddStarter={onAddStarterSkin}
            />

            <ThemeEditorPanel
              themeConfig={themeConfig}
              selectedSkin={selectedSkin}
              isDefaultSkin={selectedSkinId === defaultSkinId}
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

          <AnimatedConfirmDialog
            open={!!pendingDeleteId}
            onOpenChange={(open) => !open && setPendingDeleteId(null)}
            title={L("删除皮肤", "Delete skin")}
            description={L("删除后不可恢复。默认皮肤无法删除，请先将其他皮肤设为默认。", "This cannot be undone. The default skin cannot be deleted, so set another skin as default first.")}
            confirmText={L("删除", "Delete")}
            danger
            onConfirm={() => {
              if (pendingDeleteId) void onDeleteSkin(pendingDeleteId);
              setPendingDeleteId(null);
            }}
          />

          <ThemeFullscreenPreview open={fullscreenOpen} config={themeConfig} onClose={() => setFullscreenOpen(false)} />
        </>
      )}
    </div>
    </AdminPageShell>
  );
}
