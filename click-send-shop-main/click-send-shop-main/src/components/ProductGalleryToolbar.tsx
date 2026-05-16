import type { ReactNode } from "react";
import { ArrowLeft, Share2, ShoppingCart } from "lucide-react";

interface ProductGalleryToolbarProps {
  onBack: () => void;
  onShare: () => void;
  onCart: () => void;
  cartCount?: number;
  extraRight?: ReactNode;
}

function OverlayIconButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-md transition active:scale-95 touch-target"
    >
      {children}
      {badge != null && badge > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--theme-primary)] px-1 text-[10px] font-bold text-[var(--theme-primary-foreground)]">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

/** 商品详情主图悬浮工具栏：返回 | 分享 + 购物车 */
export default function ProductGalleryToolbar({
  onBack,
  onShare,
  onCart,
  cartCount = 0,
  extraRight,
}: ProductGalleryToolbarProps) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pb-2 pt-[max(0.65rem,env(safe-area-inset-top,0px))]"
      role="toolbar"
      aria-label="商品图操作"
    >
      <div className="pointer-events-auto">
        <OverlayIconButton label="返回" onClick={onBack}>
          <ArrowLeft size={20} strokeWidth={2.25} />
        </OverlayIconButton>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        {extraRight}
        <OverlayIconButton label="分享商品" onClick={onShare}>
          <Share2 size={18} strokeWidth={2.25} />
        </OverlayIconButton>
        <OverlayIconButton label="购物车" onClick={onCart} badge={cartCount}>
          <ShoppingCart size={18} strokeWidth={2.25} />
        </OverlayIconButton>
      </div>
    </div>
  );
}
