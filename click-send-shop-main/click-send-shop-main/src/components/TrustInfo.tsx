import { ShieldCheck, Truck, RefreshCcw } from "lucide-react";
import { useSiteInfo } from "@/hooks/useSiteInfo";

/**
 * 商品详情页 / Checkout / 购物车等转化关键节点的「信任三件套」
 *
 * 两种渲染模式：
 *  - variant="row"  紧凑单行（默认）— 适合 Checkout / 购物车等已有信息密度的位置
 *  - variant="card" 主副文案的 3 栏卡片 — 适合商品详情页等需要强转化的位置
 *
 * 副文案优先取后台 site_settings 中的 paymentNotice / shippingNotice / supportText，
 * 未配置时回退到默认文案。
 */
interface Props {
  className?: string;
  variant?: "row" | "card";
}

export default function TrustInfo({ className = "", variant = "row" }: Props) {
  const site = useSiteInfo();

  const items = [
    {
      icon: ShieldCheck,
      title: "Secure Payment",
      label: "支付安全",
      desc: site.paymentNotice || "Stripe 安全支付，全程 SSL 加密",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      label: "极速发货",
      desc: site.shippingNotice || "16:00 前付款当日发货，2-5 天送达",
    },
    {
      icon: RefreshCcw,
      title: "After-sales Support",
      label: "售后无忧",
      desc: site.supportText || "7 天无理由退换，专属客服在线响应",
    },
  ];

  if (variant === "card") {
    return (
      <div
        className={`grid gap-3 rounded-2xl border border-border bg-secondary p-4 sm:grid-cols-3 ${className}`}
      >
        {items.map((it) => (
          <div key={it.title} className="flex items-start gap-2">
            <it.icon size={18} className="mt-0.5 flex-shrink-0 text-gold" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{it.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground ${className}`}
    >
      {items.map((it) => (
        <span key={it.title} className="inline-flex items-center gap-1.5">
          <it.icon size={14} className="text-emerald-600" />
          {it.label}
        </span>
      ))}
    </div>
  );
}
