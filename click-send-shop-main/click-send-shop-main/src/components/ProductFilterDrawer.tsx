import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Filter } from "lucide-react";

interface ProductFilterDrawerProps {
  activeTagCount: number;
  onReset: () => void;
  children: ReactNode;
}

export default function ProductFilterDrawer({ activeTagCount, onReset, children }: ProductFilterDrawerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs font-semibold text-[var(--theme-text)]"
        >
          <Filter size={14} />
          筛选
          {activeTagCount > 0 ? (
            <span className="rounded-full bg-[var(--theme-price)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--theme-price-foreground)]">
              {activeTagCount}
            </span>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <DialogHeader>
          <DialogTitle>筛选商品</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {children}
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-xl border border-[var(--theme-border)] px-3 py-2 text-sm text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
          >
            清空筛选
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
