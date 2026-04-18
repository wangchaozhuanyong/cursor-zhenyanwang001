import * as productApi from "@/api/admin/product";
import type { Product, ProductListParams, ProductTag } from "@/types/product";
import type { PaginatedData } from "@/types/common";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";
import { getAdminAccessToken } from "@/utils/token";
import { unwrapList, unwrapPaginated } from "@/services/responseNormalize";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function fetchProducts(params?: ProductListParams): Promise<PaginatedData<Product>> {
  const res = await productApi.getProducts(params);
  return unwrapPaginated<Product>(res.data);
}

export async function fetchProductById(id: string) {
  const res = await productApi.getProductById(id);
  return res.data;
}

export async function createProduct(data: Omit<Product, "id">) {
  const res = await productApi.createProduct(data);
  return res.data;
}

export async function updateProduct(id: string, data: Partial<Product>) {
  const res = await productApi.updateProduct(id, data);
  return res.data;
}

export async function deleteProduct(id: string) {
  await productApi.deleteProduct(id);
}

export async function fetchProductTags(): Promise<ProductTag[]> {
  const res = await productApi.getProductTags();
  return unwrapList<ProductTag>(res.data);
}

export async function createProductTag(data: Pick<ProductTag, "name"> & Partial<Pick<ProductTag, "color" | "sort_order">>) {
  const res = await productApi.createProductTag(data as Omit<ProductTag, "id">);
  return res.data;
}

export async function deleteProductTag(id: string) {
  await productApi.deleteProductTag(id);
}

export async function exportProductsCsv(params?: { keyword?: string; category_id?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.keyword) qs.set("keyword", params.keyword);
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.status) qs.set("status", params.status);
  const q = qs.toString();
  await downloadAdminCsv(`/admin/products/export${q ? `?${q}` : ""}`, "products.csv");
}

export async function importProductsCsv(file: File): Promise<{ created: number; updated: number }> {
  const token = getAdminAccessToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/admin/products/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const body = (await res.json()) as { code: number; message?: string; data?: { created: number; updated: number } };
  if (!res.ok || body.code !== 0) throw new Error(body.message || "导入失败");
  return body.data ?? { created: 0, updated: 0 };
}
