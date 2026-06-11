import { Download, Loader2 } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import PermissionGate from "@/components/admin/PermissionGate";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type Props = {
  title: string;
  description: string;
  /** 标签栏已展示标题时，仅保留导出等操作（默认开启） */
  compact?: boolean;
  exporting?: boolean;
  exportLabel?: string;
  onExport?: () => void;
};

export function ReportExportButton({
  exporting = false,
  exportLabel = "导出当前报表",
  onExport,
}: Pick<Props, "exporting" | "exportLabel" | "onExport"> & { onExport: () => void }) {
  return (
    <PermissionGate permission="report.export">
      <UnifiedButton
        type="button"
        disabled={exporting}
        onClick={onExport}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        <Tx>{exportLabel}</Tx>
      </UnifiedButton>
    </PermissionGate>
  );
}

export default function ReportPageHeader({
  title,
  description,
  compact = true,
  exporting = false,
  exportLabel = "导出当前报表",
  onExport,
}: Props) {
  const { tText } = useAdminT();
  if (compact) {
    return onExport ? (
      <ReportExportButton exporting={exporting} exportLabel={exportLabel} onExport={onExport} />
    ) : null;
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-bold text-foreground">{tText(title)}</h1>
        <p className="text-sm leading-relaxed text-[var(--theme-text-muted)]">{tText(description)}</p>
      </div>
      {onExport ? (
        <ReportExportButton exporting={exporting} exportLabel={exportLabel} onExport={onExport} />
      ) : null}
    </div>
  );
}
