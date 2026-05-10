import type { Category } from "@/types/category";

export type FlatCategory = Category & { level: number };

export function flattenCategories(nodes: Category[], level = 0): FlatCategory[] {
  return nodes.flatMap((node) => [
    { ...node, level },
    ...flattenCategories(node.children || [], level + 1),
  ]);
}
