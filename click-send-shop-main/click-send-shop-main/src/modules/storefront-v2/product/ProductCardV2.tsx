import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import ProductCoverImage from "@/components/ProductCoverImage";
import { cn } from "@/lib/utils";
import { appendThemePreviewParams } from "@/utils/themePreviewParams";
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
  const loading = index < 8 ? "eager" : "lazy";
  const fetchPriority = index === 0 ? "high" : undefined;

  if (variant === "list") {
    return (
      <Link
        to={href}
        onClick={onClick}
        data-product-card-variant={variant}
        className={cn(
          "sf-next-product-card sf-next-product-card--list",
          "group grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] items-stretch gap-3",
          className,
        )}
        aria-label={`查看 ${vm.name}`}
      >
        <div
          className="sf-next-product-card__media h-full min-h-[5.75rem] w-full self-stretch sm:min-h-24"
        >
          <ProductCoverImage
            url={vm.imageUrl}
            alt={vm.imageAlt}
            className="h-full w-full"
            imgClassName="h-full w-full"
            fit="cover"
            loading={loading}
            fetchPriority={fetchPriority}
            sizes="96px"
          />
          {vm.soldOut ? <SoldOutMask /> : null}
        </div>

        <div className="sf-next-product-card__info flex min-h-[5.75rem] min-w-0 flex-col sm:min-h-24">
          <h3 className={cn(t.text.productTitle, "sf-next-product-card__title")}>{vm.name}</h3>
          <BadgeRow badges={vm.badges} subtle />
          <DecisionMetaRow items={vm.decisionTexts} />
          <ActivityProgressBar percent={vm.activityProgressPercent} text={vm.activityProgressText} />
          {showPrice ? (
            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
              <StorefrontPrice amount={vm.priceText} originalAmount={vm.originalPriceText} />
              <span className={cn(
                "sf-next-product-card__cart sf-next-product-card__cart--list shrink-0",
                clientStyle === "black_gold" && "sf-next-product-card__open--warm",
                vm.soldOut && "is-disabled",
              )}>
                <Plus size={17} strokeWidth={2.4} />
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
      data-product-card-variant={variant}
      className={cn(
        "sf-next-product-card sf-next-product-card--grid",
        "group flex min-w-0 flex-col",
        variant === "compact" && "sf-next-product-card--compact",
        className,
      )}
      aria-label={`查看 ${vm.name}`}
    >
      <div
        className="sf-next-product-card__media"
      >
          <ProductCoverImage
            url={vm.imageUrl}
            alt={vm.imageAlt}
            className="h-full w-full"
          imgClassName="h-full w-full transition duration-300 group-hover:scale-[1.025]"
          fit="cover"
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

      <div className="sf-next-product-card__info flex flex-col">
        <h3 className={cn(t.text.productTitle, "sf-next-product-card__title")}>{vm.name}</h3>
        {showPrice ? (
          <div className="sf-next-product-card__footer flex items-end justify-between gap-2 pt-2.5">
            <StorefrontPrice className="sf-next-product-card__price" amount={vm.priceText} originalAmount={vm.originalPriceText} />
            <span className="sf-next-product-card__cart" aria-hidden="true">
              <Plus size={17} strokeWidth={2.4} />
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
