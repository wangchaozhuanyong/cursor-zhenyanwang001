import PageHeader from "@/components/PageHeader";
import {
  ProgressiveImage,
  SquishButton,
  SwipeDrawer,
} from "@/modules/micro-interactions";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import {
  LOCAL_ONLY_CART_PRODUCT_PREFIX,
  setDemoCartAddSync,
  useCartStore,
} from "@/stores/useCartStore";
import { useEffect, useMemo, useState } from "react";

/** High-res showcase image (CDN). */
const HERO_IMG =
  "https://images.unsplash.com/photo-1520975916090-af6c6b92d4c4?auto=format&fit=crop&w=960&q=80";

const SKU_OPTIONS = [
  { key: "onyx/256", label: "曜石黑 · 256GB", priceDelta: 0 },
  { key: "pearl/512", label: "珍珠白 · 512GB", priceDelta: 800 },
];

function buildDemoProduct(option: {
  key: string;
  label: string;
  priceDelta: number;
}): Product {
  const id = `${LOCAL_ONLY_CART_PRODUCT_PREFIX}${option.key}`;
  const price = 1899 + option.priceDelta;

  return {
    id,
    name: `钛系列 · AirPods Pro 限定套装（${option.label}）`,
    cover_image: HERO_IMG,
    images: [HERO_IMG],
    price,
    points: 0,
    category_id: "demo-micro-interactions",
    stock: 999,
    status: "active",
    sort_order: 0,
    description:
      "本页为微观交互 Demo；此行商品 ID 以 demo-micro-interactions: 前缀标识，不参与后端购物车同步（登录态可走演示用虚假同步钩子）。",
    is_recommended: false,
    is_new: false,
    is_hot: false,
  };
}

export default function MicroInteractionsDemoPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [skuKey, setSkuKey] = useState<string>(SKU_OPTIONS[0].key);
  const [simulateFailure, setSimulateFailure] = useState(false);

  const cartItems = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems());
  const addToCart = useCartStore((s) => s.addToCart);
  const removeItem = useCartStore((s) => s.removeItem);

  const demoLines = useMemo(
    () =>
      cartItems.filter((i) =>
        i.product.id.startsWith(LOCAL_ONLY_CART_PRODUCT_PREFIX),
      ),
    [cartItems],
  );

  useEffect(() => {
    setDemoCartAddSync(async () => {
      if (!simulateFailure) return;
      await new Promise((r) => setTimeout(r, 520));
      throw new Error("demo cart sync");
    });

    return () => setDemoCartAddSync(null);
  }, [simulateFailure]);

  const selectedSku =
    SKU_OPTIONS.find((s) => s.key === skuKey) ?? SKU_OPTIONS[0];

  const demoProduct: Product = useMemo(
    () => buildDemoProduct(selectedSku),
    [selectedSku],
  );

  const demoNameShort = "钛系列 · AirPods Pro 限定套装";

  function clearDemoLines() {
    for (const row of [...demoLines]) {
      removeItem(row.product.id);
    }
  }

  return (
    <div className="min-h-dvh pb-24 pt-safe">
      <PageHeader title="微观交互 Demo" />

      <p className="mx-auto mb-3 max-w-md px-6 text-xs text-[var(--theme-text-muted)]">
        SquishButton · SwipeDrawer · ProgressiveImage ·{" "}
        <span className="font-medium">
          单一全局购物车 <code className="text-[11px]">useCartStore</code>
        </span>
      </p>

      <div className="mx-auto w-full max-w-md space-y-4 px-4">
        <div
          className={cn(
            "overflow-hidden theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow",
          )}
        >
          <ProgressiveImage
            className={cn("aspect-[4/3] w-full")}
            src={HERO_IMG}
            blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
            alt="耳机产品图"
          />

          <div className="space-y-3 p-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--theme-text-on-surface)]">
                {demoNameShort}
              </h2>
              <p className="mt-1 text-sm text-[var(--theme-text-muted-on-surface)]">
                SKU：{selectedSku.label}
              </p>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="text-xl font-semibold text-[var(--theme-price)]">
                ¥{demoProduct.price.toLocaleString("zh-CN")}
              </div>
              <SquishButton
                type="button"
                className="shrink-0 px-6"
                onClick={() => setDrawerOpen(true)}
              >
                选择配置
              </SquishButton>
            </div>
          </div>
        </div>
      </div>

      <SwipeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="选择 SKU · 购物车（全局 Store）"
      >
        <div className="space-y-4 px-5 pt-2">
          <p className="text-sm font-medium text-[var(--theme-text-muted-on-surface)]">
            SKU
          </p>
          <div className="grid grid-cols-1 gap-2">
            {SKU_OPTIONS.map((opt) => {
              const selected = skuKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSkuKey(opt.key)}
                  className={cn(
                    "theme-rounded flex items-center justify-between border px-4 py-3 text-left text-sm transition",
                    selected
                      ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                      : "border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text-on-surface)] hover:border-[var(--theme-primary)]/40",
                  )}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs opacity-80">
                    +¥{opt.priceDelta.toLocaleString("zh-CN")}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--theme-text-muted-on-surface)]">
            <input
              type="checkbox"
              className="accent-[var(--theme-primary)]"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
            />
            模拟下一次「沙箱同步」失败（登录态触发回滚；未登录仅占位乐观更新）
          </label>

          <div className="flex gap-3 pt-1">
            <SquishButton
              type="button"
              className="flex-1"
              onClick={() => addToCart(demoProduct)}
            >
              {`加入购物车 (${totalItems} · 全局)`}
            </SquishButton>
            <SquishButton
              type="button"
              className="flex-1 bg-[var(--theme-secondary)] text-[var(--theme-secondary-foreground)]"
              onClick={() => {
                addToCart(demoProduct);
                setDrawerOpen(false);
              }}
            >
              立即购买
            </SquishButton>
          </div>

          <div className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-[var(--theme-text-muted-on-surface)]">
              <span>本页演示行（全局购物车子集）</span>
              <button
                type="button"
                className="text-[var(--theme-primary)] underline-offset-2 hover:underline"
                onClick={() => clearDemoLines()}
                disabled={demoLines.length === 0}
              >
                移除演示 SKU
              </button>
            </div>
            {demoLines.length === 0 ? (
              <p className="text-sm text-[var(--theme-text-subtle)]">
                暂无演示行；购物车其它商品仍可前往 /cart 查看。
              </p>
            ) : (
              <ul className="space-y-3">
                {demoLines.map(({ product, qty }) => (
                  <li
                    key={product.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--theme-text-muted-on-surface)]">
                        ID：{product.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[var(--theme-price)] tabular-nums">
                        ×{qty}
                      </div>
                      <div className="text-xs tabular-nums text-[var(--theme-text-muted-on-surface)]">
                        ¥{(product.price * qty).toLocaleString("zh-CN")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SwipeDrawer>
    </div>
  );
}
