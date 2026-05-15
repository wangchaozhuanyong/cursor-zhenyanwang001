import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

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
        toast.error(toastErrorMessage(e, "加载报表失败"));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [fetcher, searchParams]);

  const list = Array.isArray(payload.list) ? (payload.list as Record<string, unknown>[]) : [];
  const summary = (payload.summary || {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
      <ReportFilterBar />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.keys(summary).slice(0, 8).map((k) => (
          <div key={k} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
            <p className="text-xs text-[var(--theme-text-muted)]">{k}</p>
            <p className="mt-1 text-lg font-bold text-[var(--theme-text)]">{String(summary[k] ?? "-")}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : list.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--theme-text-muted)]">暂无数据</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr className="border-b border-[var(--theme-border)]">
                  {Object.keys(list[0]).map((k) => <th key={k} className="px-2 py-2 text-left">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {list.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--theme-border)]/60">
                    {Object.keys(list[0]).map((k) => <td key={k} className="px-2 py-2">{String(row[k] ?? "-")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
