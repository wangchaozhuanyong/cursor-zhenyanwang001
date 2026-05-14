import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import NotificationIconButton from "@/components/NotificationIconButton";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductFilterDrawer from "@/components/ProductFilterDrawer";
import ProductSortBar from "@/components/ProductSortBar";
import CategorySideTree from "@/components/CategorySideTree";
import { Skeleton } from "@/components/ui/skeleton";
import * as productService from "@/services/productService";
import type { ProductSortType, ProductTag } from "@/types/product";
import type { Category } from "@/types/category";
import {
  findCategoryById,
  findImmediateParentId,
  findRootCategoryIdForActive,
  isCategoryOrDescendantActive,
} from "@/utils/categoryTree";

export default function Categories() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [searchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState(searchParams.get("cat") || "all");
  const [activeTagId, setActiveTagId] = useState(searchParams.get("tag_id") || "");
  const [quickTags, setQuickTags] = useState<ProductTag[]>([]);
  const [sort, setSort] = useState<ProductSortType>("default");
  const [query, setQuery] = useState("");
  const showNewOnly = searchParams.get("is_new") === "1" || searchParams.get("is_new") === "true";
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  const {
    products,
    categories,
    loading,
    error,
    loadProducts,
    loadCategories,
  } = useProductStore();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    productService.fetchProductTags(12).then(setQuickTags).catch(() => setQuickTags([]));
  }, []);

  useEffect(() => {
    loadProducts({
      category_id: activeCat === "all" ? undefined : activeCat,
      tag_id: activeTagId || undefined,
      keyword: query || undefined,
      is_new: showNewOnly ? true : undefined,
      sort: sort === "default" ? undefined : sort,
      page: 1,
      pageSize: 50,
    });
  }, [activeCat, activeTagId, sort, query, showNewOnly, loadProducts]);

  /** 深链 / 刷新：当前选中为子分类时自动展开父级 */
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (!cat || cat === "all" || categories.length === 0) return;
    const parentId = findImmediateParentId(categories, cat);
    if (parentId) setExpandedParentId(parentId);
  }, [searchParams, categories]);

  const handleSelectChild = useCallback((parentId: string, childId: string) => {
    setActiveCat(childId);
    setExpandedParentId(parentId);
  }, []);

  const handleRootCategoryClick = useCallback(
    (cat: Category) => {
      const children = cat.children?.filter(Boolean) ?? [];
      if (children.length === 0) {
        setActiveCat(cat.id);
        setExpandedParentId(null);
        return;
      }
      if (expandedParentId === cat.id) {
        setExpandedParentId(null);
        return;
      }
      setExpandedParentId(cat.id);
      setActiveCat(cat.id);
    },
    [expandedParentId],
  );

  const handleSelectAll = useCallback(() => {
    setActiveCat("all");
    setActiveTagId("");
    setExpandedParentId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTagId("");
    setSort("default");
    setQuery("");
  }, []);

  const categoryBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rootRow: Array<{ kind: "all" } | { kind: "root"; node: Category }> = [
    { kind: "all" },
    ...categories.map((node) => ({ kind: "root" as const, node })),
  ];

  const expandedNode = expandedParentId ? findCategoryById(categories, expandedParentId) : null;
  const subCategories = expandedNode?.children?.filter(Boolean) ?? [];

  const scrollTabKey =
    activeCat === "all" ? "all" : findRootCategoryIdForActive(categories, activeCat) ?? activeCat;

  useEffect(() => {
    const btn = categoryBtnRefs.current.get(scrollTabKey);
    btn?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [scrollTabKey, categories.length]);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-20">
      <header className="sticky top-0 z-40 bg-[var(--theme-surface)]/95 backdrop-blur-md border-b border-[var(--theme-border)]">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索商品..."
            className="flex-1 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-border)] px-4 py-2 text-sm text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-muted)]"
          />
          <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} />
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl">
        {showNewOnly ? (
          <div className="px-4 pt-4 md:px-6">
            <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm font-semibold text-[var(--theme-text-on-surface)]">
              正在筛选：新品上市
            </div>
          </div>
        ) : null}

        {/* 仅顶层分类横向滚动；有子类的父级点击展开下方子类 */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-[var(--theme-border)] px-4 py-3 md:hidden">
          {loading && categories.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 flex-shrink-0 rounded-full" />
              ))
            : rootRow.map((item) => {
                if (item.kind === "all") {
                  return (
                    <button
                      key="all"
                      ref={(el) => {
                        if (el) categoryBtnRefs.current.set("all", el);
                        else categoryBtnRefs.current.delete("all");
                      }}
                      type="button"
                      onClick={handleSelectAll}
                      className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                        activeCat === "all"
                          ? "bg-[var(--theme-primary)] text-white"
                          : "bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]"
                      }`}
                    >
                      全部
                    </button>
                  );
                }
                const { node } = item;
                const hasChildren = (node.children?.length ?? 0) > 0;
                const isActive = isCategoryOrDescendantActive(node, activeCat);
                const isExpanded = expandedParentId === node.id;
                return (
                  <button
                    key={node.id}
                    ref={(el) => {
                      if (el) categoryBtnRefs.current.set(node.id, el);
                      else categoryBtnRefs.current.delete(node.id);
                    }}
                    type="button"
                    onClick={() => handleRootCategoryClick(node)}
                    className={`flex shrink-0 items-center gap-0.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--theme-primary)] text-white"
                        : "bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]"
                    }`}
                  >
                    <span className="max-w-[9.5rem] truncate">
                      {node.icon ? `${node.icon} ` : null}
                      {node.name}
                    </span>
                    {hasChildren ? (
                      <ChevronDown
                        size={14}
                        className={`shrink-0 opacity-80 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
        </div>

        {subCategories.length > 0 ? (
          <div className="border-b border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-text)_3%,var(--theme-bg))] px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">
              子分类
            </p>
            <div className="flex flex-wrap gap-2">
              {subCategories.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleSelectChild(expandedNode.id, child.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCat === child.id
                      ? "bg-[var(--theme-price)] text-[var(--theme-price-foreground)]"
                      : "border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
                  }`}
                >
                  {child.icon ? `${child.icon} ` : null}
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="px-4 pb-6 pt-3 md:px-6">
          <div className="md:grid md:grid-cols-[260px,1fr] md:gap-6 lg:grid-cols-[288px,1fr]">
            <CategorySideTree
              categories={categories}
              activeCat={activeCat}
              expandedParentId={expandedParentId}
              onSelectAll={handleSelectAll}
              onRootClick={handleRootCategoryClick}
              onChildClick={handleSelectChild}
            />

            <section>
              <div className="mb-3 flex items-center gap-3">
                <ProductSortBar value={sort} onChange={setSort} />
                <ProductFilterDrawer activeTagCount={activeTagId ? 1 : 0} onReset={clearFilters}>
                  {quickTags.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-[var(--theme-text)]">热门标签</p>
                      <div className="flex flex-wrap gap-2">
                        {quickTags.map((tag) => {
                          const active = activeTagId === tag.id;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => setActiveTagId(active ? "" : tag.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 ${
                                active ? "ring-2 ring-[var(--theme-price)]/30" : ""
                              }`}
                              style={{
                                backgroundColor: active ? tag.bg_color || "#FEF3C7" : "var(--theme-surface)",
                                borderColor: tag.bg_color || "var(--theme-border)",
                                color: active ? tag.text_color || "#92400E" : "var(--theme-text)",
                              }}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--theme-text-muted)]">暂无可用筛选标签</p>
                  )}
                </ProductFilterDrawer>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-3 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Products */}
              <div className="grid grid-cols-2 gap-4 pt-1 md:grid-cols-3 lg:grid-cols-4">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
                  : products.map((p, i) => (
                      <ProductCard key={p.id} product={p} index={i} />
                    ))}
                {!loading && products.length === 0 && (
                  <div className="col-span-2 py-20 text-center text-muted-foreground md:col-span-3 lg:col-span-4">
                    暂无商品
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
