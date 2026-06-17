import { Clock3, MapPin, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { usePublicLocale } from "@/i18n/publicLocale";
import { buildCanonical } from "@/utils/seo";
import { STORE_COPY } from "@/constants/storeCopy";

const deliveryZones = [
  {
    title: "西马配送",
    description: "适用于 Kuala Lumpur、Selangor、Johor、Penang 等西马州属。",
    meta: "结算页按州属、城市、邮编、重量和订单金额实时计算",
    icon: MapPin,
  },
  {
    title: "东马配送",
    description: "适用于 Sabah、Sarawak、Labuan 等东马区域。",
    meta: "部分商品、重量或地址可能不可配送，以结算页校验为准",
    icon: Truck,
  },
  {
    title: "物流轨迹",
    description: "订单发货后可在订单详情进入物流轨迹页查看最新节点。",
    meta: "后台填写物流单号和轨迹后同步展示",
    icon: PackageCheck,
  },
];

const ruleItems = [
  "运费不在前端估算，最终金额只认结算页后端预览结果。",
  "地址需要包含州属、城市、邮编和手机号，避免配送规则匹配失败。",
  "库存、活动和运费会在提交订单前重新校验。",
  "限制类商品、超重商品或特殊地址可能出现不可配送提示。",
];

export default function Delivery() {
  const goBack = useGoBack("/");
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;

  return (
    <StoreStandardPageShell
      title="配送方式"
      onBack={goBack}
      backFallback="/"
      className="store-v12-page store-delivery-v12-page"
      contentClassName="md:max-w-5xl xl:max-w-6xl"
    >
      <SeoHead
        title={`配送方式｜${siteName}`}
        description={`${siteName} 配送方式、东西马配送说明、地址校验和物流轨迹说明。`}
        canonical={buildCanonical("/delivery")}
        robots="index,follow"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="store-v12-info-hero">
          <span className="store-v12-eyebrow">
            <Truck size={15} aria-hidden />
            配送规则
          </span>
          <h2>东西马配送以结算页后端规则为准</h2>
          <p>
            前台只展示配送说明和地址准备状态；实际运费、不可配送原因和物流进度均由后台规则与订单数据返回。
          </p>
          <div className="store-v12-hero-actions">
            <UnifiedButton type="button" onClick={() => navigate(localizedPath("/address"))} className="store-v12-primary-action">
              管理收货地址
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => navigate(localizedPath("/help"))} className="store-v12-secondary-action">
              查看帮助
            </UnifiedButton>
          </div>
        </section>

        <aside className="store-v12-info-card">
          <div className="store-v12-card-title">
            <ShieldCheck size={18} aria-hidden />
            结算安全规则
          </div>
          <p className="store-v12-muted">
            商品页、购物车展示的配送信息只是提示；创建订单前会再次校验地址、库存、活动和运费。
          </p>
        </aside>
      </div>

      <section className="store-v12-grid mt-4">
        {deliveryZones.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="store-v12-info-card">
              <span className="store-v12-card-icon" aria-hidden>
                <Icon size={20} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>{item.meta}</small>
            </article>
          );
        })}
      </section>

      <section className="store-v12-info-card mt-4">
        <div className="store-v12-card-title">
          <Clock3 size={18} aria-hidden />
          下单前需要知道
        </div>
        <div className="store-v12-list">
          {ruleItems.map((item) => (
            <div key={item} className="store-v12-list-row">
              <span className="store-v12-dot" aria-hidden />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </StoreStandardPageShell>
  );
}
