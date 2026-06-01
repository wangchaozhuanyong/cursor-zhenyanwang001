import { Headphones, LifeBuoy, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "正品保障", tone: "assurance" },
  { icon: Truck, label: "本地配送", tone: "delivery" },
  { icon: Headphones, label: "中文客服", tone: "support" },
  { icon: LifeBuoy, label: "售后协助", tone: "aftercare" },
] as const;

interface HomeTrustBarProps {
  className?: string;
}

/** 首页服务保障条：独立模块，置于轮播图正下方 */
export default function HomeTrustBar({ className }: HomeTrustBarProps) {
  return (
    <section
      className={cn("store-trust-bar", className)}
      aria-label="服务保障"
    >
      {TRUST_ITEMS.map(({ icon: Icon, label, tone }) => (
        <div
          key={label}
          className="store-trust-item"
          data-trust-tone={tone}
        >
          <span
            className="store-trust-icon"
            aria-hidden
          >
            <Icon
              size={17}
              strokeWidth={2}
              className="store-trust-icon__glyph"
            />
          </span>
          <span className="store-trust-label">
            {label}
          </span>
        </div>
      ))}
    </section>
  );
}
