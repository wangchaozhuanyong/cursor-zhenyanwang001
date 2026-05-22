import * as productApi from "@/api/admin/product";
import type {
  AdminProductUpsertPayload,
  Product,
  ProductBatchStatusResult,
  ProductImportResult,
  ProductLifecycleStatus,
  ProductListParams,
  ProductStatus,
  ProductTag,
} from "@/types/product";

export type { AdminProductUpsertPayload };
import type { PaginatedData } from "@/types/common";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";
import { getAdminAccessToken } from "@/utils/token";
import { unwrapList, unwrapPaginated } from "@/services/responseNormalize";
import { getAdminCsrfToken } from "@/lib/adminCsrf";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function fetchProducts(params?: ProductListParams): Promise<PaginatedData<Product>> {
  const res = await productApi.getProducts(params);
  return unwrapPaginated<Product>(res.data);
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await productApi.getProductById(id);
  return res.data;
}

export async function createProduct(data: AdminProductUpsertPayload) {
  const res = await productApi.createProduct(data);
  return res.data;
}

export async function updateProduct(id: string, data: Partial<AdminProductUpsertPayload>) {
  const res = await productApi.updateProduct(id, data);
  return res.data;
}

export async function deleteProduct(id: string) {
  await productApi.deleteProduct(id);
}

export async function patchProductLifecycle(id: string, lifecycleStatus: ProductLifecycleStatus) {
  const res = await productApi.patchProductLifecycle(id, lifecycleStatus);
  return res.data;
}

export async function batchUpdateProductStatus(ids: string[], status: ProductStatus): Promise<ProductBatchStatusResult> {
  const res = await productApi.batchUpdateProductStatus(ids, status);
  return res.data;
}

export async function fetchProductTags(): Promise<ProductTag[]> {
  const res = await productApi.getProductTags();
  return unwrapList<ProductTag>(res.data);
}

export async function createProductTag(data: Pick<ProductTag, "name"> & Partial<Pick<ProductTag, "color" | "bg_color" | "text_color" | "sort_order" | "enabled">>) {
  const res = await productApi.createProductTag(data as Omit<ProductTag, "id">);
  return res.data;
}

export async function updateProductTag(id: string, data: Partial<Omit<ProductTag, "id">>) {
  const res = await productApi.updateProductTag(id, data);
  return res.data;
}

export async function deleteProductTag(id: string) {
  await productApi.deleteProductTag(id);
}

export async function updateProductTags(id: string, tagIds: string[]) {
  const res = await productApi.updateProductTags(id, tagIds);
  return res.data;
}

export async function exportProductsCsv(params?: ProductListParams) {
  const qs = new URLSearchParams();
  if (params?.keyword) qs.set("keyword", params.keyword);
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.status) qs.set("status", params.status);
  if (params?.stock_status) qs.set("stock_status", params.stock_status);
  if (params?.cost_status) qs.set("cost_status", params.cost_status);
  if (params?.ids?.length) qs.set("ids", params.ids.join(","));
  const q = qs.toString();
  await downloadAdminCsv(`/admin/products/export${q ? `?${q}` : ""}`, "products.csv");
}

export async function importProductsCsv(file: File): Promise<ProductImportResult> {
  const token = getAdminAccessToken();
  const csrfToken = await getAdminCsrfToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/admin/products/import`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    credentials: "include",
    body: fd,
  });
  const body = (await res.json()) as { code: number; message?: string; data?: ProductImportResult };
  if (!res.ok || body.code !== 0) throw new Error(body.message || "导入失败");
  return body.data ?? { created: 0, updated: 0, skipped: 0, errors: [] };
}
