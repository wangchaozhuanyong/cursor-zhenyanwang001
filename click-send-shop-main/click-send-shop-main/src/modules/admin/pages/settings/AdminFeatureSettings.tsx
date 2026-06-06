import { useCallback, useEffect, useMemo, useState } from "react";
import { useHydrateFromQuery } from "@/hooks/useHydrateFromQuery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import * as settingsService from "@/services/admin/settingsService";
import { DEFAULT_SITE_CAPABILITIES, type SiteCapabilities } from "@/types/siteCapabilities";
import { refreshSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";
import { toastErrorMessage } from "@/utils/errorMessage";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type FeatureItem = {
  key: keyof SiteCapabilities;
  label: string;
  desc: string;
  /** 预留能力：仅超级管理员可修改，界面灰显提示 */
  superAdminOnly?: boolean;
};

const FEATURE_ITEMS: FeatureItem[] = [
  { key: "mallEnabled", label: "商城模块", desc: "控制商品、购物车等商城入口展示。" },
  { key: "onlinePaymentEnabled", label: "在线支付", desc: "关闭后前端隐藏支付入口，后端拒绝创建在线支付。" },
  { key: "pointsEnabled", label: "积分", desc: "关闭后隐藏积分入口，后端拒绝积分相关接口。" },
  { key: "couponEnabled", label: "优惠券", desc: "关闭后隐藏优惠券入口，后端拒绝领券和优惠券管理接口。" },
  { key: "reviewEnabled", label: "评价", desc: "关闭后隐藏评价入口，后端拒绝提交评价。" },
  { key: "inventoryEnabled", label: "库存", desc: "关闭后隐藏库存管理入口，后端拒绝库存管理接口。" },
  { key: "shippingEnabled", label: "配送", desc: "关闭后隐藏配送设置，后端拒绝配送管理接口。" },
  { key: "memberLevelEnabled", label: "会员等级", desc: "关闭后隐藏会员等级入口，后端拒绝会员等级管理接口。" },
  { key: "customerServiceDownloadEnabled", label: "客服/APP 页", desc: "关闭后隐藏前台客服/APP 页与底部导航入口。" },
  {
    key: "telegramOrderNotifyEnabled",
    label: "Telegram 订单通知",
    desc: "与「Telegram 通知」页同步；关闭后不再发送付款成功提醒，并隐藏侧栏 Telegram 设置入口。",
  },
  {
    key: "languageGateEnabled",
    label: "中文浏览器限制",
    desc: "开启后前台商城路由将拦截非中文浏览器；后台 /admin 不受限。仅前端拦截，API 仍可直连。",
  },
  { key: "trafficAnalyticsEnabled", label: "流量分析", desc: "关闭后前端隐藏追踪加载，后端可减少埋点入口。" },
  {
    key: "downloadConfirmEnabled",
    label: "下载二次确认",
    desc: "开启后，前台与后台的导出、下载文件（含 CSV 导出、导出中心、二维码/海报下载等）均需确认后才会保存到本机。",
  },
  {
    key: "serviceEnabled",
    label: "服务模块（预留）",
    desc: "预留开关：服务模块链路尚未完整接入，开启或关闭目前几乎不会影响站点行为。",
    superAdminOnly: true,
  },
  {
    key: "restrictedProductComplianceEnabled",
    label: "受限商品合规（预留）",
    desc: "预留开关：影响受监管商品的提示与限制逻辑；修改前请与业务/法务确认。",
    superAdminOnly: true,
  },
];

const OPERATIONAL_ITEMS = FEATURE_ITEMS.filter((item) => !item.superAdminOnly);
const RESERVED_ITEMS = FEATURE_ITEMS.filter((item) => item.superAdminOnly);

export default function AdminFeatureSettings() {
  const { tText } = useAdminT();
  const queryClient = useQueryClient();
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const [values, setValues] = useState<SiteCapabilities>(DEFAULT_SITE_CAPABILITIES);
  const [formHydrated, setFormHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  const capabilitiesQuery = useQuery({
    queryKey: adminQueryKeys.siteCapabilities(),
    queryFn: settingsService.fetchSiteCapabilities,
    staleTime: 60_000,
  });

  const loading = capabilitiesQuery.isLoading && !capabilitiesQuery.data;
  const { dirty, markClean } = useAdminFormDirty(values, formHydrated && !loading);

  const hydrateFromServer = useCallback((data: SiteCapabilities) => {
    setValues({ ...DEFAULT_SITE_CAPABILITIES, ...data });
    setFormHydrated(true);
  }, []);

  useHydrateFromQuery(capabilitiesQuery.data, hydrateFromServer, dirty);

  const enabledOperationalCount = useMemo(
    () => OPERATIONAL_ITEMS.filter((item) => values[item.key]).length,
    [values],
  );

  const save = async () => {
    setSaving(true);
    try {
      const next = await settingsService.updateSiteCapabilities(values);
      const nextValues = { ...DEFAULT_SITE_CAPABILITIES, ...(next ?? {}) };
      setValues(nextValues);
      markClean(nextValues);
      await refreshSiteCapabilities();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.siteCapabilities() });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.telegramSettings() });
      toast.success(tText("功能开关已保存"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const renderItem = (item: FeatureItem) => {
    const readOnly = Boolean(item.superAdminOnly && !isSuperAdmin);
    return (
      <div
        key={item.key}
        className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
          item.superAdminOnly
            ? "border-dashed border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
            : "border-border"
        } ${readOnly ? "opacity-75" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-foreground">{item.label}</div>
            {item.superAdminOnly ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                预留 · 仅超级管理员
              </span>
            ) : null}
            <AdminFieldHint text={item.desc} />
          </div>
          {readOnly ? (
            <p className="mt-1 text-xs text-muted-foreground">当前为只读；如需调整请联系超级管理员。</p>
          ) : null}
        </div>
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-primary"
          checked={values[item.key]}
          onChange={(event) => setValues((prev) => ({ ...prev, [item.key]: event.target.checked }))}
          disabled={loading || saving || readOnly}
          aria-label={item.label}
        />
      </div>
    );
  };

  return (
    <AdminPageShell
      hint={(
        <Tx>
          {dirty
            ? `已修改功能开关，请点击右上角「保存」写入数据库（${enabledOperationalCount} / ${OPERATIONAL_ITEMS.length} 项已开启）。`
            : `常规开关已启用 ${enabledOperationalCount} / ${OPERATIONAL_ITEMS.length} 项。保存后立即作用于前台入口与相关接口；底部「预留」项仅超级管理员可修改。`}
        </Tx>
      )}
      toolbar={(
        <UnifiedButton
          type="button"
          onClick={save}
          disabled={saving || loading || !dirty}
          className={`rounded-full px-4 py-2 text-sm font-medium text-[var(--theme-price-foreground)] disabled:opacity-50 ${
            dirty ? "bg-[var(--theme-price)]" : "bg-muted text-muted-foreground"
          }`}
        >
          {saving ? tText("保存中...") : dirty ? tText("保存") : tText("已保存")}
        </UnifiedButton>
      )}
    >
      <section className="rounded-2xl border border-border bg-card">
        <div className="space-y-6 p-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground"><Tx>常规功能</Tx></h3>
            <div className="grid gap-3 md:grid-cols-2">{OPERATIONAL_ITEMS.map(renderItem)}</div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground"><Tx>预留能力</Tx></h3>
              <AdminFieldHint text="以下开关已接入配置存储，但业务链路未完整验收；默认仅超级管理员可修改，避免误操作。" />
            </div>
            {isSuperAdmin ? (
              <div className="grid gap-3 md:grid-cols-2">{RESERVED_ITEMS.map(renderItem)}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                <p><Tx>预留能力仅对超级管理员开放。</Tx></p>
                <p className="mt-1"><Tx>这些开关属于预留/高风险配置，普通管理员无需操作。</Tx></p>
              </div>
            )}
          </div>
        </div>
      </section>
    </AdminPageShell>
  );
}
