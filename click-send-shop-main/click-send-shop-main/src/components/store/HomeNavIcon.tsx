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
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ensureMediaUrl } from "@/utils/mediaUrl";

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

type HomeNavIconProps = {
  value: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

export function isHomeNavImageIcon(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http") || v.startsWith("/") || v.startsWith("data:image/");
}

function resolveIconImageSrc(value: string): string {
  return ensureMediaUrl(value);
}

export default function HomeNavIcon({
  value,
  className,
  imageClassName,
  loading = "eager",
  fetchPriority = "auto",
}: HomeNavIconProps) {
  const iconValue = value.trim();
  const token = iconValue.toLowerCase() as keyof typeof ICON_TOKENS;
  const TokenIcon = ICON_TOKENS[token];
  const imageSource = useMemo(
    () => (isHomeNavImageIcon(iconValue) ? resolveIconImageSrc(iconValue) : null),
    [iconValue],
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState(imageSource || "");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSrc(imageSource || "");
    setLoaded(false);
  }, [imageSource]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  if (!iconValue) {
    return <span className={cn("text-sm font-semibold text-[var(--theme-text-muted)]", className)}>·</span>;
  }

  if (TokenIcon) {
    return (
      <span className={cn("flex h-full w-full items-center justify-center text-[var(--theme-primary)]", className)}>
        <TokenIcon className={cn("h-7 w-7", imageClassName)} strokeWidth={2} aria-hidden />
      </span>
    );
  }

  if (imageSource && src) {
    return (
      <span className={cn("relative flex h-full w-full items-center justify-center", className)}>
        <span
          className={cn(
            "absolute inset-1 rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)] transition-opacity duration-150",
            loaded ? "opacity-0" : "opacity-100",
          )}
          aria-hidden
        />
        <img
          ref={imgRef}
          src={src}
          alt="首页导航图标"
          width={48}
          height={48}
          sizes="48px"
          className={cn(
            "relative z-10 h-full w-full object-contain object-center transition-opacity duration-150",
            loaded ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
          loading={loading}
          {...({ fetchpriority: fetchPriority } as Record<string, string>)}
          decoding={loading === "eager" ? "sync" : "async"}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth > 0) setLoaded(true);
          }}
          onError={() => setLoaded(false)}
        />
      </span>
    );
  }

  return <span className={cn("text-[1.8rem] leading-none", className)}>{iconValue}</span>;
}
