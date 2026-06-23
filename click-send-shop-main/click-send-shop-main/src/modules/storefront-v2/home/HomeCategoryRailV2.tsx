import { ArrowRight, Grid3X3, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { cn } from "@/lib/utils";
import type { ClientDesignStyle } from "@/utils/clientDesignStyle";
import type { Category } from "@/types/category";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";
import { useClientDesignStyle } from "../design/useClientDesignStyle";

type HomeCategoryRailV2Props = {
  categories: Category[];
  onNavigate: (path: string) => void;
};

export default function HomeCategoryRailV2({ categories, onNavigate }: HomeCategoryRailV2Props) {
  const clientStyle = useClientDesignStyle();
  const visibleCategories = categories
    .filter((category) => category.is_active !== false && category.is_visible !== false)
    .slice(0, 8);

  return (
    <section
      className={cn(
        "border border-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-surface)_92%,var(--theme-bg))] p-3 shadow-[0_12px_36px_color-mix(in_srgb,var(--theme-primary)_8%,transparent)] md:p-4",
        clientStyle === "deep_enterprise" ? "rounded-[0.875rem]" : "rounded-[1.125rem]",
        clientStyle === "black_gold" && "border-[color-mix(in_srgb,var(--theme-primary)_22%,var(--theme-border))] bg-[var(--theme-surface)]",
      )}
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="mb-2 h-1 w-8 rounded-full bg-[var(--theme-primary)]" aria-hidden />
          <h2 className="text-base font-black text-[var(--theme-text)] md:text-lg">分类入口</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">先从高频入口开始浏览</p>
        </div>
        <UnifiedButton
          type="button"
          onClick={() => onNavigate("/categories")}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-black text-[var(--theme-primary)]"
        >
          全部
          <ArrowRight size={13} />
        </UnifiedButton>
      </div>
      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible lg:grid-cols-10">
        <CategoryButton
          label="全部"
          icon={<Grid3X3 size={20} />}
          onClick={() => onNavigate("/categories")}
          clientStyle={clientStyle}
        />
        <CategoryButton
          label="新品"
          icon={<Sparkles size={20} />}
          onClick={() => onNavigate(NEW_ARRIVAL_CATEGORY_PATH)}
          clientStyle={clientStyle}
        />
        {visibleCategories.map((category) => (
          <CategoryButton
            key={category.id}
            label={storefrontCategoryName(category.name)}
            image={category.icon_url || category.icon}
            onClick={() => onNavigate(`/categories?cat=${encodeURIComponent(category.id)}`)}
            clientStyle={clientStyle}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryButton({
  label,
  icon,
  image,
  onClick,
  clientStyle,
}: {
  label: string;
  icon?: ReactNode;
  image?: string;
  onClick: () => void;
  clientStyle: ClientDesignStyle;
}) {
  return (
    <UnifiedButton
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-20 shrink-0 snap-start flex-col items-center gap-2 border border-[color-mix(in_srgb,var(--theme-border)_84%,transparent)] bg-[var(--theme-surface)] px-2 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-primary)_34%,var(--theme-border))] hover:shadow-[0_12px_30px_color-mix(in_srgb,var(--theme-primary)_10%,transparent)] md:w-full",
        clientStyle === "deep_enterprise" ? "rounded-[0.75rem]" : "rounded-[0.95rem]",
        clientStyle === "black_gold" && "border-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))] bg-[var(--theme-surface)]",
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center overflow-hidden bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] text-[var(--theme-primary)]",
          clientStyle === "deep_enterprise" ? "rounded-[0.65rem]" : "rounded-[0.875rem]",
          clientStyle === "black_gold" && "bg-[color-mix(in_srgb,var(--theme-primary)_16%,var(--theme-surface))]",
        )}
      >
        {image ? <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" /> : icon}
      </span>
      <span className="line-clamp-2 min-h-[2rem] text-xs font-black leading-4 text-[var(--theme-text)]">{label}</span>
    </UnifiedButton>
  );
}
