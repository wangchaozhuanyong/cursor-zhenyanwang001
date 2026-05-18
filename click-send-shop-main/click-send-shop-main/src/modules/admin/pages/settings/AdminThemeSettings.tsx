import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function AdminThemeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skins, setSkins] = useState<ThemeSkin[]>([]);
  const [defaultSkinId, setDefaultSkinId] = useState(DEFAULT_SKIN_ID);
  const [activeSkinId, setActiveSkinId] = useState(DEFAULT_SKIN_ID);
  const [selectedSkinId, setSelectedSkinId] = useState(DEFAULT_SKIN_ID);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(normalizeThemeConfig(THEME_PRESETS[0]?.config));
  const [dirty, setDirty] = useState(false);
  const [pendingSkinId, setPendingSkinId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [skinSearch, setSkinSearch] = useState("");
  const [sceneFilter, setSceneFilter] = useState<"all" | ThemeSceneTag>("all");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("home");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("phone");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const undoSnapshot = useRef<ThemeConfig | null>(null);

  const selectedSkin = useMemo(() => skins.find((s) => s.id === selectedSkinId), [skins, selectedSkinId]);
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
        const current = normalized.skins.find((s) => s.id === normalized.activeSkinId) || normalized.skins[0];
        setThemeConfig(normalizeThemeConfig(current?.config));
      })
      .catch((error) => {
        toast.error(toastErrorMessage(error, "加载皮肤配置失败，已使用本地预设"));
        const normalized = normalizeThemeSkinsPayload({ skins: THEME_PRESETS });
        setSkins(normalized.skins);
        setDefaultSkinId(normalized.defaultSkinId);
        setActiveSkinId(normalized.activeSkinId);
        setSelectedSkinId(normalized.activeSkinId);
        const current = normalized.skins.find((s) => s.id === normalized.activeSkinId) || normalized.skins[0];
        setThemeConfig(normalizeThemeConfig(current?.config));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const persist = async (nextSkins: ThemeSkin[], nextDefaultSkinId: string, nextActiveSkinId: string, message: string) => {
    const normalized = normalizeThemeSkinsPayload({
      defaultSkinId: nextDefaultSkinId,
      activeSkinId: nextActiveSkinId,
      skins: nextSkins,
    });
    setSaving(true);
    try {
      await saveSystemThemeSkins({
        defaultSkinId: normalized.defaultSkinId,
        activeSkinId: normalized.activeSkinId,
        skins: normalized.skins,
      });
      setSkins(normalized.skins);
      setDefaultSkinId(normalized.defaultSkinId);
      setActiveSkinId(normalized.activeSkinId);
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

  const updateConfig = useCallback(<K extends keyof ThemeConfig>(field: K, value: ThemeConfig[K]) => {
    const next = normalizeThemeConfig({ ...themeConfig, [field]: value });
    setThemeConfig(next);
    setSkins((prev) => prev.map((skin) => (skin.id === selectedSkinId ? { ...skin, config: next } : skin)));
    setDirty(true);
  }, [themeConfig, selectedSkinId]);

  const onSkinMetaChange = (patch: Partial<Pick<ThemeSkin, "name" | "description" | "sceneTag" | "clientEnabled">>) => {
    setSkins((prev) => prev.map((skin) => (skin.id === selectedSkinId ? { ...skin, ...patch, name: patch.name ?? skin.name } : skin)));
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
      toast.info("该推荐皮肤已存在，已为你选中");
      return;
    }
    if (skins.length >= 20) return toast.info("最多保留 20 套皮肤");
    const normalized = { ...starter, config: normalizeThemeConfig(starter.config) };
    setSkins((prev) => [...prev, normalized]);
    setSelectedSkinId(starterId);
    setThemeConfig(normalized.config);
    setDirty(true);
    toast.success("已添加推荐皮肤，请保存后生效");
  };

  const onAddSkin = () => {
    if (skins.length >= 20) return toast.info("最多保留 20 套皮肤");
    const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `skin_${Date.now()}`;
    const newSkin: ThemeSkin = {
      id: newId,
      name: `自定义皮肤 ${skins.length + 1}`,
      description: "基于当前皮肤创建",
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
    if (skins.length >= 20) return toast.info("最多保留 20 套皮肤");
    const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `skin_${Date.now()}`;
    const clone: ThemeSkin = { ...source, id: newId, name: `${source.name} 副本`, clientEnabled: source.clientEnabled !== false };
    setSkins((prev) => [...prev, clone]);
    setSelectedSkinId(newId);
    setThemeConfig(clone.config);
    setDirty(true);
    toast.success("已复制皮肤，请保存后生效");
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

    setSkins(nextSkins);
    setActiveSkinId(nextActiveSkinId);
    setSelectedSkinId(nextSelectedSkinId);
    const target = nextSkins.find((s) => s.id === nextSelectedSkinId) || nextSkins[0];
    setThemeConfig(normalizeThemeConfig(target?.config));
    setDirty(true);

    try {
      await persist(nextSkins, defaultSkinId, nextActiveSkinId, "已删除皮肤");
    } catch {
      // keep editor state
    }
  };

  const buildNextSkins = () => {
    const name = selectedSkin?.name?.trim();
    if (!name) return null;
    return skins.map((s) => (s.id === selectedSkinId ? { ...s, config: themeConfig, name } : s));
  };

  const onSetDefault = async (id: string) => {
    if (id === defaultSkinId) return toast.info("已是默认皮肤");
    const nextSkins = id === selectedSkinId ? buildNextSkins() : skins;
    if (!nextSkins) return toast.error("皮肤名称不能为空");
    try {
      await persist(nextSkins, id, activeSkinId, "已设为默认皮肤");
    } catch {
      // noop
    }
  };

  const onSaveDraft = async () => {
    const nextSkins = buildNextSkins();
    if (!nextSkins) return toast.error("皮肤名称不能为空");
    try {
      await persist(nextSkins, defaultSkinId, activeSkinId, "已保存皮肤配置");
    } catch {
      // noop
    }
  };

  const onSaveAndApply = async () => {
    const nextSkins = buildNextSkins();
    if (!nextSkins) return toast.error("皮肤名称不能为空");
    try {
      await persist(nextSkins, defaultSkinId, selectedSkinId, "已保存并应用到全站");
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
    toast.success("已自动优化，可在预览区确认效果");
  };

  return (
    <div className="w-full bg-muted/20 p-2 pb-8 sm:p-4">
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
            onAddStarter={() => toast.info("请在左侧“从模板新建”区域选择模板")}
            onSetDefault={() => void onSetDefault(selectedSkinId)}
            canDelete={canDeleteThemeSkin(selectedSkinId, defaultSkinId, skins.length).ok}
            onDelete={() => {
              const gate = canDeleteThemeSkin(selectedSkinId, defaultSkinId, skins.length);
              if (!gate.ok) return toast.error(gate.message);
              setPendingDeleteId(selectedSkinId);
            }}
          />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)_clamp(420px,30vw,520px)] xl:items-start xl:gap-4">
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
                if (!undoSnapshot.current) return;
                setThemeConfig(undoSnapshot.current);
                setSkins((prev) => prev.map((s) => (s.id === selectedSkinId ? { ...s, config: undoSnapshot.current! } : s)));
                undoSnapshot.current = null;
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
            title="切换皮肤"
            description="当前有未保存修改，切换后将丢失这些修改，确定继续吗？"
            confirmText="切换"
            danger
            onConfirm={() => {
              if (pendingSkinId) applySkinSwitch(pendingSkinId);
              setPendingSkinId(null);
            }}
          />

          <AnimatedConfirmDialog
            open={!!pendingDeleteId}
            onOpenChange={(open) => !open && setPendingDeleteId(null)}
            title="删除皮肤"
            description="删除后不可恢复。默认皮肤无法删除，请先将其它皮肤设为默认。"
            confirmText="删除"
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
  );
}
