import type { AdminProductUpsertPayload } from "@/types/product";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import { buildAdminProductUpsertPayload } from "@/modules/admin/pages/product/productFormPayload";

type CreateProductFn = (payload: AdminProductUpsertPayload) => Promise<unknown>;
type UpdateProductFn = (id: string, payload: AdminProductUpsertPayload) => Promise<unknown>;
type DeleteProductFn = (id: string) => Promise<unknown>;

type SubmitAdminProductFormInput = {
  form: ProductFormPayloadSlice;
  publish?: boolean;
  isNew: boolean;
  productId?: string;
  createProduct: CreateProductFn;
  updateProduct: UpdateProductFn;
};

export type SubmitAdminProductFormResult = "created" | "updated";

export async function submitAdminProductForm({
  form,
  publish = false,
  isNew,
  productId,
  createProduct,
  updateProduct,
}: SubmitAdminProductFormInput): Promise<SubmitAdminProductFormResult> {
  const payload = buildAdminProductUpsertPayload(form, { publish, includeStock: isNew });

  if (isNew) {
    await createProduct(payload);
    return "created";
  }

  if (!productId) throw new Error("Missing product id");
  await updateProduct(productId, payload);
  return "updated";
}

export async function deleteAdminProduct({
  productId,
  deleteProduct,
}: {
  productId?: string;
  deleteProduct: DeleteProductFn;
}): Promise<void> {
  if (!productId) throw new Error("Missing product id");
  await deleteProduct(productId);
}
