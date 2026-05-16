import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SKIN_ID, THEME_PRESETS } from "@/constants/themePresets";
import { notifyGlobalThemeUpdated } from "@/lib/themeRevision";
import { AnimatedConfirmDialog } from "@/modules/micro-interactions";
import ThemeEditorPanel from "@/modules/admin/components/theme/ThemeEditorPanel";
import ThemeFullscreenPreview from "@/modules/admin/components/theme/ThemeFullscreenPreview";
import ThemePreviewDock from "@/modules/admin/components/theme/ThemePreviewDock";
import ThemeSkinSidebar from "@/modules/admin/components/theme/ThemeSkinSidebar";
import ThemeStudioHeader from "@/modules/admin/components/theme/ThemeStudioHeader";
import type { PreviewDevice, PreviewMode } from "@/modules/admin/components/theme/themeStudioConstants";
import { fetchThemeSkins, saveSystemThemeSkins } from "@/services/admin/themeService";
import type { ThemeConfig, ThemeSceneTag, ThemeSkin } from "@/types/theme";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminThemeStudioSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { canDeleteThemeSkin, normalizeThemeConfig, normalizeThemeSkinsPayload } from "@/utils/themeConfig";
import {
  applyAutoColorAction,
  resetThemeGroup,
  type AutoColorAction,
} from "@/utils/themeStudioAuto";
const presetMap = new Map(THEME_PRESETS.map((skin) => [skin.id, skin]));

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
  const presetConfig = useMemo(() => {
    const preset = presetMap.get(selectedSkinId) || THEME_PRESETS[0];
    return normalizeThemeConfig(preset?.config);
  }, [selectedSkinId]);

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

  const persist = async (
    nextSkins: ThemeSkin[],
    nextDefaultSkinId: string,
    nextActiveSkinId: string,
    message: string,
  ) => {
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

  const onAddSkin = () => {
    if (skins.length >= 20) return toast.info("最多保留 20 套皮肤");
    const newId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `skin_${Date.now()}`;
    const newSkin: ThemeSkin = {
      id: newId,
      name: `自定义皮肤 ${skins.length + 1}`,
      description: "基于当前皮肤复制",
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
    const clone: ThemeSkin = {
      ...source,
      id: newId,
      name: `${source.name} 副本`,
      clientEnabled: source.clientEnabled !== false,
    };
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
    const nextDefaultSkinId = defaultSkinId;
    const nextActiveSkinId = activeSkinId === id ? fallbackId : activeSkinId;
    const nextSelectedSkinId = selectedSkinId === id ? fallbackId : selectedSkinId;

    setSkins(nextSkins);
    setDefaultSkinId(nextDefaultSkinId);
    setActiveSkinId(nextActiveSkinId);
    setSelectedSkinId(nextSelectedSkinId);
    const target = nextSkins.find((s) => s.id === nextSelectedSkinId) || nextSkins[0];
    setThemeConfig(normalizeThemeConfig(target?.config));
    setDirty(true);

    try {
      await persist(nextSkins, nextDefaultSkinId, nextActiveSkinId, "已删除皮肤");
    } catch {
      /* 保留编辑内容 */
    }
  };

  const onSetDefault = async (id: string) => {
    if (id === defaultSkinId) return;
    const nextDefault = id;
    setDefaultSkinId(nextDefault);
    setDirty(true);
    if (!dirty) {
      try {
        await persist(skins, nextDefault, activeSkinId, "已设为默认皮肤");
      } catch {
        /* noop */
      }
    } else {
      toast.info("已标记为默认，保存后生效");
    }
  };

  const onApplyCurrent = async (id: string) => {
    if (id === activeSkinId) return toast.info("已是当前生效皮肤");
    try {
      await persist(skins, defaultSkinId, id, "已应用为当前系统皮肤，管理后台已更新");
    } catch {
      /* noop */
    }
  };

  const onSave = async () => {
    const name = selectedSkin?.name?.trim();
    if (!name) return toast.error("皮肤名称不能为空");
    const nextSkins = skins.map((s) =>
      s.id === selectedSkinId ? { ...s, config: themeConfig, name } : s,
    );
    const nextDefault = defaultSkinId;
    try {
      await persist(nextSkins, nextDefault, activeSkinId, "已保存，并已应用到全站");
    } catch {
      /* 保留编辑 */
    }
  };

  const onAutoColor = (action: AutoColorAction) => {
    undoSnapshot.current = themeConfig;
    const next = applyAutoColorAction(themeConfig, action);
    setThemeConfig(next);
    setSkins((prev) => prev.map((s) => (s.id === selectedSkinId ? { ...s, config: next } : s)));
    setDirty(true);
    toast.success("已自动优化，可在右侧预览");
  };

  const onResetGroup = (group: string) => {
    const next = resetThemeGroup(themeConfig, group, presetConfig);
    setThemeConfig(next);
    setSkins((prev) => prev.map((s) => (s.id === selectedSkinId ? { ...s, config: next } : s)));
    setDirty(true);
  };

  const onSetDefaultToggle = (checked: boolean) => {
    if (checked) void onSetDefault(selectedSkinId);
  };

  return (
    <div className="mx-auto max-w-[1800px] pb-8">
      {loading ? (
        <AdminThemeStudioSkeleton />
      ) : (
      <>
      <ThemeStudioHeader
        skinName={selectedSkin?.name || ""}
        isDefault={selectedSkinId === defaultSkinId}
        dirty={dirty}
        saving={saving}
        saveDisabled={!selectedSkin?.name?.trim()}
        onSave={() => void onSave()}
        onCopy={() => onCopySkin()}
        onAdd={onAddSkin}
        onSetDefault={() => void onSetDefault(selectedSkinId)}
        canDelete={canDeleteThemeSkin(selectedSkinId, defaultSkinId, skins.length).ok}
        onDelete={() => {
          const gate = canDeleteThemeSkin(selectedSkinId, defaultSkinId, skins.length);
          if (!gate.ok) return toast.error(gate.message);
          setPendingDeleteId(selectedSkinId);
        }}
        onFullscreen={() => setFullscreenOpen(true)}
        onApplyAdmin={() => void onApplyCurrent(selectedSkinId)}
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <ThemeSkinSidebar
          skins={skins}
          selectedSkinId={selectedSkinId}
          defaultSkinId={defaultSkinId}
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
        />

        <ThemeEditorPanel
          themeConfig={themeConfig}
          selectedSkin={selectedSkin}
          isDefaultSkin={selectedSkinId === defaultSkinId}
          presetConfig={presetConfig}
          onConfigChange={updateConfig}
          onSkinMetaChange={onSkinMetaChange}
          onSetDefaultToggle={onSetDefaultToggle}
          onAutoColor={onAutoColor}
          onResetGroup={onResetGroup}
          canUndoOptimize={!!undoSnapshot.current}
          onUndoOptimize={() => {
            if (!undoSnapshot.current) return;
            setThemeConfig(undoSnapshot.current);
            setSkins((prev) =>
              prev.map((s) => (s.id === selectedSkinId ? { ...s, config: undoSnapshot.current! } : s)),
            );
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
        />
      </div>

      <AnimatedConfirmDialog
        open={!!pendingSkinId}
        onOpenChange={(open) => !open && setPendingSkinId(null)}
        title="切换皮肤"
        description="当前有未保存修改，切换后将丢弃这些修改，确定继续吗？"
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
        description="删除后不可恢复。默认皮肤无法删除，需先指定其他皮肤为默认。"
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
