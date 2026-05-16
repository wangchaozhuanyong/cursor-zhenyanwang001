import { Heart, ShieldCheck, Truck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "正品保障" },
  { icon: Truck, label: "本地配送" },
  { icon: Wallet, label: "安全支付" },
  { icon: Heart, label: "售后无忧" },
] as const;

interface HomeTrustBarProps {
  className?: string;
}

/** 首页服务保障条：独立模块，置于轮播图正下方 */
export default function HomeTrustBar({ className }: HomeTrustBarProps) {
  return (
    <section
      className={cn(
        "grid grid-cols-4 gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3",
        className,
      )}
      aria-label="服务保障"
    >
      {TRUST_ITEMS.map(({ icon: Icon, label }) => (
        <div key={label} className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--theme-text)]">
          <Icon size={14} className="shrink-0 text-[var(--theme-price)]" aria-hidden />
          <span className="truncate">{label}</span>
        </div>
      ))}
    </section>
  );
}
