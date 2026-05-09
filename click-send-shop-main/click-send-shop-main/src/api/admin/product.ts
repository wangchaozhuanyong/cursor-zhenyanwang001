import { get, post, put, patch, del } from "../request";
import type { Product, ProductLifecycleStatus, ProductListParams, ProductTag } from "@/types/product";
import type { PaginatedData } from "@/types/common";

export function getProducts(params?: ProductListParams) {
  return get<PaginatedData<Product>>("/admin/products", params as Record<string, string>);
}

export function getProductById(id: string) {
  return get<Product>(`/admin/products/${id}`);
}

export function createProduct(data: Omit<Product, "id"> & { tag_ids?: string[] }) {
  return post<Product>("/admin/products", data);
}

export function updateProduct(
  id: string,
  data: Partial<Product> & { variants?: Product["variants"]; tag_ids?: string[] },
) {
  return put<Product>(`/admin/products/${id}`, data);
}

export function patchProductLifecycle(id: string, lifecycle_status: ProductLifecycleStatus) {
  return patch<Product>(`/admin/products/${id}/status`, { lifecycle_status });
}

export function deleteProduct(id: string) {
  return del<void>(`/admin/products/${id}`);
}

export function getProductTags() {
  return get<ProductTag[]>("/admin/product-tags");
}

export function createProductTag(data: Omit<ProductTag, "id">) {
  return post<ProductTag>("/admin/product-tags", data);
}

export function deleteProductTag(id: string) {
  return del<void>(`/admin/product-tags/${id}`);
}
