import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { DEFAULT_HOME_MODULE_SETTINGS, mergeHomeModuleSettings, type HomeModuleSettings } from "@/constants/homeModules";
import { invalidateHomeModuleSettingsCache } from "@/hooks/useHomeModuleSettings";
import { LoadingButton } from "@/modules/micro-interactions";
import * as homeOpsService from "@/services/admin/homeOpsService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminT } from "@/hooks/useAdminT";

export default function AdminHomeOpsDisplayPanel() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<HomeModuleSettings>(DEFAULT_HOME_MODULE_SETTINGS);
  const [saving, setSaving] = useState(false);

  const settingsQuery = useQuery({
    queryKey: adminQueryKeys.homeOpsSettings(),
    queryFn: homeOpsService.fetchHomeOpsSettings,
    staleTime: 60_000,
  });

  const loading = settingsQuery.isLoading && !settingsQuery.data;

  useEffect(() => {
    if (!settingsQuery.data) return;
    setSettings(mergeHomeModuleSettings(settingsQuery.data));
  }, [settingsQuery.data]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await homeOpsService.updateHomeOpsSettings({
        hotBatchSize: settings.hotBatchSize,
        recBatchSize: settings.recBatchSize,
        guestRecommendMax: settings.guestRecommendMax,
      });
      setSettings(mergeHomeModuleSettings(saved));
      invalidateHomeModuleSettingsCache();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.homeOpsSettings() });
      toast.success(tText("展示规则已保存"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-4">
        <AdminSectionTitle
          title={<Tx>展示规则</Tx>}
          hint={<Tx>控制各商品区块每屏展示数量（2×2 网格时默认 4 个）。</Tx>}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground"><Tx>今日热销 · 每批数量</Tx></span>
          <input
            type="number"
            min={2}
            max={12}
            disabled={loading}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={settings.hotBatchSize}
            onChange={(e) =>
              setSettings((s) => ({ ...s, hotBatchSize: Number(e.target.value) || DEFAULT_HOME_MODULE_SETTINGS.hotBatchSize }))
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground"><Tx>猜你喜欢 · 每批数量</Tx></span>
          <input
            type="number"
            min={2}
            max={12}
            disabled={loading}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={settings.recBatchSize}
            onChange={(e) =>
              setSettings((s) => ({ ...s, recBatchSize: Number(e.target.value) || DEFAULT_HOME_MODULE_SETTINGS.recBatchSize }))
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground"><Tx>访客精选 · 最多展示</Tx></span>
          <input
            type="number"
            min={4}
            max={24}
            disabled={loading}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={settings.guestRecommendMax}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                guestRecommendMax: Number(e.target.value) || DEFAULT_HOME_MODULE_SETTINGS.guestRecommendMax,
              }))
            }
          />
        </label>
      </div>

      <PermissionGate permission="home_ops.manage">
        <div className="mt-6 flex justify-end">
          <LoadingButton
            type="button"
            variant="gold"
            state={saving ? "loading" : "normal"}
            loadingText="保存中..."
            disabled={loading}
            onClick={() => adminConfirmSave(confirm, "展示规则", () => save())}
            className="rounded-xl px-5 py-2.5 text-sm font-bold"
          ><Tx>
            保存展示规则
          </Tx></LoadingButton>
        </div>
      </PermissionGate>
    </section>
  );
}
