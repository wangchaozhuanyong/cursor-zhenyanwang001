import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import AdminPageShell from "@/components/admin/AdminPageShell";
import Pagination from "@/components/admin/Pagination";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { adminQueryKeys, type UserProductActivityListParams } from "@/lib/adminQueryKeys";
import {
  fetchUserFavorites,
  fetchUserHistory,
  type AdminUserFavoriteRow,
  type AdminUserHistoryRow,
} from "@/services/admin/userService";
import { formatDateTime } from "@/utils/formatDateTime";
import type { PaginatedData } from "@/types/common";
import type { Product } from "@/types/product";

type ActivityKind = "favorites" | "history";
type ActivityRow = AdminUserFavoriteRow | AdminUserHistoryRow;

type Props = {
  kind: ActivityKind;
};

function activityTime(row: ActivityRow, kind: ActivityKind) {
  return kind === "favorites" ? (row as AdminUserFavoriteRow).favorited_at : (row as AdminUserHistoryRow).viewed_at;
}

function productImage(product: Product) {
  return product.cover_image || product.images?.[0] || "";
}

function productPrice(product: Product) {
  const source = product as Product & { min_price?: number | null; max_price?: number | null };
  const min = Number(product.min_sku_price ?? source.min_price ?? product.price);
  const max = Number(product.max_sku_price ?? source.max_price ?? product.price);
  if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
    return `RM ${min.toFixed(2)}-${max.toFixed(2)}`;
  }
  return `RM ${Number(product.price || min || 0).toFixed(2)}`;
}

export default function AdminUserProductActivityPage({ kind }: Props) {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));
  const [pageSize, setPageSize] = useState(() => Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20)));
  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") || "");
  const [userId, setUserId] = useState(() => searchParams.get("userId") || "");
  const [productId, setProductId] = useState(() => searchParams.get("productId") || "");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("dateTo") || "");

  const title = kind === "favorites" ? "收藏管理" : "浏览历史";
  const hint = kind === "favorites"
    ? "查看客户收藏的商品，按用户、商品或时间筛选，方便运营判断兴趣商品。"
    : "查看客户最近浏览商品记录，按用户、商品或时间筛选，方便运营跟进访问路径。";
  const timeLabel = kind === "favorites" ? "收藏时间" : "浏览时间";

  const filters = useMemo<UserProductActivityListParams>(() => ({
    page,
    pageSize,
    keyword: keyword.trim(),
    userId: userId.trim(),
    productId: productId.trim(),
    dateFrom,
    dateTo,
  }), [dateFrom, dateTo, keyword, page, pageSize, productId, userId]);

  const query = useQuery<PaginatedData<ActivityRow>>({
    queryKey: kind === "favorites" ? adminQueryKeys.userFavorites(filters) : adminQueryKeys.userHistory(filters),
    queryFn: () => kind === "favorites" ? fetchUserFavorites(filters) : fetchUserHistory(filters),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const rows = query.data?.list ?? [];
  const total = query.data?.total ?? 0;
  const loading = query.isLoading && !query.data;
  const filtersActive = Boolean(keyword.trim() || userId.trim() || productId.trim() || dateFrom || dateTo);

  const resetFilters = () => {
    setKeyword("");
    setUserId("");
    setProductId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <AdminPageShell
      showTitle
      title={<Tx>{title}</Tx>}
      hint={<Tx>{hint}</Tx>}
      filters={(
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
            <label className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                value={keyword}
                onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
                placeholder="搜索用户、手机号、商品"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-[var(--theme-primary)]"
              />
            </label>
            <input
              value={userId}
              onChange={(event) => { setUserId(event.target.value); setPage(1); }}
              placeholder="用户 ID"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[var(--theme-primary)]"
            />
            <input
              value={productId}
              onChange={(event) => { setProductId(event.target.value); setPage(1); }}
              placeholder="商品 ID"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[var(--theme-primary)]"
            />
            <SegmentedDateInput value={dateFrom} onChange={(value) => { setDateFrom(value); setPage(1); }} />
            <SegmentedDateInput value={dateTo} onChange={(value) => { setDateTo(value); setPage(1); }} />
          </div>
          {filtersActive ? (
            <div className="mt-3 flex justify-end">
              <UnifiedButton type="button" onClick={resetFilters} className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary">
                <Tx>清空筛选</Tx>
              </UnifiedButton>
            </div>
          ) : null}
        </div>
      )}
    >
      <section className="rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1.2fr_1.4fr_140px_110px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground max-lg:hidden">
          <span><Tx>客户</Tx></span>
          <span><Tx>商品</Tx></span>
          <span><Tx>{timeLabel}</Tx></span>
          <span className="text-right"><Tx>操作</Tx></span>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground"><Tx>加载中...</Tx></div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            <Tx>{filtersActive ? "当前筛选下暂无记录" : "暂无记录"}</Tx>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <ActivityRowCard key={String(row.id)} row={row} kind={kind} timeLabel={timeLabel} />
            ))}
          </div>
        )}
      </section>

      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
    </AdminPageShell>
  );
}

function ActivityRowCard({ row, kind, timeLabel }: { row: ActivityRow; kind: ActivityKind; timeLabel: string }) {
  const product = row.product;
  const image = productImage(product);
  const userName = row.user.nickname || row.user.phone || row.user.id || "未命名用户";
  return (
    <article className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[1.2fr_1.4fr_140px_110px] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[var(--theme-primary)]">
            <UserRound size={15} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.user.id || "-"}</p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
          <div className="size-14 overflow-hidden rounded-lg border border-border bg-secondary">
            {image ? <img src={image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">无图</div>}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium text-foreground">{product.name}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--theme-price)]">{productPrice(product)}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.id}</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="lg:hidden">{timeLabel}：</span>{formatDateTime(activityTime(row, kind))}
      </div>

      <div className="flex justify-end gap-2">
        {row.user.id ? (
          <Link to={`/admin/users/${row.user.id}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs hover:bg-secondary">
            <Tx>用户</Tx><ExternalLink size={12} />
          </Link>
        ) : null}
        <Link to={`/admin/products/${product.id}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs hover:bg-secondary">
          <Tx>商品</Tx><ExternalLink size={12} />
        </Link>
      </div>
    </article>
  );
}
