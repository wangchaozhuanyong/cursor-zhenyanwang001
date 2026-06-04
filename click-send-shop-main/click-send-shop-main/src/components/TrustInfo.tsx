import { ShieldCheck, Truck, RefreshCcw } from "lucide-react";
import { useSiteInfo } from "@/hooks/useSiteInfo";

/**
 * 商品详情页 / Checkout / 购物车等转化关键节点的「信任三件套」
 *
 * 两种渲染模式：
 *  - variant="row"  紧凑多行（默认）— 每项含标题 + 后台短文案（最多 3 行），适合 Checkout / 购物车
 *  - variant="card" 主副文案的 3 栏卡片 — 适合商品详情页等需要强转化的位置
 *
 * 副文案优先取后台 site_settings 中的 paymentNotice / shippingNotice / supportText（售后信任文案，非客服渠道）。
 * 未配置时回退到默认文案。联系客服请走「客服中心」配置。
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
      title: "支付安全",
      desc: site.paymentNotice || "Stripe 安全支付，全程 SSL 加密",
    },
    {
      icon: Truck,
      title: "极速发货",
      desc: site.shippingNotice || "16:00 前付款当日发货，2-5 天送达",
    },
    {
      icon: RefreshCcw,
      title: "售后无忧",
      desc: site.supportText || "7 天无理由退换，售后政策以页面说明为准",
    },
  ];

  if (variant === "card") {
    return (
      <div
        className={`grid gap-3 rounded-2xl border border-border bg-secondary p-4 sm:grid-cols-3 ${className}`}
      >
        {items.map((it) => (
          <div key={it.title} className="flex items-start gap-2">
            <it.icon size={18} className="mt-0.5 flex-shrink-0 text-theme-price" />
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
    <div className={`space-y-2.5 text-xs ${className}`}>
      {items.map((it) => (
        <div key={it.title} className="flex items-start gap-2">
          <it.icon size={14} className="mt-0.5 flex-shrink-0 text-[var(--theme-success)]" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{it.title}</p>
            <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-muted-foreground">{it.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
