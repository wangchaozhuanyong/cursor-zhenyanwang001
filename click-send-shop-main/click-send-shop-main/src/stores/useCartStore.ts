import { create } from "zustand";
import { persist } from "zustand/middleware";

import { toast } from "@/components/ui/sonner";
import { isLoggedIn } from "@/utils/token";
import type { Product } from "@/types/product";
import type { CartItem } from "@/types/cart";
import * as cartService from "@/services/cartService";

/** 沙箱商品 ID 前缀：仅参与本地乐观 UI，默认不走 cartService（Demo / 实验用） */
export const LOCAL_ONLY_CART_PRODUCT_PREFIX = "demo-micro-interactions:" as const;

function isLocalOnlyCartProductId(productId: string) {
  return productId.startsWith(LOCAL_ONLY_CART_PRODUCT_PREFIX);
}

/**
 * 登录态下演示用：可对「本地沙箱 SKU」注入异步同步（延时 / 模拟失败）。
 * 传 `null` 清除。真实商品不受影响。
 */
type DemoLoggedInCartAddSyncFn = (
  productId: string,
  qty: number,
) => Promise<void>;

let demoLoggedInCartAddSync: DemoLoggedInCartAddSyncFn | null = null;

export function setDemoCartAddSync(handler: DemoLoggedInCartAddSyncFn | null) {
  demoLoggedInCartAddSync = handler;
}

function mergeCartWithLocalOnlyPreserve(
  serverItems: CartItem[],
  preservedLocalOnly: CartItem[],
): CartItem[] {
  const ids = new Set(serverItems.map((i) => i.product.id));
  const extra = preservedLocalOnly.filter((i) => !ids.has(i.product.id));
  return [...serverItems, ...extra];
}

function mergeSelection(
  prev: Record<string, boolean>,
  items: CartItem[],
): Record<string, boolean> {
  const next = { ...prev };
  const ids = new Set(items.map((i) => i.product.id));
  for (const k of Object.keys(next)) {
    if (!ids.has(k)) delete next[k];
  }
  for (const i of items) {
    if (next[i.product.id] === undefined) next[i.product.id] = true;
  }
  return next;
}

interface CartState {
  items: CartItem[];
  buyNowItem: CartItem | null;
  /** 商品行是否参与结算：缺省为 true */
  selection: Record<string, boolean>;
  loading: boolean;
  error: string | null;

  loadCart: () => Promise<void>;
  /** 登录/注册后：把登录前本地有、服务端尚无的行写入服务端，再拉齐 */
  mergeLocalThenSync: (localBeforeAuth: CartItem[]) => Promise<void>;
  addItem: (product: Product, qty?: number) => void;
  /** 与 `addItem` 等价，便于业务层统一「加入购物车」语义 */
  addToCart: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  /** 下单成功后仅移除已结算行（与后端删除 cart_items 一致） */
  removeOrderedItems: (productIds: string[]) => void;
  setBuyNow: (product: Product, qty: number) => void;
  clearBuyNow: () => void;

  isSelected: (productId: string) => boolean;
  toggleSelect: (productId: string) => void;
  setSelectAll: (value: boolean) => void;
  getSelectedItems: () => CartItem[];

  totalAmount: () => number;
  totalPoints: () => number;
  totalItems: () => number;
  totalAmountSelected: () => number;
  totalPointsSelected: () => number;
  totalItemsSelected: () => number;

  clearError: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      buyNowItem: null,
      selection: {},
      loading: false,
      error: null,

      loadCart: async () => {
        if (!isLoggedIn()) return;
        set({ loading: true, error: null });
        try {
          const items = await cartService.fetchCart();
          set((s) => {
            const preserved = s.items.filter((i) =>
              isLocalOnlyCartProductId(i.product.id),
            );
            const merged = mergeCartWithLocalOnlyPreserve(items, preserved);
            return {
              items: merged,
              selection: mergeSelection(s.selection, merged),
              loading: false,
            };
          });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "加载购物车失败",
          });
        }
      },

      mergeLocalThenSync: async (localBeforeAuth) => {
        if (!isLoggedIn()) return;
        try {
          await get().loadCart();
          const serverIds = new Set(get().items.map((i) => i.product.id));
          for (const { product, qty } of localBeforeAuth) {
            if (isLocalOnlyCartProductId(product.id)) continue;
            if (!serverIds.has(product.id)) {
              try {
                await cartService.addToCart(product.id, qty);
              } catch {
                /* 单个下架或异常则跳过 */
              }
            }
          }
          await get().loadCart();
        } catch {
          await get().loadCart();
        }
      },

      addItem: (product, qty = 1) => {
        const beforeSnapshot = {
          items: get().items,
          selection: get().selection,
        };
        set((state) => {
          const existing = state.items.find(
            (i) => i.product.id === product.id,
          );
          let newItems: CartItem[];
          if (existing) {
            newItems = state.items.map((i) =>
              i.product.id === product.id
                ? { ...i, qty: i.qty + qty }
                : i,
            );
          } else {
            newItems = [...state.items, { product, qty }];
          }
          const sel = { ...state.selection, [product.id]: true };
          return { items: newItems, selection: mergeSelection(sel, newItems) };
        });
        if (isLoggedIn()) {
          if (isLocalOnlyCartProductId(product.id)) {
            const run = demoLoggedInCartAddSync ?? (async () => {});
            run(product.id, qty).catch(() => {
              set(beforeSnapshot);
              toast.error("网络波动，请重试");
            });
          } else {
            cartService.addToCart(product.id, qty).catch(() => {
              set(beforeSnapshot);
              toast.error("网络波动，请重试");
            });
          }
        }
      },

      addToCart: (product, qty = 1) => {
        get().addItem(product, qty);
      },

      removeItem: (productId) => {
        const beforeSnapshot = {
          items: get().items,
          selection: get().selection,
        };
        set((state) => {
          const items = state.items.filter((i) => i.product.id !== productId);
          const { [productId]: _, ...rest } = state.selection;
          return { items, selection: mergeSelection(rest, items) };
        });
        if (isLoggedIn() && !isLocalOnlyCartProductId(productId)) {
          cartService.removeFromCart(productId).catch(() => {
            set(beforeSnapshot);
            toast.error("网络波动，请重试");
          });
        }
      },

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        const beforeSnapshot = {
          items: get().items,
          selection: get().selection,
        };
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, qty } : i,
          ),
        }));
        if (isLoggedIn() && !isLocalOnlyCartProductId(productId)) {
          cartService.updateCartItemQty(productId, qty).catch(() => {
            set(beforeSnapshot);
            toast.error("网络波动，请重试");
          });
        }
      },

      clearCart: () => {
        const prev = get().items;
        const prevSel = get().selection;
        set({ items: [], selection: {} });
        if (isLoggedIn()) {
          cartService.clearCart().catch(() => {
            set({ items: prev, selection: prevSel });
            toast.error("网络波动，请重试");
          });
        }
      },

      removeOrderedItems: (productIds) => {
        const setIds = new Set(productIds);
        set((state) => {
          const items = state.items.filter((i) => !setIds.has(i.product.id));
          const sel = { ...state.selection };
          for (const id of productIds) delete sel[id];
          return { items, selection: mergeSelection(sel, items) };
        });
        if (isLoggedIn()) {
          const serverIds = productIds.filter(
            (id) => !isLocalOnlyCartProductId(id),
          );
          if (serverIds.length) {
            Promise.all(serverIds.map((id) => cartService.removeFromCart(id))).catch(() => {
              get().loadCart();
            });
          }
        }
      },

      setBuyNow: (product, qty) => set({ buyNowItem: { product, qty } }),
      clearBuyNow: () => set({ buyNowItem: null }),

      isSelected: (productId) => get().selection[productId] !== false,

      toggleSelect: (productId) =>
        set((s) => {
          const on = s.selection[productId] !== false;
          return {
            selection: { ...s.selection, [productId]: !on },
          };
        }),

      setSelectAll: (value) =>
        set((s) => {
          const next: Record<string, boolean> = {};
          for (const i of s.items) next[i.product.id] = value;
          return { selection: next };
        }),

      getSelectedItems: () => {
        const { items, selection } = get();
        return items.filter((i) => selection[i.product.id] !== false);
      },

      totalAmount: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.qty, 0),
      totalPoints: () =>
        get().items.reduce((sum, i) => sum + i.product.points * i.qty, 0),
      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.qty, 0),

      totalAmountSelected: () =>
        get()
          .getSelectedItems()
          .reduce((sum, i) => sum + i.product.price * i.qty, 0),
      totalPointsSelected: () =>
        get()
          .getSelectedItems()
          .reduce((sum, i) => sum + i.product.points * i.qty, 0),
      totalItemsSelected: () =>
        get().getSelectedItems().reduce((sum, i) => sum + i.qty, 0),

      clearError: () => set({ error: null }),
    }),
    {
      name: "cart-storage",
      partialize: (s) => ({
        items: s.items,
        selection: s.selection,
      }),
    },
  ),
);
