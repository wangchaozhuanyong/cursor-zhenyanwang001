import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  fetchSiteSettings,
  updateSiteSettings,
  uploadSiteAsset,
} from "@/services/admin/settingsService";
import { uploadSingle } from "@/services/uploadService";
import { refreshSiteInfo } from "@/hooks/useSiteInfo";
import type { SiteSettings } from "@/types/admin";
import type { SiteSettingsSectionId } from "@/types/admin";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminSiteSettingsSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { Tx } from "@/components/admin/AdminText";
import { EMPTY_SITE_SETTINGS } from "./siteSettingsDefaults";
import {
  getSectionById,
  getSectionFieldKeys,
  SITE_SETTINGS_SECTIONS,
} from "./siteSettingsSections";
import {
  buildSavePayload,
  sectionIsDirty,
  validateSection,
  validateAll,
} from "./siteSettingsValidation";
import SiteSettingsLayout from "./SiteSettingsLayout";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Tx } from "@/components/admin/AdminText";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import SiteSettingsHeader from "./SiteSettingsHeader";
import SiteSettingsSaveBar from "./SiteSettingsSaveBar";
import SiteSettingsHelpPanel, { SiteSettingsHelpPanelMobile } from "./SiteSettingsHelpPanel";
import SiteSettingCard from "./SiteSettingCard";
import SiteSettingField from "./SiteSettingField";
import PolicyPathFields from "./PolicyPathFields";
import FooterNavEditor from "./FooterNavEditor";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminT } from "@/hooks/useAdminT";

function mergeSettings(data: Partial<SiteSettings> | null | undefined): SiteSettings {
  return { ...EMPTY_SITE_SETTINGS, ...(data && typeof data === "object" ? data : {}) };
}

export default function SiteSettingsPage() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SITE_SETTINGS);
  const [saved, setSaved] = useState<SiteSettings>(EMPTY_SITE_SETTINGS);
  const [activeSectionId, setActiveSectionId] = useState<SiteSettingsSectionId>("basic");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);

  const settingsQuery = useQuery({
    queryKey: adminQueryKeys.siteSettings(),
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
  });

  const loading = settingsQuery.isLoading && !settingsQuery.data;

  useEffect(() => {
    if (!settingsQuery.data) return;
    const merged = mergeSettings(settingsQuery.data);
    setSettings(merged);
    setSaved(merged);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (loading || location.hash !== "#policy-paths") return;
    setActiveSectionId("footer");
    const t = window.setTimeout(() => {
      document.getElementById("policy-paths")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [location.hash, loading]);

  const setField = useCallback((key: keyof SiteSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const dirtyMap = useMemo(() => {
    const map: Partial<Record<SiteSettingsSectionId, boolean>> = {};
    for (const s of SITE_SETTINGS_SECTIONS) {
      map[s.id] = sectionIsDirty(settings, saved, s.id);
    }
    return map;
  }, [settings, saved]);

  const anyDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);
  useAdminTabDirty(anyDirty);

  useEffect(() => {
    if (!anyDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const activeSection = getSectionById(activeSectionId);
  const activeDirty = dirtyMap[activeSectionId] ?? false;

  const validationIssues = useMemo(
    () => validateSection(activeSectionId, settings),
    [activeSectionId, settings],
  );
  const validationWarnings = validationIssues.filter((i) => i.level === "warn").map((i) => i.message);

  const requestSectionChange = (nextId: SiteSettingsSectionId) => {
    if (nextId === activeSectionId) return;
    if (activeDirty) {
      confirm({ title: tText("未保存的修改"),
        description: "当前分组有未保存修改，是否继续切换？",
        confirmText: "继续切换",
        onConfirm: () => setActiveSectionId(nextId),
      });
      return;
    }
    setActiveSectionId(nextId);
  };

  const discardActiveSection = () => {
    const keys = getSectionFieldKeys(activeSectionId);
    setSettings((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        next[key] = saved[key];
      }
      return next;
    });
    toast.message("已恢复为上次保存的内容");
  };

  const runSave = async (mode: "section" | "all") => {
    const sectionId = activeSectionId;
    const issues = mode === "all" ? validateAll(settings) : validateSection(sectionId, settings);
    const errors = issues.filter((i) => i.level === "error");
    if (errors.length) {
      toast.error(errors[0].message);
      return;
    }
    for (const w of issues.filter((i) => i.level === "warn")) {
      toast.warning(w.message);
    }

    const payload = buildSavePayload(settings, mode, mode === "section" ? sectionId : undefined);
    setSaving(true);
    try {
      await updateSiteSettings(payload);
      setSaved((prev) => ({ ...prev, ...payload }));
      setSettings((prev) => ({ ...prev, ...payload }));
      await refreshSiteInfo();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.siteSettings() });
      toast.success(mode === "all" ? "全部设置已保存" : `${activeSection.title}已保存`);
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (key: keyof SiteSettings, file: File) => {
    if (!file) return;
    setUploadingKey(String(key));
    try {
      const res =
        key === "logoUrl" || key === "faviconUrl"
          ? await uploadSiteAsset(key, file)
          : await uploadSingle(file, { mode: "asset" });
      if (key === "logoUrl" || key === "faviconUrl") {
        setSettings((prev) => ({ ...prev, [key]: res.url }));
        setSaved((prev) => ({ ...prev, [key]: res.url }));
        await refreshSiteInfo();
        toast.success(tText("图片已上传并保存"));
      } else {
        setSettings((prev) => ({ ...prev, [key]: res.url }));
        toast.success(tText("图片已上传，请保存当前分组"));
      }
    } catch (e) {
      toast.error(toastErrorMessage(e, "上传失败"));
    } finally {
      setUploadingKey(null);
    }
  };

  const helpProps = {
    sectionId: activeSectionId,
    settings,
    validationWarnings,
  };

  const saveHandlers = {
    onSaveSection: () => adminConfirmSave(confirm, tText(activeSection.title), () => runSave("section")),
    onSaveAll: () => adminConfirmSave(confirm, tText("全部站点设置"), () => runSave("all")),
    onDiscard: activeDirty ? discardActiveSection : undefined,
  };

  const renderSectionForm = () => {
    if (activeSectionId === "footer") {
      return (
        <div className="space-y-4">
          <SiteSettingCard title={tText("页脚品牌")}>
            {(["footerCompanyName", "footerCopyright", "footerIcpNo"] as const).map((key) => (
              <SiteSettingField
                key={key}
                field={{
                  key,
                  label:
                    key === "footerCompanyName"
                      ? "公司名称"
                      : key === "footerCopyright"
                        ? "版权信息"
                        : "备案号 / 注册号",
                  type: "text",
                }}
                value={String(settings[key] ?? "")}
                onChange={setField}
                uploadingKey={uploadingKey}
                onUploadImage={handleUploadImage}
              />
            ))}
          </SiteSettingCard>
          <SiteSettingCard title={tText("政策页路径")}>
            <PolicyPathFields settings={settings} onChange={setField} />
          </SiteSettingCard>
          <SiteSettingCard title={tText("页脚导航菜单")}>
            <FooterNavEditor
              value={String(settings.footerNav ?? "")}
              onChange={(json) => setField("footerNav", json)}
            />
          </SiteSettingCard>
        </div>
      );
    }

    if (activeSectionId === "advanced") {
      const preview = buildSavePayload(settings, "all");
      return (
        <div className="space-y-4">
          <SiteSettingCard
            title={tText("页脚导航 JSON")}
            description="直接编辑 footerNav 字符串；保存高级配置仅提交 footerNav 字段。"
          >
            <button
              type="button"
              className="mb-2 text-xs text-theme-price hover:underline"
              onClick={() => setAdvancedJsonOpen((v) => !v)}
            >
              {advancedJsonOpen ? <Tx>收起</Tx> : <Tx>展开</Tx>} JSON
            </button>
            {advancedJsonOpen ? (
              <textarea
                rows={12}
                value={String(settings.footerNav ?? "")}
                onChange={(e) => setField("footerNav", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-gold"
              />
            ) : (
              <p className="truncate font-mono text-xs text-muted-foreground">
                {String(settings.footerNav ?? "").slice(0, 120) || "(空)"}
              </p>
            )}
          </SiteSettingCard>
          <SiteSettingCard title={tText("全部字段提交预览（只读）")}>
            <pre className="max-h-64 overflow-auto rounded-lg bg-secondary p-3 text-[10px] text-muted-foreground">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </SiteSettingCard>
        </div>
      );
    }

    const fields = activeSection.fields.filter((f) => f.type !== "custom" && !f.custom);

    return (
      <SiteSettingCard title={tText(activeSection.title)} description={activeSection.description ? tText(activeSection.description) : undefined}>
        <div className="space-y-4">
          {fields.map((field) => (
            <SiteSettingField
              key={String(field.key)}
              field={field}
              value={String(settings[field.key] ?? "")}
              onChange={setField}
              uploadingKey={uploadingKey}
              onUploadImage={handleUploadImage}
            />
          ))}
        </div>
      </SiteSettingCard>
    );
  };

  if (loading) {
    return <AdminSiteSettingsSkeleton />;
  }

  return (
    <AdminPageShell hint={<Tx>配置站点基础信息、品牌资产、SEO、税费与政策页路径等；请按左侧分组保存，避免跨分组误改。</Tx>}>
      <SiteSettingsLayout
        activeSectionId={activeSectionId}
        dirtyMap={dirtyMap}
        onSectionChange={requestSectionChange}
        header={
          <SiteSettingsHeader
            sectionTitle={tText(activeSection.title)}
            saving={saving}
            dirty={activeDirty}
            {...saveHandlers}
          />
        }
        saveBar={
          <SiteSettingsSaveBar
            saving={saving}
            dirty={activeDirty}
            anyDirty={anyDirty}
            {...saveHandlers}
          />
        }
        helpPanel={<SiteSettingsHelpPanel {...helpProps} />}
      >
        <SiteSettingsHelpPanelMobile {...helpProps} />
        {renderSectionForm()}
      </SiteSettingsLayout>
    </AdminPageShell>
  );
}
