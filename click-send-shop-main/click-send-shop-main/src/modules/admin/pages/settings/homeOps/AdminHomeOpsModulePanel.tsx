import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { THEME_TEXT_SUCCESS_SOFT } from "@/utils/themeVisuals";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  DEFAULT_HOME_MODULE_SETTINGS,
  HOME_MODULE_DEFINITIONS,
  mergeHomeModuleSettings,
  type HomeModuleKey,
  type HomeModuleSettings,
} from "@/constants/homeModules";
import { invalidateHomeModuleSettingsCache } from "@/hooks/useHomeModuleSettings";
import { LoadingButton } from "@/modules/micro-interactions";
import * as homeOpsService from "@/services/admin/homeOpsService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminT } from "@/hooks/useAdminT";

const CATEGORY_LABELS: Record<string, string> = {
  common: "通用模块（登录 / 未登录均可能展示）",
  member: "登录后首页",
  guest: "未登录首页",
};

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

function serializeModuleDraft(value: HomeModuleSettings) {
  return JSON.stringify({ modules: value.modules });
}

export default function AdminHomeOpsModulePanel({ onDirtyChange }: Props) {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<HomeModuleSettings>(DEFAULT_HOME_MODULE_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(() => serializeModuleDraft(DEFAULT_HOME_MODULE_SETTINGS));

  const settingsQuery = useQuery({
    queryKey: adminQueryKeys.homeOpsSettings(),
    queryFn: homeOpsService.fetchHomeOpsSettings,
    staleTime: 60_000,
  });

  const loading = settingsQuery.isLoading && !settingsQuery.data;

  const dirty = useMemo(
    () => !loading && serializeModuleDraft(settings) !== baseline,
    [baseline, loading, settings],
  );

  useEffect(() => {
    if (!settingsQuery.data || dirty) return;
    const merged = mergeHomeModuleSettings(settingsQuery.data);
    setSettings(merged);
    setBaseline(serializeModuleDraft(merged));
  }, [settingsQuery.data, dirty]);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const setModule = (key: HomeModuleKey, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: enabled },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await homeOpsService.updateHomeOpsSettings({ modules: settings.modules });
      const merged = mergeHomeModuleSettings(saved);
      setSettings(merged);
      setBaseline(serializeModuleDraft(merged));
      invalidateHomeModuleSettingsCache();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.homeOpsSettings() });
      toast.success(tText("模块开关已保存，前台刷新后生效"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const categories = ["common", "member", "guest"] as const;

  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-4">
        <AdminSectionTitle
          title={<Tx>首页内容模块开关</Tx>}
          hint={<Tx>开启后在前台对应首页展示该模块；关闭则整块隐藏（不影响商品数据本身）。</Tx>}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-base skeleton-shimmer h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const defs = HOME_MODULE_DEFINITIONS.filter((d) => d.category === cat);
            if (!defs.length) return null;
            return (
              <div key={cat}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <ul className="space-y-2">
                  {defs.map((def) => (
                    <li
                      key={def.key}
                      className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground">{def.label}</p>
                          <AdminFieldHint
                            text={(
                              <>
                                <p>{def.description}</p>
                                <p className="mt-1">适用：{def.audiences.map((a) => (a === "member" ? "登录用户" : "访客")).join("、")}</p>
                              </>
                            )}
                          />
                        </div>
                      </div>
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-0.5 text-sm">
                        <input
                          type="checkbox"
                          className="accent-gold h-4 w-4"
                          checked={settings.modules[def.key] !== false}
                          onChange={(e) => setModule(def.key, e.target.checked)}
                        />
                        <span className={settings.modules[def.key] !== false ? THEME_TEXT_SUCCESS_SOFT : "text-muted-foreground"}>
                          {settings.modules[def.key] !== false ? "显示" : "隐藏"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <PermissionGate permission="home_ops.manage">
        <div className="mt-6 flex justify-end">
          <LoadingButton
            type="button"
            variant="gold"
            state={saving ? "loading" : "normal"}
            loadingText="保存中..."
            disabled={loading}
            onClick={() => adminConfirmSave(confirm, "模块开关", () => save())}
            className="rounded-xl px-5 py-2.5 text-sm font-bold"
          ><Tx>
            保存模块开关
          </Tx></LoadingButton>
        </div>
      </PermissionGate>
    </section>
  );
}
