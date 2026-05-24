import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import * as settingsService from "@/services/admin/settingsService";
import { DEFAULT_SITE_CAPABILITIES, type SiteCapabilities } from "@/types/siteCapabilities";
import { refreshSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

const FEATURE_ITEMS: Array<{ key: keyof SiteCapabilities; label: string; desc: string }> = [
  { key: "mallEnabled", label: "商城模块", desc: "控制商品、购物车等商城入口展示。" },
  { key: "serviceEnabled", label: "服务模块", desc: "控制服务型内容与入口展示。" },
  { key: "onlinePaymentEnabled", label: "在线支付", desc: "关闭后前端隐藏支付入口，后端拒绝创建在线支付。" },
  { key: "pointsEnabled", label: "积分", desc: "关闭后隐藏积分入口，后端拒绝积分相关接口。" },
  { key: "couponEnabled", label: "优惠券", desc: "关闭后隐藏优惠券入口，后端拒绝领券和优惠券管理接口。" },
  { key: "reviewEnabled", label: "评价", desc: "关闭后隐藏评价入口，后端拒绝提交评价。" },
  { key: "inventoryEnabled", label: "库存", desc: "关闭后隐藏库存管理入口，后端拒绝库存管理接口。" },
  { key: "shippingEnabled", label: "配送", desc: "关闭后隐藏配送设置，后端拒绝配送管理接口。" },
  { key: "memberLevelEnabled", label: "会员等级", desc: "关闭后隐藏会员等级入口，后端拒绝会员等级管理接口。" },
  { key: "customerServiceDownloadEnabled", label: "客服/APP 页", desc: "关闭后隐藏前台客服/APP 页与底部导航入口。" },
  { key: "telegramOrderNotifyEnabled", label: "Telegram 订单通知", desc: "与「Telegram 通知」页的启用开关同步；关闭后不再发送付款成功提醒。" },
  { key: "languageGateEnabled", label: "中文浏览器限制", desc: "开启后前台商城路由将拦截非中文浏览器；后台 /admin 不受限。仅前端拦截，API 仍可直连。" },
  { key: "restrictedProductComplianceEnabled", label: "受限商品合规", desc: "控制受限商品合规提示和限制逻辑。" },
  { key: "trafficAnalyticsEnabled", label: "流量分析", desc: "关闭后前端隐藏追踪加载，后端可减少埋点入口。" },
];

export default function AdminFeatureSettings() {
  const { tText } = useAdminT();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<SiteCapabilities>(DEFAULT_SITE_CAPABILITIES);
  const [saving, setSaving] = useState(false);
  const visibleFeatureItems = useMemo(
    () => FEATURE_ITEMS.filter((item) => !["serviceEnabled", "restrictedProductComplianceEnabled"].includes(item.key)),
    [],
  );

  const capabilitiesQuery = useQuery({
    queryKey: adminQueryKeys.siteCapabilities(),
    queryFn: settingsService.fetchSiteCapabilities,
    staleTime: 60_000,
  });

  const loading = capabilitiesQuery.isLoading && !capabilitiesQuery.data;

  useEffect(() => {
    if (!capabilitiesQuery.data) return;
    setValues({ ...DEFAULT_SITE_CAPABILITIES, ...capabilitiesQuery.data });
  }, [capabilitiesQuery.data]);

  const enabledCount = useMemo(
    () => visibleFeatureItems.filter((item) => values[item.key]).length,
    [values, visibleFeatureItems],
  );

  const save = async () => {
    setSaving(true);
    try {
      const next = await settingsService.updateSiteCapabilities(values);
      setValues({ ...DEFAULT_SITE_CAPABILITIES, ...(next ?? {}) });
      await refreshSiteCapabilities();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.siteCapabilities() });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.telegramSettings() });
      toast.success(tText("功能开关已保存"));
    } catch {
      toast.error(tText("保存失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground"><Tx>站点功能能力</Tx></h2>
            <AdminFieldHint
              text={`当前启用 ${enabledCount} / ${visibleFeatureItems.length} 项。保存后立即作用于前台入口与相关接口。`}
            />
          </div>
          <button type="button" onClick={save} disabled={saving || loading} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {visibleFeatureItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <div className="font-medium text-foreground">{item.label}</div>
                <AdminFieldHint text={item.desc} />
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={values[item.key]}
                onChange={(event) => setValues((prev) => ({ ...prev, [item.key]: event.target.checked }))}
                disabled={loading || saving}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
