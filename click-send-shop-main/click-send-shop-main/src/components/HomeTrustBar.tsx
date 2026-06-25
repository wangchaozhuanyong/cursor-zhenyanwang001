import { Headphones, LifeBuoy, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicLocale } from "@/i18n/publicLocale";

const TRUST_ITEMS = [
  { icon: ShieldCheck, labelKey: "trust.assurance", tone: "assurance" },
  { icon: Truck, labelKey: "trust.delivery", tone: "delivery" },
  { icon: Headphones, labelKey: "trust.support", tone: "support" },
  { icon: LifeBuoy, labelKey: "trust.aftercare", tone: "aftercare" },
] as const;

interface HomeTrustBarProps {
  className?: string;
}

/** 首页服务保障条：独立模块，置于轮播图正下方 */
export default function HomeTrustBar({ className }: HomeTrustBarProps) {
  const { t } = usePublicLocale();

  return (
    <section
      className={cn("sf-next-trust-bar", className)}
      aria-label={t("trust.label")}
    >
      {TRUST_ITEMS.map(({ icon: Icon, labelKey, tone }) => (
        <div
          key={labelKey}
          className="sf-next-trust-item"
          data-trust-tone={tone}
        >
          <span
            className="sf-next-trust-icon"
            aria-hidden
          >
            <Icon
              size={17}
              strokeWidth={2}
              className="sf-next-trust-icon__glyph"
            />
          </span>
          <span className="sf-next-trust-label">
            {t(labelKey)}
          </span>
        </div>
      ))}
    </section>
  );
}
