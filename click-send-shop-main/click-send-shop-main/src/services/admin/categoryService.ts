import * as categoryApi from "@/api/admin/category";
import type { Category } from "@/types/category";
import { unwrapList } from "@/services/responseNormalize";

export async function fetchCategories(): Promise<Category[]> {
  const res = await categoryApi.getCategories();
  return unwrapList<Category>(res.data);
}

export async function createCategory(data: Omit<Category, "id">) {
  const res = await categoryApi.createCategory(data);
  return res.data;
}

export async function updateCategory(id: string, data: Partial<Category>) {
  const res = await categoryApi.updateCategory(id, data);
  return res.data;
}

export async function deleteCategory(id: string) {
  await categoryApi.deleteCategory(id);
}
