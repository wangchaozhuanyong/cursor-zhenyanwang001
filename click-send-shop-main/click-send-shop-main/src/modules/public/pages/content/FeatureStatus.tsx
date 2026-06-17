import { BadgeCheck, BadgeX, ShieldCheck, SlidersHorizontal } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { buildCanonical } from "@/utils/seo";
import { STORE_COPY } from "@/constants/storeCopy";

const capabilityLabels = [
  { key: "mallEnabled", label: "商城购物", on: "商品浏览、购物车和订单链路可用", off: "商城购物暂时关闭" },
  { key: "couponEnabled", label: "优惠券", on: "优惠券中心和结算优惠可展示", off: "优惠券入口会降级或隐藏" },
  { key: "pointsEnabled", label: "积分", on: "积分、签到和兑换入口可展示", off: "积分相关入口会关闭" },
  { key: "onlinePaymentEnabled", label: "在线支付", on: "可展示在线支付入口", off: "前台不展示在线支付确认入口" },
  { key: "inventoryEnabled", label: "库存校验", on: "库存信息按后端规则展示", off: "库存维护中，提交前仍以后端为准" },
  { key: "shippingEnabled", label: "配送规则", on: "结算页可按后台规则计算运费", off: "配送规则维护中" },
  { key: "memberLevelEnabled", label: "会员等级", on: "会员等级和权益入口可展示", off: "会员等级入口关闭" },
  { key: "customerServiceDownloadEnabled", label: "客服/安装", on: "客服中心和添加桌面入口可展示", off: "客服/安装入口降级到帮助中心" },
  { key: "reviewEnabled", label: "评价", on: "订单评价入口可展示", off: "评价入口关闭" },
  { key: "restrictedProductComplianceEnabled", label: "合规提示", on: "限制类商品提示开启", off: "限制类商品提示关闭" },
  { key: "storefrontMultilingualEnabled", label: "客户端多语言", on: "前台允许语言路径", off: "前台只使用中文，语言路径自动回到默认入口" },
] as const;

export default function FeatureStatus() {
  const goBack = useGoBack("/profile");
  const capabilities = useSiteCapabilities();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;

  const enabledCount = capabilityLabels.filter((item) => capabilities[item.key]).length;

  return (
    <StoreStandardPageShell
      title="功能状态"
      onBack={goBack}
      backFallback="/profile"
      className="store-v12-page store-feature-status-v12-page"
      contentClassName="md:max-w-4xl xl:max-w-5xl"
    >
      <SeoHead
        title={`功能状态｜${siteName}`}
        description={`${siteName} 客户端功能开关状态说明。`}
        canonical={buildCanonical("/feature-status")}
        robots="noindex,follow"
      />

      <section className="store-v12-info-hero">
        <span className="store-v12-eyebrow">
          <SlidersHorizontal size={15} aria-hidden />
          功能开关
        </span>
        <h2>前台会按后台功能开关自动降级</h2>
        <p>
          这里展示的是客户端可见能力状态。按钮隐藏只影响体验，权限、金额、库存和活动最终仍由后端接口裁判。
        </p>
        <div className="store-v12-status-strip">
          <span>{enabledCount} 项开启</span>
          <span>{capabilityLabels.length - enabledCount} 项关闭</span>
        </div>
      </section>

      <section className="store-v12-list mt-4">
        {capabilityLabels.map((item) => {
          const enabled = capabilities[item.key];
          const Icon = enabled ? BadgeCheck : BadgeX;
          return (
            <article key={item.key} className="store-v12-status-row">
              <span className={enabled ? "store-v12-status-icon is-on" : "store-v12-status-icon is-off"} aria-hidden>
                <Icon size={18} />
              </span>
              <div>
                <h3>{item.label}</h3>
                <p>{enabled ? item.on : item.off}</p>
              </div>
              <span className={enabled ? "store-v12-pill is-on" : "store-v12-pill is-off"}>
                {enabled ? "开启" : "关闭"}
              </span>
            </article>
          );
        })}
      </section>

      <section className="store-v12-info-card mt-4">
        <div className="store-v12-card-title">
          <ShieldCheck size={18} aria-hidden />
          说明
        </div>
        <p className="store-v12-muted">
          客户端多语言当前默认关闭；后台仍可保留中文和英文管理能力。支付、库存、活动等敏感结果不能只靠前端显示决定。
        </p>
      </section>
    </StoreStandardPageShell>
  );
}
