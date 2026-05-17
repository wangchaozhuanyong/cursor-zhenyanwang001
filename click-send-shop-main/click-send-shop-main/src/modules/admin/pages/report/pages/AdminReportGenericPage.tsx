import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import { AnimatedTable } from "@/modules/micro-interactions";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelReportCellValue, labelReportColumn } from "@/utils/adminDisplayLabels";
import { formatAdminDate, formatAdminDateTimeAuto } from "@/utils/formatDateTime";

function formatCellValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (key === "month" && typeof value === "string") return value;
  if (key === "date") return formatAdminDate(String(value));
  if (
    key.endsWith("_at") ||
    key.endsWith("_date") ||
    key === "start_date" ||
    key === "end_date" ||
    key === "start_at" ||
    key === "end_at"
  ) {
    return formatAdminDateTimeAuto(value);
  }
  return labelReportCellValue(key, value);
}

type Props = {
  title: string;
  fetcher: (params: Record<string, string>) => Promise<Record<string, unknown>>;
};

export default function AdminReportGenericPage({ title, fetcher }: Props) {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const p: Record<string, string> = {};
        searchParams.forEach((v, k) => (p[k] = v));
        const data = await fetcher(p);
        setPayload(data || {});
      } catch (e) {
        toast.error(toastErrorMessage(e, "鍔犺浇鎶ヨ〃澶辫触"));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [fetcher, searchParams]);

  const list = Array.isArray(payload.list) ? (payload.list as unknown as Record<string, unknown>[]) : [];
  const summary = (payload.summary || {}) as unknown as Record<string, unknown>;
  const columns = useMemo(
    () => (list.length > 0 ? Object.keys(list[0]) : ["col1", "col2", "col3", "col4", "col5"]),
    [list],
  );

  const summaryEntries = Object.entries(summary).slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
      <ReportFilterBar />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 space-y-2">
                <div className="skeleton-base skeleton-shimmer h-3 w-16 rounded" />
                <div className="skeleton-base skeleton-shimmer h-6 w-24 rounded" />
              </div>
            ))
          : summaryEntries.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                <p className="text-xs text-[var(--theme-text-muted)]">{labelReportColumn(k)}</p>
                <p className="mt-1 text-lg font-bold text-[var(--theme-text)]">{formatCellValue(k, v)}</p>
              </div>
            ))}
      </div>
      <AnimatedTable
        loading={loading}
        rows={list}
        rowKey={(row) => String(list.indexOf(row))}
        skeletonRows={8}
        skeletonCols={columns.length}
        className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-0 overflow-auto"
        tableClassName="w-full min-w-[900px] text-xs"
        theadClassName="border-b border-[var(--theme-border)]"
        thead={(
          <tr>
            {columns.map((k) => (
              <th key={k} className="px-2 py-2 text-left text-muted-foreground">{labelReportColumn(k)}</th>
            ))}
          </tr>
        )}
        emptyIcon={FileSpreadsheet}
        emptyTitle="鏆傛棤鏁版嵁"
        renderRow={(row) => (
          <>
            {columns.map((k) => (
              <td key={k} className="px-2 py-2">{formatCellValue(k, row[k])}</td>
            ))}
          </>
        )}
      />
    </div>
  );
}
