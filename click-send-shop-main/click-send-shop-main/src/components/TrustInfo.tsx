import { ShieldCheck, Truck, RefreshCcw } from "lucide-react";

/**
 * 商品详情页 / Checkout 等转化关键节点的信任行
 * 三项核心承诺
 */
const ITEMS = [
  { icon: ShieldCheck, label: "支付安全" },
  { icon: Truck, label: "极速发货" },
  { icon: RefreshCcw, label: "退款保障" },
];

interface Props {
  className?: string;
}

export default function TrustInfo({ className = "" }: Props) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground ${className}`}
    >
      {ITEMS.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <it.icon size={14} className="text-emerald-600" />
          {it.label}
        </span>
      ))}
    </div>
  );
}
