import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError } from "@/types/common";
import { isLoggedIn, clearTokens } from "@/utils/token";
import { notifyAuthExpired } from "@/lib/authSessionBridge";
import type { Product, ProductVariant } from "@/types/product";
import type { CartItem } from "@/types/cart";
import * as cartService from "@/services/cartService";
import { normalizeCartItem, normalizeCartItems } from "@/utils/cartNormalize";

export const LOCAL_ONLY_CART_PRODUCT_PREFIX = "demo-micro-interactions:" as const;

let cartLoadInflight: Promise<void> | null = null;

function isLocalOnlyCartProductId(productId: string) {
  return productId.startsWith(LOCAL_ONLY_CART_PRODUCT_PREFIX);
}

export function cartLineKey(productId: string, variantId = "") {
  return variantId ? `${productId}::${variantId}` : productId;
}

function getCartItemKey(item: CartItem) {
  return cartLineKey(item.product.id, item.variant_id);
}

export function getCartLinePrice(item: CartItem) {
  const unitPrice = item.unit_price ?? item.product.price;
  return Number(unitPrice || 0) * Number(item.qty || 0);
}

interface CartState {
  items: CartItem[];
  buyNowItem: CartItem | null;
  selection: Record<string, boolean>;
  loading: boolean;
  error: string | null;

  loadCart: () => Promise<void>;
  mergeLocalThenSync: (localBeforeAuth: CartItem[]) => Promise<void>;
  addItem: (product: Product, qty?: number, variant?: ProductVariant | null) => Promise<void>;
  addToCart: (product: Product, qty?: number, variant?: ProductVariant | null) => Promise<void>;
  removeItem: (productId: string, variantId?: string) => Promise<void>;
  updateQty: (productId: string, qty: number, variantId?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  removeOrderedItems: (lines: Array<{ product_id: string; variant_id?: string }>) => void;
  setBuyNow: (product: Product, qty: number, variant?: ProductVariant | null) => void;
  clearBuyNow: () => void;

  isSelected: (productId: string, variantId?: string) => boolean;
  toggleSelect: (productId: string, variantId?: string) => void;
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

function mergeSelection(prev: Record<string, boolean>, items: CartItem[]) {
  const next = { ...prev };
  const ids = new Set(items.map(getCartItemKey));
  for (const k of Object.keys(next)) {
    if (!ids.has(k)) delete next[k];
  }
  for (const i of items) {
    const key = getCartItemKey(i);
    if (next[key] === undefined) next[key] = true;
  }
  return next;
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
        if (cartLoadInflight) return cartLoadInflight;

        cartLoadInflight = (async () => {
          set({ loading: true, error: null });
          try {
            const items = normalizeCartItems(await cartService.fetchCart());
            set((s) => ({ items, selection: mergeSelection(s.selection, items), loading: false }));
          } catch (e) {
            if (e instanceof ApiError && e.code === 401) {
              clearTokens();
              notifyAuthExpired();
              set({ loading: false, error: null });
              return;
            }
            set({ loading: false, error: e instanceof Error ? e.message : "加载购物车失败" });
          }
        })().finally(() => {
          cartLoadInflight = null;
        });

        return cartLoadInflight;
      },

      mergeLocalThenSync: async (localBeforeAuth) => {
        if (!isLoggedIn()) return;
        await get().loadCart();
        const serverIds = new Set(get().items.map(getCartItemKey));
        const toAdd = localBeforeAuth.filter((item) => !isLocalOnlyCartProductId(item.product.id) && item.qty > 0 && !serverIds.has(getCartItemKey(item)));
        if (toAdd.length) {
          await Promise.allSettled(toAdd.map(({ product, qty, variant_id, sku_code }) => cartService.addToCart(product.id, qty, variant_id, sku_code)));
        }
        await get().loadCart();
      },

      addItem: async (product, qty = 1, variant = null) => {
        const stock = Number(variant?.stock ?? product.stock ?? 0);
        if (!Number.isFinite(stock) || stock <= 0) {
          throw new Error("库存不足");
        }
        const lineKey = cartLineKey(product.id, variant?.id);
        const lineItem = normalizeCartItem({
          product,
          variant_id: variant?.id,
          sku_code: variant?.sku_code ?? undefined,
          variant_name: variant?.title,
          unit_price: variant?.price ?? product.price,
          qty,
        });
        const beforeSnapshot = { items: get().items, selection: get().selection };

        set((state) => {
          const existing = state.items.find((i) => getCartItemKey(i) === lineKey);
          const items = existing
            ? state.items.map((i) => (getCartItemKey(i) === lineKey ? { ...i, qty: i.qty + qty } : i))
            : [...state.items, lineItem];
          return { items, selection: mergeSelection({ ...state.selection, [lineKey]: true }, items) };
        });

        if (!isLoggedIn() || isLocalOnlyCartProductId(product.id)) return;

        try {
          await cartService.addToCart(product.id, qty, variant?.id, variant?.sku_code ?? "");
          await get().loadCart();
        } catch (e) {
          set(beforeSnapshot);
          throw (e instanceof Error ? e : new Error("加入购物车失败"));
        }
      },

      addToCart: async (product, qty = 1, variant = null) => {
        await get().addItem(product, qty, variant);
      },

      removeItem: async (productId, variantId = "") => {
        const lineKey = cartLineKey(productId, variantId);
        const beforeSnapshot = { items: get().items, selection: get().selection };
        set((state) => {
          const items = state.items.filter((i) => getCartItemKey(i) !== lineKey);
          const { [lineKey]: _, ...rest } = state.selection;
          return { items, selection: mergeSelection(rest, items) };
        });
        if (isLoggedIn() && !isLocalOnlyCartProductId(productId)) {
          try {
            await cartService.removeFromCart(productId, variantId);
            await get().loadCart();
          } catch (e) {
            set(beforeSnapshot);
            throw (e instanceof Error ? e : new Error("删除失败"));
          }
        }
      },

      updateQty: async (productId, qty, variantId = "") => {
        if (qty <= 0) {
          await get().removeItem(productId, variantId);
          return;
        }
        const lineKey = cartLineKey(productId, variantId);
        const beforeSnapshot = { items: get().items, selection: get().selection };
        set((state) => ({ items: state.items.map((i) => (getCartItemKey(i) === lineKey ? { ...i, qty } : i)) }));
        if (isLoggedIn() && !isLocalOnlyCartProductId(productId)) {
          try {
            await cartService.updateCartItemQty(productId, qty, variantId);
            await get().loadCart();
          } catch (e) {
            set(beforeSnapshot);
            throw (e instanceof Error ? e : new Error("更新失败"));
          }
        }
      },

      clearCart: async () => {
        const prev = get().items;
        const prevSel = get().selection;
        set({ items: [], selection: {} });
        if (isLoggedIn()) {
          try {
            await cartService.clearCart();
            await get().loadCart();
          } catch (e) {
            set({ items: prev, selection: prevSel });
            throw (e instanceof Error ? e : new Error("清空失败"));
          }
        }
      },

      removeOrderedItems: (lines) => {
        const lineKeySet = new Set(lines.map((line) => cartLineKey(line.product_id, line.variant_id)));
        set((state) => {
          const items = state.items.filter((i) => !lineKeySet.has(getCartItemKey(i)));
          const sel = { ...state.selection };
          for (const key of lineKeySet) delete sel[key];
          return { items, selection: mergeSelection(sel, items) };
        });
      },

      setBuyNow: (product, qty, variant = null) => set({ buyNowItem: { product, variant_id: variant?.id, sku_code: variant?.sku_code ?? undefined, variant_name: variant?.title, unit_price: variant?.price ?? product.price, qty } }),
      clearBuyNow: () => set({ buyNowItem: null }),

      isSelected: (productId, variantId = "") => get().selection[cartLineKey(productId, variantId)] !== false,
      toggleSelect: (productId, variantId = "") => set((s) => ({ selection: { ...s.selection, [cartLineKey(productId, variantId)]: s.selection[cartLineKey(productId, variantId)] === false } })),
      setSelectAll: (value) => set((s) => {
        const next: Record<string, boolean> = {};
        for (const i of s.items) next[getCartItemKey(i)] = value;
        return { selection: next };
      }),
      getSelectedItems: () => {
        const { items, selection } = get();
        return items.filter((i) => selection[getCartItemKey(i)] !== false);
      },

      totalAmount: () => get().items.reduce((sum, i) => sum + getCartLinePrice(i), 0),
      totalPoints: () => 0,
      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      totalAmountSelected: () => get().getSelectedItems().reduce((sum, i) => sum + getCartLinePrice(i), 0),
      totalPointsSelected: () => 0,
      totalItemsSelected: () => get().getSelectedItems().reduce((sum, i) => sum + i.qty, 0),

      clearError: () => set({ error: null }),
    }),
    {
      name: "cart-storage",
      partialize: (s) => ({ items: s.items, selection: s.selection, buyNowItem: s.buyNowItem }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.items = normalizeCartItems(state.items || []);
        if (state.buyNowItem) state.buyNowItem = normalizeCartItem(state.buyNowItem);
      },
    },
  ),
);
