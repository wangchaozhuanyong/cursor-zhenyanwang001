import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Filter } from "lucide-react";

interface ProductFilterDrawerProps {
  activeFilterCount: number;
  onReset: () => void;
  onConfirm?: () => boolean | void;
  children: ReactNode;
}

export default function ProductFilterDrawer({ activeFilterCount, onReset, onConfirm, children }: ProductFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs font-semibold text-[var(--theme-text)]">
          <Filter size={14} />
          筛选
          {activeFilterCount > 0 ? <span className="rounded-full bg-[var(--theme-price)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--theme-price-foreground)]">{activeFilterCount}</span> : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <DialogHeader><DialogTitle>筛选商品</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {children}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onReset} className="w-full rounded-xl border border-[var(--theme-border)] px-3 py-2 text-sm text-[var(--theme-text)] hover:bg-[var(--theme-bg)]">清空筛选</button>
            <button
              type="button"
              onClick={() => {
                const ok = onConfirm?.();
                if (ok === false) return;
                setOpen(false);
              }}
              className="w-full rounded-xl bg-[var(--theme-primary)] px-3 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            >
              确认筛选
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
