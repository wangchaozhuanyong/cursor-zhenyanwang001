import {
  BadgePercent,
  BedDouble,
  BookOpenCheck,
  Cigarette,
  ClipboardList,
  FileCheck2,
  Flame,
  Gift,
  GraduationCap,
  Grid3X3,
  HandCoins,
  Headphones,
  HelpCircle,
  Home,
  Landmark,
  Leaf,
  MapPin,
  PaintRoller,
  ShoppingBag,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  Wine,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ensureMediaUrl } from "@/utils/mediaUrl";
import { pickUploadImageVariant } from "@/utils/uploadImageVariant";

const ICON_TOKENS = {
  all: Grid3X3,
  categories: Grid3X3,
  category: Grid3X3,
  grid: Grid3X3,
  bag: ShoppingBag,
  shop: ShoppingBag,
  gift: Gift,
  digital: Smartphone,
  phone: Smartphone,
  home: Home,
  local: MapPin,
  deals: BadgePercent,
  deal: BadgePercent,
  coupon: Ticket,
  coupons: Ticket,
  new: Sparkles,
  hot: Flame,
  order: ClipboardList,
  orders: ClipboardList,
  support: Headphones,
  service: Headphones,
  help: HelpCircle,
  info: HelpCircle,
  authentic: ShieldCheck,
  verified: ShieldCheck,
  tobacco: Cigarette,
  cigarette: Cigarette,
  smoke: Cigarette,
  wine: Wine,
  alcohol: Wine,
  renovation: PaintRoller,
  decorate: PaintRoller,
  decoration: PaintRoller,
  construction: PaintRoller,
  invite: HandCoins,
  referral: HandCoins,
  cashback: HandCoins,
  rebate: HandCoins,
  betel: Leaf,
  pinang: Leaf,
  bedding: BedDouble,
  bed: BedDouble,
  visa: FileCheck2,
  permit: FileCheck2,
  study: GraduationCap,
  education: BookOpenCheck,
  school: BookOpenCheck,
  "second-home": Landmark,
  mm2h: Landmark,
  migration: Landmark,
} as const;

export function isHomeNavImageIcon(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http") || v.startsWith("/") || v.startsWith("data:image/");
}

function resolveIconImageSrc(value: string): { preferred: string; fallback: string } {
  const fallback = ensureMediaUrl(value);
  if (!fallback || fallback.startsWith("data:image/")) return { preferred: fallback, fallback };
  return {
    preferred: pickUploadImageVariant(fallback, "card") || fallback,
    fallback,
  };
}

export default function HomeNavIcon({
  value,
  className,
  imageClassName,
}: {
  value: string;
  className?: string;
  imageClassName?: string;
}) {
  const iconValue = value.trim();
  const token = iconValue.toLowerCase() as keyof typeof ICON_TOKENS;
  const TokenIcon = ICON_TOKENS[token];
  const imageSource = useMemo(() => (
    isHomeNavImageIcon(iconValue) ? resolveIconImageSrc(iconValue) : null
  ), [iconValue]);
  const [src, setSrc] = useState(imageSource?.preferred || "");

  useEffect(() => {
    setSrc(imageSource?.preferred || "");
  }, [imageSource]);

  if (!iconValue) {
    return <span className={cn("text-sm font-semibold text-[var(--theme-text-muted)]", className)}>·</span>;
  }

  if (TokenIcon) {
    return (
      <span className={cn("flex h-full w-full items-center justify-center text-[var(--theme-primary)]", className)}>
        <TokenIcon className={cn("h-6 w-6", imageClassName)} strokeWidth={2.1} aria-hidden />
      </span>
    );
  }

  if (imageSource && src) {
    return (
      <img
        src={src}
        alt="首页导航图标"
        width={48}
        height={48}
        sizes="48px"
        className={cn("h-full w-full object-contain object-center transition-opacity duration-300", imageClassName)}
        loading="lazy"
        {...({ fetchpriority: "low" } as Record<string, string>)}
        decoding="async"
        onError={() => {
          if (src !== imageSource.fallback) setSrc(imageSource.fallback);
        }}
      />
    );
  }

  return <span className={cn("text-[1.65rem] leading-none", className)}>{iconValue}</span>;
}
