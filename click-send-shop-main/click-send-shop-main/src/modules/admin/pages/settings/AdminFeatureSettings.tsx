import { useCallback, useMemo, useState } from "react";
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
import { clearCachedAuthFeatures } from "@/utils/authFeaturesCache";

type FeatureItem = {
  key: keyof SiteCapabilities;
  label: string;
  desc: string;
  /** 预留能力：仅超级管理员可修改，界面灰显提示 */
  superAdminOnly?: boolean;
};

const FEATURE_ITEMS: FeatureItem[] = [
  { key: "mallEnabled", label: "商城模块", desc: "控制商品、购物车等商城入口展示。" },
  {
    key: "onlinePaymentEnabled",
    label: "在线支付",
    desc: "作用：控制结账支付渠道、支付订单和后台支付管理接口；默认开启。关闭后用户不能创建在线支付，只能走站点允许的其他付款方式。风险：误关会直接影响下单收款；只在支付渠道、Webhook 和对账链路确认正常后开启。",
  },
  {
    key: "billplzEnabled",
    label: "Billplz / FPX",
    desc: "控制前台是否展示并允许使用 Billplz / FPX 渠道。需要先在「支付渠道」配置并启用对应渠道；关闭时即使渠道启用，客户端也不会展示该渠道。",
  },
  { key: "pointsEnabled", label: "积分", desc: "关闭后隐藏积分入口，后端拒绝积分相关接口。" },
  { key: "couponEnabled", label: "优惠券", desc: "关闭后隐藏优惠券入口，后端拒绝领券和优惠券管理接口。" },
  { key: "reviewEnabled", label: "评价", desc: "关闭后隐藏评价入口，后端拒绝提交评价。" },
  { key: "inventoryEnabled", label: "库存", desc: "关闭后隐藏库存管理入口，后端拒绝库存管理接口。" },
  { key: "shippingEnabled", label: "配送", desc: "关闭后隐藏配送设置，后端拒绝配送管理接口。" },
  { key: "memberLevelEnabled", label: "会员等级", desc: "关闭后隐藏会员等级入口，后端拒绝会员等级管理接口。" },
  { key: "customerServiceDownloadEnabled", label: "客服/APP 页", desc: "关闭后隐藏前台客服/APP 页与底部导航入口。" },
  {
    key: "smsOtpLoginEnabled",
    label: "短信验证码登录",
    desc: "控制登录页「验证码登录」入口和短信验证码登录接口。关闭后用户只能使用密码登录；生产环境仍需短信服务配置完整才会真正开启。",
  },
  {
    key: "telegramOrderNotifyEnabled",
    label: "Telegram 订单通知",
    desc: "与「Telegram 通知」页同步；关闭后不再发送付款成功提醒，并隐藏侧栏 Telegram 设置入口。",
  },
  {
    key: "languageGateEnabled",
    label: "中文浏览器限制",
    desc: "作用：前台商城会拦截非中文浏览器访问；默认关闭。影响范围只包含前台页面，后台 /admin 不受影响，API 仍需靠后端权限保护。风险：海外或英文系统用户可能被挡住；只在明确要限制中文用户访问时开启。",
  },
  {
    key: "storefrontMultilingualEnabled",
    label: "前台多语言（中文/英文）",
    desc: "作用：控制前台是否显示语言切换器和 /en 语言路径；默认关闭，前台只显示中文。后台 /admin 仍保留中文/英文切换，不受这个开关影响；马来文入口不再开放。",
  },
  {
    key: "trafficAnalyticsEnabled",
    label: "流量分析",
    desc: "作用：控制前台浏览、点击和活动统计上报；默认开启。影响范围是数据分析和报表，不应影响用户看页面、下单或支付。风险：关闭后报表会缺少新流量数据；只在统计接口异常、隐私策略调整或临时排查时关闭。",
  },
  {
    key: "downloadConfirmEnabled",
    label: "下载二次确认",
    desc: "作用：导出、CSV、二维码、海报等下载前先弹出确认；默认开启。影响前台和后台下载入口。风险：关闭后误点会直接保存文件，敏感报表更容易被带出；只在可信内网或临时排查下载问题时考虑关闭。",
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
    desc: "作用：控制前台受监管商品角标、详情合规提示和年龄确认；默认开启。受监管商品 noindex 由「站点设置 > 合规与访问限制」里的独立 SEO 开关控制。风险：误关可能让受限商品缺少提醒；修改前必须先和业务/法务确认。",
    superAdminOnly: true,
  },
  {
    key: "promotionEngineV2",
    label: "营销引擎 V2（预留）",
    desc: "后端预留开关：用于新营销引擎灰度。默认关闭，未验收前不建议开启。",
    superAdminOnly: true,
  },
  {
    key: "pricingEngineV2",
    label: "价格引擎 V2（预留）",
    desc: "后端预留开关：用于新价格计算链路灰度。默认关闭，涉及订单金额，未验收前不建议开启。",
    superAdminOnly: true,
  },
  {
    key: "inventoryLockV2",
    label: "库存锁定 V2（预留）",
    desc: "后端预留开关：用于新库存锁定链路灰度。默认关闭，涉及下单库存占用，未验收前不建议开启。",
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
      clearCachedAuthFeatures();
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
