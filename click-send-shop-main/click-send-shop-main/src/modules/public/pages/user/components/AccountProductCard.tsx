import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import StorefrontBadge from "@/modules/storefront-v2/components/StorefrontBadge";
import StorefrontPrice from "@/modules/storefront-v2/components/StorefrontPrice";
import { buildProductCardV2Model } from "@/modules/storefront-v2/product/productCardV2Model";
import { cn } from "@/lib/utils";
import { usePublicLocale } from "@/i18n/publicLocale";
import type { Product } from "@/types/product";

type AccountProductCardProps = {
  product: Product;
  index?: number;
  actions?: ReactNode;
  className?: string;
  variant?: "default" | "history";
};

export default function AccountProductCard({
  product,
  index = 0,
  actions,
  className,
  variant = "default",
}: AccountProductCardProps) {
  const { localizedPath } = usePublicLocale();
  const vm = buildProductCardV2Model(product);
  const href = localizedPath(vm.href);
  const loading = index < 3 ? "eager" : "lazy";
  const isHistory = variant === "history";

  return (
    <article
      className={cn(
        "sf-next-account-product-card group",
        isHistory && "sf-next-account-product-card--history",
        className,
      )}
    >
      <div className="sf-next-account-product-card__row">
        <Link
          to={href}
          className="sf-next-account-product-card__media"
          style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
          aria-label={`查看 ${vm.name}`}
        >
          <ProductCoverImage
            url={vm.imageUrl}
            alt={vm.imageAlt}
            className="h-full w-full"
            imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading={loading}
            fetchPriority={index === 0 ? "high" : "low"}
            sizes="112px"
          />
          {!isHistory && vm.badges.length ? (
            <div className="absolute left-1.5 top-1.5 flex max-w-[calc(100%-12px)] flex-wrap gap-1">
              {vm.badges.slice(0, 2).map((badge) => (
                <StorefrontBadge key={badge.key} tone={badge.tone}>
                  {badge.label}
                </StorefrontBadge>
              ))}
            </div>
          ) : null}
          {vm.soldOut ? <SoldOutMask /> : null}
        </Link>

        <div className="sf-next-account-product-card__content">
          <Link to={href} className="sf-next-account-product-card__title-link min-w-0" aria-label={`查看 ${vm.name}`}>
            <h3 className={cn(
              "sf-next-account-product-card__title",
              isHistory ? "min-h-0" : "min-h-[2.5rem]",
            )}>
              {vm.name}
            </h3>
          </Link>
          {!isHistory ? <DecisionMetaRow items={vm.decisionTexts} /> : null}
          {!isHistory ? <ActivityProgressBar percent={vm.activityProgressPercent} text={vm.activityProgressText} /> : null}
          <div className="sf-next-account-product-card__price">
            <StorefrontPrice className="sf-next-account-product-card__price-line" amount={vm.priceText} originalAmount={vm.originalPriceText} />
          </div>
        </div>
      </div>

      {actions ? (
        <div className="sf-next-account-product-card__actions">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

function DecisionMetaRow({ items }: { items: string[] }) {
  if (!items.length) return <div className="sf-next-account-product-card__meta" />;
  return (
    <div className="sf-next-account-product-card__meta">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-1">
          {index > 0 ? <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--theme-border)]" aria-hidden /> : null}
          <span className="truncate">{item}</span>
        </span>
      ))}
    </div>
  );
}

function ActivityProgressBar({ percent, text }: { percent?: number; text?: string }) {
  if (!percent && !text) return <div className="sf-next-account-product-card__progress" />;
  const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent || 0))));
  return (
    <div className="sf-next-account-product-card__progress">
      <div className="sf-next-account-product-card__track">
        <div
          className="sf-next-account-product-card__track-value"
          style={{ width: `${safePercent}%` }}
        />
      </div>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

function SoldOutMask() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[var(--sf-overlay)] text-xs font-bold text-[var(--theme-primary-foreground)]">
      已售罄
    </div>
  );
}
