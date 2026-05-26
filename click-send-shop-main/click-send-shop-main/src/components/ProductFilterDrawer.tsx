import { useState, type ReactNode } from "react";
import { Filter } from "lucide-react";
import { AppModal } from "@/modules/micro-interactions";

interface ProductFilterDrawerProps {
  activeFilterCount: number;
  onReset: () => void;
  onConfirm?: () => boolean | void;
  children: ReactNode;
}

export default function ProductFilterDrawer({ activeFilterCount, onReset, onConfirm, children }: ProductFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-xl border border-[var(--theme-border)] px-3 py-3 text-sm text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
      >
        清空筛选
      </button>
      <button
        type="button"
        onClick={() => {
          const ok = onConfirm?.();
          if (ok === false) return;
          setOpen(false);
        }}
        className="w-full rounded-xl bg-[var(--theme-primary)] px-3 py-3 text-sm font-semibold text-[var(--theme-primary-foreground)]"
      >
        确认筛选
      </button>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs font-semibold text-[var(--theme-text)]"
      >
        <Filter size={14} />
        筛选
        {activeFilterCount > 0 ? (
          <span className="rounded-full bg-[var(--theme-price)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--theme-price-foreground)]">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      <AppModal
        tier="standard"
        open={open}
        onClose={() => setOpen(false)}
        title="筛选商品"
        height="90vh"
        stickyFooter
        footer={footer}
      >
        <div className="space-y-4 pb-2">{children}</div>
      </AppModal>
    </>
  );
}
