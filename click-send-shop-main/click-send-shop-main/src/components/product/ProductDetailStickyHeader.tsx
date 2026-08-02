import type { ReactNode } from "react";
import { ArrowLeft, Share2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export type ProductDetailStickyHeaderProps = {
  /** 吸顶实底：主图滚出顶区后为 true；沉浸透明为 false */
  solid: boolean;
  onBack: () => void;
  onShare: () => void;
  onCart: () => void;
};

function ImmersiveIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <UnifiedButton
      type="button"
      onClick={onClick}
      aria-label={label}
      className="sf-next-product-header-action sf-next-product-header-action--immersive"
    >
      {children}
    </UnifiedButton>
  );
}

function SolidIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <UnifiedButton
      type="button"
      onClick={onClick}
      aria-label={label}
      className="sf-next-product-header-action sf-next-product-header-action--solid"
    >
      {children}
    </UnifiedButton>
  );
}

/** 商品详情固定顶栏：顶部沉浸透明，滚过主图区后切换为完整实底。 */
export default function ProductDetailStickyHeader({
  solid,
  onBack,
  onShare,
  onCart,
}: ProductDetailStickyHeaderProps) {
  const BackBtn = solid ? SolidIconButton : ImmersiveIconButton;
  const ActionBtn = solid ? SolidIconButton : ImmersiveIconButton;

  return (
    <header
      className={cn(
        "sf-next-product-sticky-header",
        solid && "is-solid",
      )}
      role="banner"
      aria-label="商品详情导航"
    >
      <div className="sf-next-product-sticky-header__inner">
        <BackBtn label="返回" onClick={onBack}>
          <ArrowLeft size={20} strokeWidth={2.25} />
        </BackBtn>

        <div className="sf-next-product-sticky-header__spacer" aria-hidden />

        <div className="sf-next-product-sticky-header__actions">
          <ActionBtn label="分享商品" onClick={onShare}>
            <Share2 size={18} strokeWidth={2.25} />
          </ActionBtn>
          <ActionBtn label="购物车" onClick={onCart}>
            <ShoppingCart size={18} strokeWidth={2.25} />
          </ActionBtn>
        </div>
      </div>
    </header>
  );
}
