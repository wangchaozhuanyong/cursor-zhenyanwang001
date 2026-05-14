import { get, post, put, del } from "@/api/request";
import type { Category } from "@/types/category";

export function getCategories() {
  return get<Category[]>("/admin/categories");
}

export function createCategory(data: Partial<Category> & Pick<Category, "name">) {
  return post<Category>("/admin/categories", data);
}

export function updateCategory(id: string, data: Partial<Category>) {
  return put<Category>(`/admin/categories/${id}`, data);
}

export function updateCategorySort(items: Array<{ id: string; parent_id?: string | null; sort_order: number }>) {
  return put<void>("/admin/categories/sort", { items });
}

export function deleteCategory(id: string) {
  return del<void>(`/admin/categories/${id}`);
}

