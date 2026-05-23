import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { useAdminReportLabel } from "@/hooks/useAdminReportLabel";

type Props = {
  loading?: boolean;
  entries: Array<[string, unknown]>;
  formatValue: (key: string, value: unknown) => string;
  skeletonCount?: number;
};

export default function ReportKpiGrid({ loading, entries, formatValue, skeletonCount = 6 }: Props) {
  const { column: labelReportColumn } = useAdminReportLabel();
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 space-y-2">
            <div className="skeleton-base skeleton-shimmer h-3 w-20 rounded" />
            <div className="skeleton-base skeleton-shimmer h-7 w-28 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {entries.map(([key, value]) => {
        const display = formatValue(key, value);
        return (
          <div
            key={key}
            className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"
          >
            <p className="text-xs font-medium text-[var(--theme-text-muted)]">{labelReportColumn(key)}</p>
            <div className="mt-1.5 text-xl font-bold tracking-tight text-[var(--theme-text)]">
              <AdminTableCell
                value={display}
                columnKey={key}
                fullText={display === "-" ? "" : String(display)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
