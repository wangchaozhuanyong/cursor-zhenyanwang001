import { ArrowRight, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Product } from "@/types/product";
import ProductCardV2 from "../product/ProductCardV2";
import ProductCardV2Skeleton from "../product/ProductCardV2Skeleton";
import StorefrontTitleRow from "../components/StorefrontTitleRow";

type HomeProductSectionV2Props = {
  title: string;
  subtitle?: string;
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
  actionLabel?: string;
  actionPath?: string;
  emptyText?: string;
  emptyActionLabel?: string;
  showPrice?: boolean;
  onNavigate: (path: string) => void;
};

export default function HomeProductSectionV2({
  title,
  subtitle,
  products,
  loading = false,
  skeletonCount = 4,
  actionLabel = "更多",
  actionPath = "/categories",
  emptyText = "暂无商品",
  emptyActionLabel = "去全部分类",
  showPrice = true,
  onNavigate,
}: HomeProductSectionV2Props) {
  const availableCount = products.filter((product) => Number(product.default_variant?.stock ?? product.stock ?? 0) > 0).length;
  const activityCount = products.filter((product) => Boolean(product.active_activity || product.activity_promo_label)).length;
  const shelfStats = [
    {
      key: "count",
      label: "本栏商品",
      value: loading && products.length === 0 ? "加载中" : `${products.length}`,
      icon: PackageCheck,
    },
    {
      key: "activity",
      label: "活动命中",
      value: activityCount > 0 ? `${activityCount}` : "以后端为准",
      icon: Sparkles,
    },
    {
      key: "stock",
      label: "可售库存",
      value: availableCount > 0 ? `${availableCount}` : "结算复核",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="store-home-product-shelf store-home-v12-shelf min-w-0">
      <div className="store-home-v12-shelf__head">
        <StorefrontTitleRow
          title={title}
          subtitle={subtitle}
          action={(
            <UnifiedButton
              type="button"
              onClick={() => onNavigate(actionPath)}
              className="store-home-v12-shelf__action"
            >
              {actionLabel}
              <ArrowRight size={14} />
            </UnifiedButton>
          )}
        />
        <div className="store-home-v12-shelf__stats" aria-label={`${title} 商品状态`}>
          {shelfStats.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.key}>
                <Icon size={14} aria-hidden />
                <b>{item.value}</b>
                <small>{item.label}</small>
              </span>
            );
          })}
        </div>
      </div>
      <div className="store-home-product-shelf__grid grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: skeletonCount }).map((_, index) => (
              <ProductCardV2Skeleton key={`home-v2-skeleton-${title}-${index}`} />
            ))
          : products.map((product, index) => (
              <ProductCardV2
                key={product.id}
                product={product}
                index={index}
                showPrice={showPrice}
                className="[content-visibility:auto] [contain-intrinsic-size:280px]"
              />
            ))}
      </div>
      {!loading && products.length === 0 ? (
        <div className="store-home-v12-shelf__empty rounded-[1.125rem] border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--theme-text-muted)]">{emptyText}</p>
          <UnifiedButton
            type="button"
            onClick={() => onNavigate(actionPath)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-3 py-2 text-xs font-black text-[var(--theme-primary)]"
          >
            {emptyActionLabel}
            <ArrowRight size={14} />
          </UnifiedButton>
        </div>
      ) : null}
    </section>
  );
}
