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

const CLIENT_TITLE_MODULE_KEYS = new Set<HomeModuleKey>([
  "new_arrivals",
  "promotion_banner",
  "flash_sale_section",
  "full_reduction_notice",
  "coupon_center",
  "hot_sales",
  "recommend",
  "guest_recommend",
  "invite_entry",
]);

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

function serializeModuleDraft(value: HomeModuleSettings) {
  return JSON.stringify({
    modules: value.modules,
    titles: value.titles || {},
    bannerAutoplaySeconds: value.bannerAutoplaySeconds,
  });
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

  const setModuleTitle = (key: HomeModuleKey, value: string) => {
    setSettings((prev) => {
      const titles = { ...(prev.titles || {}) };
      const nextTitle = value.slice(0, 40);
      if (nextTitle.trim()) titles[key] = nextTitle;
      else delete titles[key];
      return { ...prev, titles };
    });
  };

  const setBannerAutoplaySeconds = (value: string) => {
    const seconds = Math.min(20, Math.max(3, Math.trunc(Number(value) || DEFAULT_HOME_MODULE_SETTINGS.bannerAutoplaySeconds)));
    setSettings((prev) => ({ ...prev, bannerAutoplaySeconds: seconds }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const titlePayload = Object.fromEntries(
        HOME_MODULE_DEFINITIONS.map((def) => [def.key, settings.titles?.[def.key] || ""]),
      ) as Partial<Record<HomeModuleKey, string>>;
      const saved = await homeOpsService.updateHomeOpsSettings({
        modules: settings.modules,
        titles: titlePayload,
        bannerAutoplaySeconds: settings.bannerAutoplaySeconds,
      });
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
          <div className="rounded-xl border border-border bg-background px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-foreground"><Tx>顶部轮播滚动间隔</Tx></p>
                  <AdminFieldHint text={<Tx>控制首页顶部 Banner 自动切换的时间。用户手动点击或滑动后，仍会短暂停留再继续自动滚动。</Tx>} />
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  <Tx>建议 4-8 秒；设置过短会影响图片阅读，过长会降低活动曝光。</Tx>
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input
                  type="number"
                  min={3}
                  max={20}
                  step={1}
                  value={settings.bannerAutoplaySeconds}
                  onChange={(e) => setBannerAutoplaySeconds(e.target.value)}
                  className="h-10 w-24 rounded-xl border border-border bg-background px-3 text-right text-sm text-foreground outline-none transition focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15"
                />
                <span className="text-muted-foreground"><Tx>秒</Tx></span>
              </label>
            </div>
          </div>
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
                        {CLIENT_TITLE_MODULE_KEYS.has(def.key) ? (
                          <label className="mt-3 block max-w-xl">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                              <Tx>客户端显示标题</Tx>
                            </span>
                            <input
                              type="text"
                              maxLength={40}
                              value={settings.titles?.[def.key] || ""}
                              onChange={(e) => setModuleTitle(def.key, e.target.value)}
                              placeholder={`默认：${def.label}`}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15"
                            />
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                              <Tx>留空时继续使用前台原来的默认标题或活动标题。</Tx>
                            </span>
                          </label>
                        ) : null}
                      </div>
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-0.5 text-sm">
                        <input
                          type="checkbox"
                          className="accent-[var(--theme-primary)] h-4 w-4"
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
            variant="price"
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
