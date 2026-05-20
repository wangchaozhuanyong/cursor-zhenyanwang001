import type { ReactNode } from "react";
import { ArrowLeft, Share2, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StoreSearchField from "@/components/store/StoreSearchField";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { cn } from "@/lib/utils";

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
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/60 text-white shadow-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] backdrop-blur-md transition active:scale-95 touch-target"
    >
      {children}
    </button>
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
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] transition active:scale-95 touch-target"
    >
      {children}
    </button>
  );
}

/** 商品详情固定顶栏：顶部沉浸透明，滚过主图区后吸顶实底并展示搜索 */
export default function ProductDetailStickyHeader({
  solid,
  onBack,
  onShare,
  onCart,
}: ProductDetailStickyHeaderProps) {
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);

  const BackBtn = solid ? SolidIconButton : ImmersiveIconButton;
  const ActionBtn = solid ? SolidIconButton : ImmersiveIconButton;

  return (
    <header
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-header pt-[env(safe-area-inset-top,0px)]",
        "transition-[background-color,box-shadow,border-color] duration-200 ease-out",
        solid
          ? cn("border-b shadow-[var(--theme-shadow)] backdrop-blur-xl", surfaceClass)
          : "border-b border-transparent bg-transparent",
      )}
      role="banner"
      aria-label="商品详情导航"
    >
      <div className="pointer-events-auto mx-auto flex h-[var(--store-tab-header-height)] w-full max-w-screen-xl items-center gap-2 px-3 md:gap-3 md:px-4">
        <BackBtn label="返回" onClick={onBack}>
          <ArrowLeft size={20} strokeWidth={2.25} />
        </BackBtn>

        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden transition-[opacity,max-width] duration-200 ease-out",
            solid ? "max-w-[999px] opacity-100" : "pointer-events-none max-w-0 opacity-0",
          )}
        >
          <StoreSearchField
            mode="navigate"
            placeholder="搜索商品或品牌..."
            onNavigate={() => navigate("/search")}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
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
