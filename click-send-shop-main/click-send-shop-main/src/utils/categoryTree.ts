import type { Category } from "@/types/category";

export type FlatCategory = Category & { level: number };

export function flattenCategories(nodes: Category[], level = 0): FlatCategory[] {
  return nodes.flatMap((node) => [
    { ...node, level },
    ...flattenCategories(node.children || [], level + 1),
  ]);
}

/** 在树中按 id 查找分类节点 */
export function findCategoryById(nodes: Category[], id: string): Category | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findCategoryById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** 返回 targetId 的直接父分类 id；若为根或未找到则 null */
export function findImmediateParentId(nodes: Category[], targetId: string): string | null {
  for (const node of nodes) {
    if (node.children?.some((c) => c.id === targetId)) return node.id;
    if (node.children?.length) {
      const found = findImmediateParentId(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

/** activeId 是否落在 node 子树内（含自身） */
export function isCategoryOrDescendantActive(node: Category, activeId: string): boolean {
  if (activeId === "all") return false;
  if (node.id === activeId) return true;
  return node.children?.some((c) => isCategoryOrDescendantActive(c, activeId)) ?? false;
}

/** 在顶层列表中，activeId 属于哪一个根分类子树（含根自身） */
export function findRootCategoryIdForActive(nodes: Category[], activeId: string): string | null {
  if (activeId === "all") return null;
  for (const n of nodes) {
    if (isCategoryOrDescendantActive(n, activeId)) return n.id;
  }
  return null;
}
