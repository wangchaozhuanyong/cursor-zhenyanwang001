import { Link } from "react-router-dom";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { cn } from "@/lib/utils";
import { storefrontCardClassName } from "../design/classes";
import { storefrontV2Tokens as t } from "../design/tokens";
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
  const loading = index < 4 ? "eager" : "lazy";
  const fetchPriority = index === 0 ? "high" : undefined;

  if (variant === "list") {
    return (
      <Link
        to={vm.href}
        onClick={onClick}
        className={cn(
          storefrontCardClassName(),
          "flex min-w-0 gap-3 p-3",
          className,
        )}
        aria-label={`查看 ${vm.name}`}
      >
        <div
          className="relative w-16 shrink-0 self-start overflow-hidden rounded-xl bg-[var(--theme-bg)] sm:w-20"
          style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
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

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className={t.text.productTitle}>{vm.name}</h3>
          <BadgeRow badges={vm.badges} subtle />
          <DecisionMetaRow items={vm.decisionTexts} />
          {showPrice ? (
            <div className="mt-auto pt-2">
              <StorefrontPrice amount={vm.priceText} originalAmount={vm.originalPriceText} />
            </div>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={vm.href}
      onClick={onClick}
      className={cn(
        storefrontCardClassName(),
        "group flex min-w-0 flex-col overflow-hidden",
        variant === "compact" && "max-w-[13rem]",
        className,
      )}
      aria-label={`查看 ${vm.name}`}
    >
      <div className="relative w-full overflow-hidden bg-[var(--theme-bg)]" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}>
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

      <div className="flex min-h-[126px] flex-1 flex-col p-2.5">
        <h3 className={t.text.productTitle}>{vm.name}</h3>
        <DecisionMetaRow items={vm.decisionTexts} />
        {showPrice ? (
          <div className="mt-auto pt-2">
            <StorefrontPrice amount={vm.priceText} originalAmount={vm.originalPriceText} />
          </div>
        ) : null}
      </div>
    </Link>
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
