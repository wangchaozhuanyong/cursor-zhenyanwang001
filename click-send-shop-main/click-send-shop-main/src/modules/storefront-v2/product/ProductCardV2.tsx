import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { cn } from "@/lib/utils";
import { appendThemePreviewParams } from "@/utils/themePreviewParams";
import { storefrontCardClassName } from "../design/classes";
import { storefrontV2Tokens as t } from "../design/tokens";
import { useClientDesignStyle } from "../design/useClientDesignStyle";
import StorefrontBadge from "../components/StorefrontBadge";
import StorefrontPrice from "../components/StorefrontPrice";
import { buildProductCardV2Model } from "./productCardV2Model";
import type { Product } from "@/types/product";

type ProductCardV2Props = {
  product: Product;
  index?: number;
  variant?: "grid" | "compact" | "list";
  className?: string;
  showPrice?: boolean;
  onClick?: () => void;
};

export default function ProductCardV2({
  product,
  index = 0,
  variant = "grid",
  className,
  showPrice = true,
  onClick,
}: ProductCardV2Props) {
  const vm = buildProductCardV2Model(product);
  const href = appendThemePreviewParams(vm.href);
  const clientStyle = useClientDesignStyle();
  const cardToneClassName = cn(
    clientStyle === "black_gold" && "border-[color-mix(in_srgb,var(--theme-primary)_22%,var(--theme-border))] bg-[var(--theme-surface)] shadow-[0_14px_38px_color-mix(in_srgb,var(--theme-primary)_10%,transparent)]",
    clientStyle === "deep_enterprise" && "rounded-[0.875rem] shadow-[0_10px_28px_rgba(15,23,42,0.07)]",
    clientStyle === "blue_portal" && "shadow-[0_12px_34px_rgba(37,99,235,0.08)]",
  );
  const imageClassName = cn(
    "relative overflow-hidden bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-bg))]",
    clientStyle === "deep_enterprise" ? "rounded-[0.75rem]" : "rounded-[0.95rem]",
    clientStyle === "black_gold" && "bg-[linear-gradient(145deg,#F8F5EA,#FFFFFF)]",
  );
  const actionClassName = cn(
    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--theme-primary)] transition group-hover:bg-[var(--theme-primary)] group-hover:text-[var(--theme-primary-foreground)]",
    clientStyle === "black_gold"
      ? "bg-[color-mix(in_srgb,var(--theme-primary)_16%,var(--theme-surface))] ring-1 ring-[color-mix(in_srgb,var(--theme-primary)_28%,transparent)]"
      : "bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))]",
  );
  const loading = index < 4 ? "eager" : "lazy";
  const fetchPriority = index === 0 ? "high" : undefined;

  if (variant === "list") {
    return (
      <Link
        to={href}
        onClick={onClick}
        className={cn(
          storefrontCardClassName(),
          "store-product-card-v2 store-product-card-v2--list",
          "group grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] items-stretch gap-3 p-2.5 hover:-translate-y-0.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:p-3",
          cardToneClassName,
          className,
        )}
        aria-label={`查看 ${vm.name}`}
      >
        <div
          className={cn(imageClassName, "h-full min-h-[5.75rem] w-full self-stretch sm:min-h-24")}
        >
          <ProductCoverImage
            url={vm.imageUrl}
            alt={vm.imageAlt}
            className="h-full w-full"
            imgClassName="h-full w-full object-cover"
            loading={loading}
            fetchPriority={fetchPriority}
            sizes="96px"
          />
          {vm.soldOut ? <SoldOutMask /> : null}
        </div>

        <div className="flex min-h-[5.75rem] min-w-0 flex-col py-1 sm:min-h-24">
          <h3 className={t.text.productTitle}>{vm.name}</h3>
          <BadgeRow badges={vm.badges} subtle />
          <DecisionMetaRow items={vm.decisionTexts} />
          <ActivityProgressBar percent={vm.activityProgressPercent} text={vm.activityProgressText} />
          {showPrice ? (
            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
              <StorefrontPrice amount={vm.priceText} originalAmount={vm.originalPriceText} />
              <span className={cn(
                "hidden h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-black text-[var(--theme-primary)] sm:inline-flex",
                clientStyle === "black_gold" ? "bg-[color-mix(in_srgb,var(--theme-primary)_15%,var(--theme-surface))]" : "bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))]",
              )}>
                查看
                <ArrowUpRight size={12} />
              </span>
            </div>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        storefrontCardClassName(),
        "store-product-card-v2",
        "group flex min-w-0 flex-col overflow-hidden p-1.5 hover:-translate-y-0.5",
        cardToneClassName,
        variant === "compact" && "max-w-[13rem]",
        className,
      )}
      aria-label={`查看 ${vm.name}`}
    >
      <div
        className={cn(imageClassName, "w-full")}
        style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
      >
        <ProductCoverImage
          url={vm.imageUrl}
          alt={vm.imageAlt}
          className="h-full w-full"
          imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading={loading}
          fetchPriority={fetchPriority}
          sizes="(max-width: 768px) 50vw, 260px"
        />

        <div className="absolute left-2 top-2 flex max-w-[calc(100%-16px)] flex-wrap gap-1">
          {vm.badges.map((badge) => (
            <StorefrontBadge key={badge.key} tone={badge.tone}>
              {badge.label}
            </StorefrontBadge>
          ))}
        </div>

        {vm.soldOut ? <SoldOutMask /> : null}
      </div>

      <div className="flex min-h-[132px] flex-1 flex-col px-1.5 pb-2 pt-3 sm:px-2">
        <h3 className={t.text.productTitle}>{vm.name}</h3>
        <DecisionMetaRow items={vm.decisionTexts} />
        <ActivityProgressBar percent={vm.activityProgressPercent} text={vm.activityProgressText} />
        {showPrice ? (
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <StorefrontPrice amount={vm.priceText} originalAmount={vm.originalPriceText} />
            <span className={actionClassName}>
              <ArrowUpRight size={14} />
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function ActivityProgressBar({ percent, text }: { percent?: number; text?: string }) {
  if (!percent && !text) return null;
  const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent || 0))));
  return (
    <div className="mt-2 min-h-[1.1rem]">
      <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-border)_70%,transparent)]">
        <div
          className="h-full rounded-full bg-[var(--theme-price)] transition-[width]"
          style={{ width: `${safePercent}%` }}
        />
      </div>
      {text ? <p className="mt-1 truncate text-[11px] leading-4 text-[var(--theme-text-muted)]">{text}</p> : null}
    </div>
  );
}

function DecisionMetaRow({ items }: { items: string[] }) {
  return (
    <div className="mt-1.5 flex min-h-[1rem] min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-[var(--theme-text-muted)]">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-1">
          {index > 0 ? <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--theme-border)]" aria-hidden /> : null}
          <span className="truncate">{item}</span>
        </span>
      ))}
    </div>
  );
}

function BadgeRow({ badges, subtle = false }: { badges: Array<{ key: string; label: string; tone: "hot" | "new" | "sale" | "normal" }>; subtle?: boolean }) {
  if (!badges.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {badges.slice(0, 2).map((badge) => (
        <StorefrontBadge key={badge.key} tone={subtle ? "normal" : badge.tone}>
          {badge.label}
        </StorefrontBadge>
      ))}
    </div>
  );
}

function SoldOutMask() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-xs font-bold text-white">
      已售罄
    </div>
  );
}
