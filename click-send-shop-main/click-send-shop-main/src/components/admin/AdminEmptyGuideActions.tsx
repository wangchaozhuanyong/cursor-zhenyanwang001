import type { AdminEmptyGuide } from "@/config/adminEmptyStateGuides";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
type Props = {
  guide: AdminEmptyGuide;
  onClearFilters?: () => void;
  showClearFilters?: boolean;
};

export function AdminEmptyGuideActions({ guide, onClearFilters, showClearFilters }: Props) {
  const { tText } = useAdminT();
  const adminNavigate = useAdminNavigation();

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {guide.primaryPath && guide.primaryLabel ? (
        <UnifiedButton
          type="button"
          onClick={() => { void adminNavigate(guide.primaryPath!); }}
          className="rounded-lg btn-theme-price px-4 py-2 text-xs font-semibold text-[var(--theme-price-foreground)]"
        >
          {tText(guide.primaryLabel)}
        </UnifiedButton>
      ) : null}
      {guide.secondaryPath && guide.secondaryLabel ? (
        <UnifiedButton
          type="button"
          onClick={() => { void adminNavigate(guide.secondaryPath!); }}
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-semibold text-foreground"
        >
          {tText(guide.secondaryLabel)}
        </UnifiedButton>
      ) : null}
      {showClearFilters && onClearFilters ? (
        <UnifiedButton
          type="button"
          onClick={onClearFilters}
          className="rounded-lg border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold text-[var(--theme-price)]"
        >
          <Tx>清空筛选</Tx>
        </UnifiedButton>
      ) : null}
    </div>
  );
}
