import { Grid3X3, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Category } from "@/types/category";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";

type HomeCategoryRailV2Props = {
  categories: Category[];
  onNavigate: (path: string) => void;
};

export default function HomeCategoryRailV2({ categories, onNavigate }: HomeCategoryRailV2Props) {
  const visibleCategories = categories
    .filter((category) => category.is_active !== false && category.is_visible !== false)
    .slice(0, 8);

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-sm md:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[var(--theme-text)] md:text-lg">分类入口</h2>
          <p className="mt-0.5 text-xs text-[var(--theme-text-muted)]">先从高频入口开始浏览</p>
        </div>
        <UnifiedButton
          type="button"
          onClick={() => onNavigate("/categories")}
          className="rounded-full px-2.5 py-1.5 text-xs font-bold text-[var(--theme-price)]"
        >
          全部
        </UnifiedButton>
      </div>
      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible lg:grid-cols-10">
        <CategoryButton
          label="全部"
          icon={<Grid3X3 size={20} />}
          onClick={() => onNavigate("/categories")}
        />
        <CategoryButton
          label="新品"
          icon={<Sparkles size={20} />}
          onClick={() => onNavigate(NEW_ARRIVAL_CATEGORY_PATH)}
        />
        {visibleCategories.map((category) => (
          <CategoryButton
            key={category.id}
            label={category.name}
            image={category.icon_url || category.icon}
            onClick={() => onNavigate(`/categories?cat=${encodeURIComponent(category.id)}`)}
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
}: {
  label: string;
  icon?: ReactNode;
  image?: string;
  onClick: () => void;
}) {
  return (
    <UnifiedButton
      type="button"
      onClick={onClick}
      className="flex w-20 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-3 text-center transition hover:border-[color-mix(in_srgb,var(--theme-primary)_34%,var(--theme-border))] md:w-full"
    >
      <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] text-[var(--theme-primary)]">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" /> : icon}
      </span>
      <span className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-4 text-[var(--theme-text)]">{label}</span>
    </UnifiedButton>
  );
}
