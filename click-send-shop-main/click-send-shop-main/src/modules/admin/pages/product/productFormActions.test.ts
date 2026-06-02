import { describe, expect, it, vi } from "vitest";
import { createEmptyProductForm } from "@/modules/admin/pages/product/productFormInitialState";
import { deleteAdminProduct, submitAdminProductForm } from "@/modules/admin/pages/product/productFormActions";

function createValidForm() {
  const form = createEmptyProductForm();
  return {
    ...form,
    name: "Product",
    price: "12.50",
    stock: "5",
    variants: [
      {
        ...form.variants[0],
        price: "12.50",
        stock: "5",
      },
    ],
  };
}

describe("productFormActions", () => {
  it("submits a create request with create stock included", async () => {
    const createProduct = vi.fn().mockResolvedValue({});
    const updateProduct = vi.fn().mockResolvedValue({});

    const result = await submitAdminProductForm({
      form: createValidForm(),
      isNew: true,
      createProduct,
      updateProduct,
    });

    expect(result).toBe("created");
    expect(updateProduct).not.toHaveBeenCalled();
    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({
      name: "Product",
      price: 12.5,
      stock: 5,
    }));
  });

  it("submits an update request and can force publish status", async () => {
    const createProduct = vi.fn().mockResolvedValue({});
    const updateProduct = vi.fn().mockResolvedValue({});

    const result = await submitAdminProductForm({
      form: { ...createValidForm(), status: "draft" },
      isNew: false,
      productId: "product-1",
      publish: true,
      createProduct,
      updateProduct,
    });

    expect(result).toBe("updated");
    expect(createProduct).not.toHaveBeenCalled();
    expect(updateProduct).toHaveBeenCalledWith("product-1", expect.objectContaining({
      name: "Product",
      status: "active",
    }));
    expect(updateProduct.mock.calls[0][1]).not.toHaveProperty("stock");
  });

  it("fails update and delete operations when product id is missing", async () => {
    await expect(submitAdminProductForm({
      form: createValidForm(),
      isNew: false,
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
    })).rejects.toThrow("Missing product id");

    await expect(deleteAdminProduct({ deleteProduct: vi.fn() })).rejects.toThrow("Missing product id");
  });

  it("deletes an existing product", async () => {
    const deleteProduct = vi.fn().mockResolvedValue(undefined);

    await deleteAdminProduct({ productId: "product-1", deleteProduct });

    expect(deleteProduct).toHaveBeenCalledWith("product-1");
  });
});
