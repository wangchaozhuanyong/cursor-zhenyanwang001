import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCoverImage from "@/components/ProductCoverImage";
import { appendThemePreviewParams } from "@/utils/themePreviewParams";
import StorefrontPrice from "../components/StorefrontPrice";
import { buildProductCardV2Model } from "./productCardV2Model";
import type { Product } from "@/types/product";

type CuratedLifeProductCardProps = {
  product: Product;
  index?: number;
  onClick?: () => void;
};

export default function CuratedLifeProductCard({
  product,
  index = 0,
  onClick,
}: CuratedLifeProductCardProps) {
  const vm = buildProductCardV2Model(product);

  return (
    <Link
      to={appendThemePreviewParams(vm.href)}
      onClick={onClick}
      className="curated-life-product-card"
      aria-label={`查看 ${vm.name}`}
    >
      <span className="curated-life-product-card__media">
        <ProductCoverImage
          url={vm.imageUrl}
          alt={vm.imageAlt}
          className="curated-life-product-card__image"
          imgClassName="curated-life-product-card__image-content"
          fit="contain"
          loading={index < 6 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : undefined}
          sizes="(max-width: 767px) 47vw, 240px"
        />
        {!vm.soldOut && vm.badges[0] ? (
          <span className="curated-life-product-card__badge">{vm.badges[0].label}</span>
        ) : null}
        {vm.soldOut ? <span className="curated-life-product-card__sold-out">已售罄</span> : null}
      </span>
      <span className="curated-life-product-card__body">
        <strong>{vm.name}</strong>
        <span className="curated-life-product-card__meta">
          {vm.decisionTexts[0] || "正品保障"}
        </span>
        <span className="curated-life-product-card__footer">
          <StorefrontPrice
            className="curated-life-product-card__price"
            amount={vm.priceText}
            originalAmount={vm.originalPriceText}
          />
          <span className="curated-life-product-card__add" aria-hidden>
            <Plus size={16} strokeWidth={2.2} />
          </span>
        </span>
      </span>
    </Link>
  );
}
