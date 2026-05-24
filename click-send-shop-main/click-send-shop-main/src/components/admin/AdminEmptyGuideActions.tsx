import { useNavigate } from "react-router-dom";
import type { AdminEmptyGuide } from "@/config/adminEmptyStateGuides";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
type Props = {
  guide: AdminEmptyGuide;
  onClearFilters?: () => void;
  showClearFilters?: boolean;
};

export function AdminEmptyGuideActions({ guide, onClearFilters, showClearFilters }: Props) {
  const { tText } = useAdminT();
  const navigate = useNavigate();

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {guide.primaryPath && guide.primaryLabel ? (
        <button
          type="button"
          onClick={() => navigate(guide.primaryPath!)}
          className="rounded-lg btn-theme-price px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {tText(guide.primaryLabel)}
        </button>
      ) : null}
      {guide.secondaryPath && guide.secondaryLabel ? (
        <button
          type="button"
          onClick={() => navigate(guide.secondaryPath!)}
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-semibold text-foreground"
        >
          {tText(guide.secondaryLabel)}
        </button>
      ) : null}
      {showClearFilters && onClearFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold text-[var(--theme-price)]"
        >
          <Tx>清空筛选</Tx>
        </button>
      ) : null}
    </div>
  );
}
