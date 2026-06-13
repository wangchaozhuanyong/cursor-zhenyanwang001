import { Link } from "react-router-dom";
import ProductCoverImage from "@/components/ProductCoverImage";
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
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--theme-bg)]">
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
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--theme-bg)]">
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

      <div className="flex min-h-[104px] flex-1 flex-col p-2.5">
        <h3 className={t.text.productTitle}>{vm.name}</h3>
        {showPrice ? (
          <div className="mt-auto pt-2">
            <StorefrontPrice amount={vm.priceText} originalAmount={vm.originalPriceText} />
          </div>
        ) : null}
      </div>
    </Link>
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
