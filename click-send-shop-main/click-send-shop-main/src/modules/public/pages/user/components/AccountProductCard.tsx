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
};

export default function AccountProductCard({
  product,
  index = 0,
  actions,
  className,
}: AccountProductCardProps) {
  const { localizedPath } = usePublicLocale();
  const vm = buildProductCardV2Model(product);
  const href = localizedPath(vm.href);
  const loading = index < 3 ? "eager" : "lazy";

  return (
    <article
      className={cn(
        "group rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-[var(--theme-shadow)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_42px_color-mix(in_srgb,var(--theme-primary)_10%,transparent)]",
        className,
      )}
    >
      <div className="grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <Link
          to={href}
          className="relative block overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-bg))]"
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
          {vm.badges.length ? (
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

        <div className="flex min-w-0 flex-col">
          <Link to={href} className="min-w-0" aria-label={`查看 ${vm.name}`}>
            <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-[var(--theme-text)]">
              {vm.name}
            </h3>
          </Link>
          <DecisionMetaRow items={vm.decisionTexts} />
          <ActivityProgressBar percent={vm.activityProgressPercent} text={vm.activityProgressText} />
          <div className="mt-auto pt-2">
            <StorefrontPrice amount={vm.priceText} originalAmount={vm.originalPriceText} />
          </div>
        </div>
      </div>

      {actions ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[color-mix(in_srgb,var(--theme-border)_72%,transparent)] pt-3">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

export function AccountProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-[var(--theme-shadow)]">
      <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <div className="aspect-square animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--theme-border)_50%,transparent)]" />
        <div className="min-w-0 space-y-2">
          <div className="h-4 w-5/6 animate-pulse rounded bg-[color-mix(in_srgb,var(--theme-border)_50%,transparent)]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-[color-mix(in_srgb,var(--theme-border)_40%,transparent)]" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-[color-mix(in_srgb,var(--theme-border)_35%,transparent)]" />
          <div className="h-5 w-24 animate-pulse rounded bg-[color-mix(in_srgb,var(--theme-price)_14%,transparent)]" />
        </div>
      </div>
    </div>
  );
}

function DecisionMetaRow({ items }: { items: string[] }) {
  if (!items.length) return <div className="mt-1.5 min-h-[1rem]" />;
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

function ActivityProgressBar({ percent, text }: { percent?: number; text?: string }) {
  if (!percent && !text) return <div className="mt-2 min-h-[1.1rem]" />;
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

function SoldOutMask() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/35 text-xs font-bold text-white">
      已售罄
    </div>
  );
}
