import { Heart, Minus, Plus } from "lucide-react";
import StoreBadge from "@/components/ui/StoreBadge";
import StorePrice from "@/components/ui/StorePrice";
import type { ThemeConfig } from "@/types/theme";
import { previewProduct } from "./themePreviewData";
import { Tx } from "@/components/admin/AdminText";

function PreviewBtn({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const map = {
    primary: "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]",
    secondary: "bg-[var(--theme-secondary)] text-[var(--theme-secondary-foreground)]",
    danger: "bg-[var(--theme-danger)] text-[var(--theme-danger-foreground)]",
    ghost: "border border-[var(--theme-border)] text-[var(--theme-text)] bg-transparent",
  };
  return (
    <button
      type="button"
      className={`inline-flex h-9 flex-1 items-center justify-center rounded-[var(--theme-button-radius)] px-3 text-xs font-semibold ${map[variant]}`}
    >
      {children}
    </button>
  );
}

export default function ProductDetailPreview({ config }: { config: ThemeConfig }) {
  return (
    <div className="relative flex min-h-[420px] flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-16">
        <div
          className="aspect-square w-full overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]"
          style={{ aspectRatio: config.imageRatio.replace(" / ", "/") }}
        >
          <img
            src={previewProduct.cover_image as string}
            alt=""
            className="h-full w-full"
            style={{ objectFit: config.imageFit }}
          />
        </div>
        <div>
          <div className="mb-2 flex flex-wrap gap-1">
            <StoreBadge type="hot"><Tx>热销</Tx></StoreBadge>
            <StoreBadge type="sale"><Tx>包邮</Tx></StoreBadge>
          </div>
          <h3 className="text-sm font-semibold text-[var(--theme-text)]">{previewProduct.name}</h3>
          <div className="mt-2">
            <StorePrice price={previewProduct.price} originalPrice={previewProduct.original_price} />
          </div>
        </div>
        <div className="store-card space-y-2 p-3">
          <p className="text-xs font-medium text-[var(--theme-text)]"><Tx>规格</Tx></p>
          <div className="flex flex-wrap gap-2">
            {["标准装", "家庭装"].map((s, i) => (
              <button
                key={s}
                type="button"
                className={`rounded-[var(--theme-radius)] border px-3 py-1 text-xs ${
                  i === 0
                    ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
                    : "border-[var(--theme-border)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs font-medium text-[var(--theme-text)]"><Tx>数量</Tx></p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded border border-[var(--theme-border)]"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm">1</span>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded border border-[var(--theme-border)]"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-[var(--theme-border)] py-2 text-xs text-[var(--theme-text-muted)]"
        >
          <Heart size={14} /><Tx> 收藏
        </Tx></button>
      </div>
      <div
        className="sticky bottom-0 left-0 right-0 z-10 flex gap-2 border-t border-[var(--theme-border)] bg-[var(--theme-surface)] p-3"
        data-testid="product-detail-preview-action-bar"
      >
        <PreviewBtn variant="secondary"><Tx>加入购物车</Tx></PreviewBtn>
        <PreviewBtn variant="primary"><Tx>立即购买</Tx></PreviewBtn>
      </div>
    </div>
  );
}
