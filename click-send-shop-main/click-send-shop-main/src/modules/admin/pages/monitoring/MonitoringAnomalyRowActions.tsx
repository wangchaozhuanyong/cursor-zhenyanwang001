import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import AnchoredMenu from "@/components/admin/AnchoredMenu";
import {
  createRepairTask,
  ignoreMonitoringAnomaly,
  rescanMonitoringAnomaly,
  resolveMonitoringAnomaly,
  type MonitoringAnomaly,
} from "@/services/admin/monitoringService";
import { monitoringSecondaryButtonClass } from "./monitoringUi";

type Props = {
  item: MonitoringAnomaly;
  onAction: (fn: () => Promise<unknown>) => Promise<void>;
};

const actionBtn =
  monitoringSecondaryButtonClass;

const menuItem =
  "flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-[var(--theme-bg)] disabled:cursor-not-allowed disabled:opacity-40";

export default function MonitoringAnomalyRowActions({ item, onAction }: Props) {
  const menuId = useId();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const terminal = item.status === "resolved" || item.status === "ignored";

  async function run(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    try {
      await onAction(fn);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative inline-flex max-w-full items-center gap-2">
      <Link className={actionBtn} to={`/admin/monitoring/anomalies/${item.id}`}>
        详情
      </Link>

      <div className="relative">
        <button
          ref={menuBtnRef}
          type="button"
          className={`${actionBtn} gap-1 pr-2`}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
          更多
          <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>

        <AnchoredMenu open={open} onClose={() => setOpen(false)} anchorRef={menuBtnRef} width={120} gap={4}>
          <div id={menuId} role="menu" className="min-w-[7.5rem]">
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              disabled={busy}
              onClick={() => void run(() => rescanMonitoringAnomaly(item.id))}
            >
              复查
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              disabled={busy || terminal}
              title={terminal ? "已忽略或已解决的异常无需再建任务" : undefined}
              onClick={() => void run(() => createRepairTask(item.id))}
            >
              建任务
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${menuItem} text-muted-foreground`}
              disabled={busy || item.status === "ignored" || item.status === "resolved"}
              onClick={() => void run(() => ignoreMonitoringAnomaly(item.id))}
            >
              忽略
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${menuItem} text-emerald-700`}
              disabled={busy || item.status === "resolved"}
              onClick={() => void run(() => resolveMonitoringAnomaly(item.id))}
            >
              解决
            </button>
          </div>
        </AnchoredMenu>
      </div>
    </div>
  );
}
