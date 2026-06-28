import { useMemo, useState } from "react";
import { BadgeCheck, BadgeX, CreditCard, Gift, PackageCheck, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteCapabilities, useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { buildCanonical } from "@/utils/seo";
import { STORE_COPY } from "@/constants/storeCopy";
import BalanceFolio from "@/modules/storefront-v2/design/components/BalanceFolio";
import type { SiteCapabilities } from "@/types/siteCapabilities";

type CapabilityGroup = "shopping" | "marketing" | "account" | "system";

const capabilityLabels = [
  { key: "mallEnabled", group: "shopping", label: "商城购物", on: "商品浏览、购物车和订单链路可用", off: "商城购物暂时关闭" },
  { key: "serviceEnabled", group: "shopping", label: "服务入口", on: "签证、装修、留学等服务入口可展示", off: "服务入口暂时关闭" },
  { key: "onlinePaymentEnabled", group: "shopping", label: "在线支付", on: "可展示在线支付入口", off: "在线支付暂不可用" },
  { key: "billplzEnabled", group: "shopping", label: "Billplz / FPX", on: "FPX 在线转账渠道可展示", off: "FPX 在线转账渠道关闭" },
  { key: "inventoryEnabled", group: "shopping", label: "库存状态", on: "库存信息正常展示", off: "库存维护中，提交前会再次确认" },
  { key: "shippingEnabled", group: "shopping", label: "配送规则", on: "结算页可自动计算运费", off: "配送规则维护中" },
  { key: "couponEnabled", group: "marketing", label: "优惠券", on: "优惠券中心和结算优惠可展示", off: "优惠券入口会降级或隐藏" },
  { key: "pointsEnabled", group: "marketing", label: "积分", on: "积分、签到和兑换入口可展示", off: "积分相关入口会关闭" },
  { key: "reviewEnabled", group: "marketing", label: "评价", on: "订单评价入口可展示", off: "评价入口关闭" },
  { key: "memberLevelEnabled", group: "account", label: "会员等级", on: "会员等级和权益入口可展示", off: "会员等级入口关闭" },
  { key: "customerServiceDownloadEnabled", group: "account", label: "客服/安装", on: "客服中心和添加桌面入口可展示", off: "客服/安装入口降级到帮助中心" },
  { key: "smsOtpLoginEnabled", group: "account", label: "短信登录", on: "手机号短信验证码登录可用", off: "短信验证码登录关闭" },
  { key: "telegramOrderNotifyEnabled", group: "account", label: "Telegram 通知", on: "订单类 Telegram 通知可用", off: "Telegram 通知关闭" },
  { key: "restrictedProductComplianceEnabled", group: "system", label: "合规提示", on: "限制类商品提示开启", off: "限制类商品提示关闭" },
  { key: "storefrontMultilingualEnabled", group: "system", label: "客户端多语言", on: "前台允许语言路径", off: "前台只使用中文，语言路径自动回到默认入口" },
  { key: "languageGateEnabled", group: "system", label: "语言门", on: "可按访问语言展示入口", off: "语言门关闭" },
  { key: "trafficAnalyticsEnabled", group: "system", label: "流量分析", on: "允许记录匿名访问分析", off: "流量分析关闭" },
  { key: "downloadConfirmEnabled", group: "system", label: "下载确认", on: "下载前确认流程开启", off: "下载确认流程关闭" },
] satisfies ReadonlyArray<{
  key: keyof SiteCapabilities;
  group: CapabilityGroup;
  label: string;
  on: string;
  off: string;
}>;

const filters: Array<{ key: "all" | CapabilityGroup; label: string; icon: typeof SlidersHorizontal }> = [
  { key: "all", label: "全部", icon: SlidersHorizontal },
  { key: "shopping", label: "购物", icon: PackageCheck },
  { key: "marketing", label: "优惠", icon: Gift },
  { key: "account", label: "账户", icon: UserRound },
  { key: "system", label: "系统", icon: CreditCard },
];

export default function FeatureStatus() {
  const goBack = useGoBack("/profile");
  const capabilities = useSiteCapabilities();
  const ready = useSiteCapabilitiesReady();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const [activeFilter, setActiveFilter] = useState<"all" | CapabilityGroup>("all");

  const enabledCount = capabilityLabels.filter((item) => capabilities[item.key]).length;
  const filteredCapabilities = useMemo(() => {
    if (activeFilter === "all") return capabilityLabels;
    return capabilityLabels.filter((item) => item.group === activeFilter);
  }, [activeFilter]);
  const filteredEnabledCount = filteredCapabilities.filter((item) => capabilities[item.key]).length;

  return (
    <StoreStandardPageShell
      title="功能状态"
      onBack={goBack}
      backFallback="/profile"
      className="sf-next-page sf-next-route-page sf-next-feature-status-page"
      contentClassName="sf-next-account-main md:max-w-4xl xl:max-w-5xl"
    >
      <SeoHead
        title={`功能状态｜${siteName}`}
        description={`${siteName} 客户端功能开关状态说明。`}
        canonical={buildCanonical("/feature-status")}
        robots="noindex,follow"
      />

      <div className="sf-next-feature-status-stack">
        <BalanceFolio
          eyebrow="FEATURE STATUS"
          value={ready ? enabledCount : "同步中"}
          unit={ready ? `/ ${capabilityLabels.length}` : undefined}
          caption={ready ? "客户端会按后台功能开关展示或降级入口。" : "正在同步站点功能配置，页面会保持可读。"}
          meta={[
            { label: "当前筛选", value: filters.find((item) => item.key === activeFilter)?.label || "全部" },
            { label: "筛选开启", value: `${filteredEnabledCount}/${filteredCapabilities.length}` },
            { label: "状态来源", value: ready ? "Bootstrap" : "默认配置" },
          ]}
          className="sf-next-feature-status-folio"
        />

        <div className="sf-next-feature-status-filter" role="tablist" aria-label="功能类型">
          {filters.map((item) => {
            const Icon = item.icon;
            const active = activeFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                className="sf-next-feature-status-filter-button"
                onClick={() => setActiveFilter(item.key)}
              >
                <Icon size={16} aria-hidden />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <section className="sf-next-list">
          {filteredCapabilities.map((item) => {
            const enabled = capabilities[item.key];
            const Icon = enabled ? BadgeCheck : BadgeX;
            return (
              <article key={item.key} className="sf-next-status-row">
                <span className={enabled ? "sf-next-status-icon is-on" : "sf-next-status-icon is-off"} aria-hidden>
                  <Icon size={18} />
                </span>
                <div>
                  <h3>{item.label}</h3>
                  <p>{enabled ? item.on : item.off}</p>
                </div>
                <span className={enabled ? "sf-next-pill is-on" : "sf-next-pill is-off"}>
                  {enabled ? "开启" : "关闭"}
                </span>
              </article>
            );
          })}
        </section>

        <section className="sf-next-info-card">
          <div className="sf-next-card-title">
            <ShieldCheck size={18} aria-hidden />
            说明
          </div>
          <p className="sf-next-muted">
            功能开关只控制入口和交互可用性；支付、库存、配送和活动结果以实际订单链路返回为准。
          </p>
        </section>
      </div>
    </StoreStandardPageShell>
  );
}
