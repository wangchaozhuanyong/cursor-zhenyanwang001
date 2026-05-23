import { Headphones, LifeBuoy, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "正品保障" },
  { icon: Truck, label: "本地配送" },
  { icon: Headphones, label: "中文客服" },
  { icon: LifeBuoy, label: "售后协助" },
] as const;

interface HomeTrustBarProps {
  className?: string;
}

/** 首页服务保障条：独立模块，置于轮播图正下方 */
export default function HomeTrustBar({ className }: HomeTrustBarProps) {
  return (
    <section
      className={cn(
        "grid grid-cols-4 gap-0.5 rounded-2xl border border-[color-mix(in_srgb,var(--theme-border)_72%,transparent)]",
        "bg-[color-mix(in_srgb,var(--theme-surface)_96%,var(--theme-bg))] px-1 py-3.5 sm:gap-1 sm:px-2 sm:py-4",
        className,
      )}
      aria-label="服务保障"
    >
      {TRUST_ITEMS.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex min-w-0 flex-col items-center justify-center gap-1.5 px-0.5 text-center"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-text)_4%,transparent)]"
            aria-hidden
          >
            <Icon
              size={16}
              strokeWidth={1.75}
              className="text-[color-mix(in_srgb,var(--theme-text)_58%,var(--theme-text-muted))]"
            />
          </span>
          <span className="store-caption w-full whitespace-nowrap font-medium leading-none tracking-[0.02em] text-[color-mix(in_srgb,var(--theme-text)_82%,var(--theme-text-muted))]">
            {label}
          </span>
        </div>
      ))}
    </section>
  );
}
