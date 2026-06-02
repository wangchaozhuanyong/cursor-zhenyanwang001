import { X } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export type AdminFilterChip = {
  key: string;
  label: string;
};

type Props = {
  chips: AdminFilterChip[];
  onClearAll: () => void;
  onRemove?: (key: string) => void;
};

export default function AdminFilterSummaryBar({ chips, onClearAll, onRemove }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]/60 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        <Tx>已选筛选</Tx>
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 py-1 text-xs text-foreground"
        >
          <span className="truncate">{chip.label}</span>
          {onRemove ? (
            <UnifiedButton
              type="button"
              onClick={() => onRemove(chip.key)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={`移除筛选 ${chip.label}`}
            >
              <X size={12} />
            </UnifiedButton>
          ) : null}
        </span>
      ))}
      <UnifiedButton
        type="button"
        onClick={onClearAll}
        className="ml-auto text-xs font-semibold text-[var(--theme-price)] hover:underline"
      >
        <Tx>清空筛选</Tx>
      </UnifiedButton>
    </div>
  );
}
