import { cn } from "@/lib/utils";

export function isHomeNavImageIcon(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http") || v.startsWith("/");
}

/** 金刚区图标：透明 PNG 原样展示（object-contain），Emoji 居中显示 */
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
  if (!iconValue) {
    return <span className={cn("text-sm font-semibold text-[var(--theme-text-muted)]", className)}>·</span>;
  }
  if (isHomeNavImageIcon(iconValue)) {
    return (
      <img
        src={iconValue}
        alt=""
        className={cn("h-full w-full object-contain object-center", imageClassName)}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return <span className={cn("text-[1.65rem] leading-none", className)}>{iconValue}</span>;
}
