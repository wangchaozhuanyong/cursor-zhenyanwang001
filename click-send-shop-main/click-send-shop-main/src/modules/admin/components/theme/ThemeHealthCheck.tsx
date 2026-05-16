import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ThemeConfig } from "@/types/theme";
import { getThemeHealthChecks, type ThemeHealthStatus } from "@/utils/themeContrast";

const statusIcon: Record<ThemeHealthStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const statusTone: Record<ThemeHealthStatus, string> = {
  pass: "text-emerald-600",
  warn: "text-amber-600",
  fail: "text-red-600",
};

export default function ThemeHealthCheck({ config }: { config: ThemeConfig }) {
  const checks = getThemeHealthChecks(config);
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
        {failCount === 0 && warnCount === 0
          ? "全部检查通过，皮肤在前后台可读性良好。"
          : `共 ${checks.length} 项检查：${failCount} 项失败，${warnCount} 项警告。`}
      </div>
      <ul className="space-y-2">
        {checks.map((item) => {
          const Icon = statusIcon[item.status];
          return (
            <li
              key={item.id}
              className="flex gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs"
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${statusTone[item.status]}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{item.label}</p>
                {item.message ? <p className="mt-0.5 text-muted-foreground">{item.message}</p> : null}
                {item.suggestion && item.status !== "pass" ? (
                  <p className="mt-1 text-[11px] text-amber-700">{item.suggestion}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
