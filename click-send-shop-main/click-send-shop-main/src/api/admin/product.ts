import { get, post, put, patch, del } from "@/api/request";
import type {
  AdminProductUpsertPayload,
  Product,
  ProductLifecycleStatus,
  ProductListParams,
  ProductTag,
} from "@/types/product";
import type { PaginatedData } from "@/types/common";

export function getProducts(params?: ProductListParams) {
  return get<PaginatedData<Product>>("/admin/products", params as unknown as Record<string, string>);
}

export function getProductById(id: string) {
  return get<Product>(`/admin/products/${id}`);
}

export function createProduct(data: AdminProductUpsertPayload) {
  return post<Product>("/admin/products", data);
}

export function updateProduct(id: string, data: Partial<AdminProductUpsertPayload>) {
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

export function updateProductTag(id: string, data: Partial<Omit<ProductTag, "id">>) {
  return put<ProductTag>(`/admin/product-tags/${id}`, data);
}

export function deleteProductTag(id: string) {
  return del<void>(`/admin/product-tags/${id}`);
}

export function updateProductTags(id: string, tagIds: string[]) {
  return put<{ product_id: string; tags: ProductTag[] }>(`/admin/products/${id}/tags`, { tag_ids: tagIds });
}

