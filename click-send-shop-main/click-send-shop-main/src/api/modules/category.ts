import { get } from "../request";
import type { Category } from "@/types/category";

export function getCategories() {
  return get<Category[]>("/categories");
}

export function getCategoryById(id: string) {
  return get<Category>(`/categories/${id}`);
}
