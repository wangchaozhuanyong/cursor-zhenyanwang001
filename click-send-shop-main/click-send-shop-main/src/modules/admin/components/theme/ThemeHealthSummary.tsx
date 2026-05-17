import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ThemeConfig } from "@/types/theme";
import { getThemeHealthChecks } from "@/utils/themeContrast";

type Props = {
  config: ThemeConfig;
  onOptimizeTextContrast?: () => void;
  onToggleDetail?: () => void;
  detailOpen?: boolean;
};

export default function ThemeHealthSummary({ config, onOptimizeTextContrast, onToggleDetail, detailOpen = false }: Props) {
  const checks = getThemeHealthChecks(config);
  const pass = checks.filter((item) => item.status === "pass").length;
  const warn = checks.filter((item) => item.status === "warn").length;
  const fail = checks.filter((item) => item.status === "fail").length;
  const issueCount = warn + fail;

  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">健康检查</p>
          <p className="text-[11px] text-muted-foreground">
            {issueCount === 0 ? "全部通过" : `${issueCount} 个问题`} · 通过 {pass} · 警告 {warn} · 失败 {fail}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {issueCount === 0 ? <CheckCircle2 size={14} className="text-emerald-600" /> : null}
          {warn > 0 ? <AlertTriangle size={14} className="text-amber-600" /> : null}
          {fail > 0 ? <XCircle size={14} className="text-red-600" /> : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {onOptimizeTextContrast ? (
          <button type="button" onClick={onOptimizeTextContrast} className="rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-secondary">
            一键优化文字对比度
          </button>
        ) : null}
        {onToggleDetail ? (
          <button type="button" onClick={onToggleDetail} className="rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-secondary">
            {detailOpen ? "收起详情" : "查看详情"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
