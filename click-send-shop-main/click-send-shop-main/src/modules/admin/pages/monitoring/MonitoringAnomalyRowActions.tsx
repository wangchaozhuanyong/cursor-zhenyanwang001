import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import {
  createRepairTask,
  ignoreMonitoringAnomaly,
  rescanMonitoringAnomaly,
  resolveMonitoringAnomaly,
  type MonitoringAnomaly,
} from "@/services/admin/monitoringService";

type Props = {
  item: MonitoringAnomaly;
  onAction: (fn: () => Promise<unknown>) => Promise<void>;
};

const actionBtn =
  "inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

const menuItem =
  "flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

export default function MonitoringAnomalyRowActions({ item, onAction }: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const terminal = item.status === "resolved" || item.status === "ignored";

  useEffect(() => {
    if (!open) return;
    const placeMenu = () => {
      const btn = menuBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 120;
      const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
      setMenuPos({ top: rect.bottom + 4, left });
    };
    placeMenu();
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    <div ref={rootRef} className="relative inline-flex max-w-full items-center gap-2">
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

        {open && menuPos ? (
          <div
            id={menuId}
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed z-[200] min-w-[7.5rem] rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          >
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
              className={`${menuItem} text-slate-600`}
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
        ) : null}
      </div>
    </div>
  );
}
