import * as productApi from "@/api/modules/product";
import * as categoryApi from "@/api/modules/category";
import type { Product, ProductListParams } from "@/types/product";
import type { Category } from "@/types/category";
import type { PaginatedData } from "@/types/common";

export async function fetchProducts(
  params?: ProductListParams
): Promise<PaginatedData<Product>> {
  const res = await productApi.getProducts(params);
  return res.data;
}

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const res = await productApi.getProductById(id);
    return res.data;
  } catch {
    return null;
  }
}

export async function fetchRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const res = await productApi.getRelatedProducts(product.id, limit);
  return res.data;
}

export async function fetchHomeProducts(): Promise<{
  hot: Product[];
  new_arrivals: Product[];
  recommended: Product[];
}> {
  const res = await productApi.getHomeProducts();
  return res.data;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await categoryApi.getCategories();
  return res.data;
}
