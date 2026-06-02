import { ChevronLeft, ChevronRight } from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelect?: boolean;
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  showPageSizeSelect = true,
}: PaginationProps) {
  const safeTotal = Math.max(0, total);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const safeP = Math.min(Math.max(1, page), totalPages);
  const hasRows = safeTotal > 0;
  const start = hasRows ? (safeP - 1) * safePageSize + 1 : 0;
  const end = hasRows ? Math.min(safeP * safePageSize, safeTotal) : 0;

  // Generate visible page numbers
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (safeP > 3) pages.push("...");
    for (let i = Math.max(2, safeP - 1); i <= Math.min(totalPages - 1, safeP + 1); i++) pages.push(i);
    if (safeP < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="admin-pagination flex min-w-0 flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
      <div className="admin-pagination-summary flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
        <span>共 {safeTotal} 条</span>
        <span className="hidden text-border sm:inline">|</span>
        <span>{hasRows ? `第 ${start}-${end} 条` : "暂无数据"}</span>
        {showPageSizeSelect ? (
          <>
            <span className="text-border">|</span>
            <select
              value={pageSize}
              onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
              className="touch-manipulation min-h-[40px] rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm text-foreground outline-none"
              aria-label="每页条数"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>{s} 条/页</option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <div className="admin-pagination-controls -mx-1 flex min-w-0 items-center justify-start gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0">
        <UnifiedButton
          type="button"
          onClick={() => onPageChange(safeP - 1)}
          disabled={safeP <= 1}
          aria-label="上一页"
          className="touch-manipulation flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </UnifiedButton>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-1.5 text-sm text-muted-foreground">…</span>
          ) : (
            <UnifiedButton
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === safeP ? "page" : undefined}
              aria-label={`第 ${p} 页`}
              className={`admin-pagination-page touch-manipulation flex min-h-11 min-w-[44px] items-center justify-center rounded-xl px-2 text-sm font-medium transition-colors ${
                p === safeP
                  ? "btn-theme-price"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {p}
            </UnifiedButton>
          )
        )}

        <UnifiedButton
          type="button"
          onClick={() => onPageChange(safeP + 1)}
          disabled={safeP >= totalPages}
          aria-label="下一页"
          className="touch-manipulation flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </UnifiedButton>
      </div>
    </div>
  );
}
