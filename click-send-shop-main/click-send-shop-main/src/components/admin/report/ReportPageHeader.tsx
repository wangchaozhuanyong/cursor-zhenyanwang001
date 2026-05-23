import { Download, Loader2 } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import PermissionGate from "@/components/admin/PermissionGate";

type Props = {
  title: string;
  description: string;
  exporting?: boolean;
  exportLabel?: string;
  onExport?: () => void;
};

export default function ReportPageHeader({
  title,
  description,
  exporting = false,
  exportLabel = "导出当前报表",
  onExport,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-sm leading-relaxed text-[var(--theme-text-muted)]">{description}</p>
      </div>
      {onExport ? (
        <PermissionGate permission="report.export">
          <button
            type="button"
            disabled={exporting}
            onClick={onExport}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <Tx>{exportLabel}</Tx>
          </button>
        </PermissionGate>
      ) : null}
    </div>
  );
}
