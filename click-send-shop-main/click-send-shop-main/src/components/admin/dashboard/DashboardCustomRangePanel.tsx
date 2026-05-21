import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import AnchoredPopover from "@/components/admin/AnchoredPopover";
import type { RefObject } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  draftFrom: string;
  draftTo: string;
  onDraftFromChange: (value: string) => void;
  onDraftToChange: (value: string) => void;
  onApply: () => void;
};

export default function DashboardCustomRangePanel({
  open,
  onClose,
  anchorRef,
  draftFrom,
  draftTo,
  onDraftFromChange,
  onDraftToChange,
  onApply,
}: Props) {
  return (
    <AnchoredPopover open={open} onClose={onClose} anchorRef={anchorRef} ariaLabel="自定义日期范围">
      <p className="text-sm font-semibold text-foreground">自定义日期范围</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedDateInput value={draftFrom} onChange={onDraftFromChange} className="min-w-[10.5rem]" />
        <span className="shrink-0 text-center text-xs text-muted-foreground sm:px-1">至</span>
        <SegmentedDateInput value={draftTo} onChange={onDraftToChange} className="min-w-[10.5rem]" />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-[var(--theme-bg)]"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
        >
          确定
        </button>
      </div>
    </AnchoredPopover>
  );
}
