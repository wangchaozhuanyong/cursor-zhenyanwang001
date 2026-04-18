import { ShieldCheck, Truck, RefreshCcw, Headphones } from "lucide-react";

/**
 * 信任带 - 首页 / 商品详情顶部展示
 * 4 项核心承诺，提升首屏成交信心
 */
const ITEMS = [
  { icon: ShieldCheck, label: "100% 正品保障" },
  { icon: Truck, label: "快速配送 2-5 天" },
  { icon: RefreshCcw, label: "7 天无忧退换" },
  { icon: Headphones, label: "7×24 在线客服" },
];

interface TrustBarProps {
  /** 紧凑模式：单行水平滚动（移动端优化） */
  compact?: boolean;
  className?: string;
}

export default function TrustBar({ compact = false, className = "" }: TrustBarProps) {
  if (compact) {
    return (
      <div
        className={`no-scrollbar flex items-center gap-4 overflow-x-auto px-4 py-3 text-xs ${className}`}
      >
        {ITEMS.map((it) => (
          <div
            key={it.label}
            className="flex flex-shrink-0 items-center gap-1.5 text-muted-foreground"
          >
            <it.icon size={14} className="text-emerald-600" />
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card px-4 py-4 md:grid-cols-4 ${className}`}
    >
      {ITEMS.map((it) => (
        <div
          key={it.label}
          className="flex items-center justify-center gap-2 text-center text-xs font-medium text-foreground sm:text-sm"
        >
          <it.icon size={16} className="flex-shrink-0 text-emerald-600" />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}
