import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  cartLineKey,
  getCartLinePrice,
  LOCAL_ONLY_CART_PRODUCT_PREFIX,
  useCartStore,
} from "@/stores/useCartStore";
import * as cartService from "@/services/cartService";
import type { Product } from "@/types/product";

const tokenMock = vi.hoisted(() => ({ loggedIn: false }));

vi.mock("@/utils/token", () => ({
  isLoggedIn: () => tokenMock.loggedIn,
}));

vi.mock("@/services/cartService", () => ({
  fetchCart: vi.fn(),
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
  updateCartItemQty: vi.fn(),
  pinCartItemToTop: vi.fn(),
  clearCart: vi.fn(),
}));

const sampleProduct = (id: string, price = 10, stock = 5): Product => ({
  id,
  name: `Product ${id}`,
  price,
  stock,
  points: 0,
  cover_image: "",
  images: [],
  category_id: "",
  lifecycle_status: 1,
  status: "active",
  sort_order: 0,
  description: "",
  is_recommended: false,
  is_new: false,
});

describe("useCartStore", () => {
  beforeEach(() => {
    tokenMock.loggedIn = false;
    vi.clearAllMocks();
    localStorage.clear();
    useCartStore.setState({
      items: [],
      buyNowItem: null,
      selection: {},
      loading: false,
      error: null,
    });
  });

  test("cartLineKey includes variant id when present", () => {
    expect(cartLineKey("p1", "v1")).toBe("p1::v1");
    expect(cartLineKey("p1")).toBe("p1");
  });

  test("getCartLinePrice multiplies unit price by qty", () => {
    const line = {
      product: sampleProduct("p1", 12),
      qty: 3,
      unit_price: 12,
    };
    expect(getCartLinePrice(line)).toBe(36);
  });

  test("addItem updates local cart when guest", async () => {
    const product = sampleProduct("guest-1");
    await useCartStore.getState().addItem(product, 2);
    const { items, selection } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
    expect(selection[cartLineKey(product.id)]).toBe(true);
  });

  test("rejects add when stock is zero", async () => {
    const product = sampleProduct("oos", 10, 0);
    await expect(useCartStore.getState().addItem(product, 1)).rejects.toThrow("库存不足");
  });

  test("skips server sync for local-only demo products", async () => {
    const product = sampleProduct(`${LOCAL_ONLY_CART_PRODUCT_PREFIX}demo`);
    await useCartStore.getState().addItem(product, 1);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  test("removeOrderedItems drops matching lines", () => {
    const p1 = sampleProduct("p1");
    const p2 = sampleProduct("p2");
    useCartStore.setState({
      items: [
        { product: p1, qty: 1 },
        { product: p2, qty: 2, variant_id: "v2" },
      ],
      selection: {
        [cartLineKey(p1.id)]: true,
        [cartLineKey(p2.id, "v2")]: true,
      },
    });
    useCartStore.getState().removeOrderedItems([
      { product_id: p2.id, variant_id: "v2" },
    ]);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe("p1");
  });

  test("pinItemToTop moves the selected cart line to the first position", async () => {
    const p1 = sampleProduct("p1");
    const p2 = sampleProduct("p2");
    const p3 = sampleProduct("p3");
    useCartStore.setState({
      items: [
        { product: p1, qty: 1 },
        { product: p2, qty: 1, variant_id: "v2" },
        { product: p3, qty: 1 },
      ],
      selection: {
        [cartLineKey(p1.id)]: true,
        [cartLineKey(p2.id, "v2")]: true,
        [cartLineKey(p3.id)]: true,
      },
    });

    await useCartStore.getState().pinItemToTop(p2.id, "v2");

    expect(useCartStore.getState().items.map((item) => item.product.id)).toEqual(["p2", "p1", "p3"]);
    expect(useCartStore.getState().selection[cartLineKey(p2.id, "v2")]).toBe(true);
  });

  test("keeps existing cart visible while refreshing server cart", async () => {
    tokenMock.loggedIn = true;
    const existing = sampleProduct("existing");
    const server = sampleProduct("server");
    let resolveFetch!: (items: Array<{ product: Product; qty: number }>) => void;
    vi.mocked(cartService.fetchCart).mockReturnValueOnce(new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    useCartStore.setState({
      items: [{ product: existing, qty: 1 }],
      selection: { [cartLineKey(existing.id)]: true },
      loading: false,
      error: null,
    });

    const pending = useCartStore.getState().loadCart();

    expect(useCartStore.getState().loading).toBe(false);
    expect(useCartStore.getState().items.map((item) => item.product.id)).toEqual(["existing"]);

    resolveFetch([{ product: server, qty: 2 }]);
    await pending;

    expect(useCartStore.getState().loading).toBe(false);
    expect(useCartStore.getState().items.map((item) => item.product.id)).toEqual(["server"]);
  });
});
