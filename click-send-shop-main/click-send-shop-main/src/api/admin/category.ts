import { get, post, put, del } from "../request";
import type { Category } from "@/types/category";

export function getCategories() {
  return get<Category[]>("/admin/categories");
}

export function createCategory(data: Omit<Category, "id">) {
  return post<Category>("/admin/categories", data);
}

export function updateCategory(id: string, data: Partial<Category>) {
  return put<Category>(`/admin/categories/${id}`, data);
}

export function deleteCategory(id: string) {
  return del<void>(`/admin/categories/${id}`);
}
