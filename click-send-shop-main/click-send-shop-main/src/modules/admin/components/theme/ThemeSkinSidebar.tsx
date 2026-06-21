import type { ThemeSkin } from "@/types/theme";
import { SCENE_TAG_LABELS } from "./themeStudioConstants";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export type ThemeSkinSidebarProps = {
  skins: ThemeSkin[];
  selectedSkinId: string;
  defaultSkinId: string;
  activeSkinId?: string;
  holidaySkinId?: string;
  categoryFilter: string;
  categoryOptions: string[];
  search: string;
  onSearchChange: (v: string) => void;
  onCategoryFilterChange: (v: string) => void;
  onSelect: (id: string) => void;
};

function colorDots(config: ThemeSkin["config"]) {
  return [config.primaryColor, config.secondaryColor, config.accentColor, config.bgColor];
}

function getSkinCategory(skin: ThemeSkin): string {
  const category = skin.category?.trim();
  if (category) return category;
  if (skin.sceneTag) return SCENE_TAG_LABELS[skin.sceneTag] || skin.sceneTag;
  return "未分类";
}

export default function ThemeSkinSidebar({
  skins,
  selectedSkinId,
  defaultSkinId,
  activeSkinId,
  holidaySkinId,
  categoryFilter,
  categoryOptions,
  search,
  onSearchChange,
  onCategoryFilterChange,
  onSelect,
}: ThemeSkinSidebarProps) {
  const q = search.trim().toLowerCase();
  const filtered = skins.filter((skin) => {
    const category = getSkinCategory(skin);
    const matchCategory = categoryFilter === "all" || category === categoryFilter;
    const matchSearch =
      !q ||
      skin.name.toLowerCase().includes(q) ||
      (skin.description || "").toLowerCase().includes(q) ||
      category.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  return (
    <aside className="w-full shrink-0 self-start rounded-2xl border border-border bg-card p-4 shadow-sm 2xl:sticky 2xl:top-24 2xl:w-[320px]">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">皮肤库</p>
          <p className="mt-1 text-xs text-muted-foreground">分类用于后台管理；客户端使用哪套皮肤由“设为默认”决定。</p>
        </div>

        <AdminSearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="搜索皮肤"
          iconSize={14}
          className="min-h-[36px] rounded-lg border border-border bg-background pl-8 pr-2 text-xs leading-4"
        />

        <div className="flex flex-wrap gap-1">
          <UnifiedButton
            type="button"
            onClick={() => onCategoryFilterChange("all")}
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              categoryFilter === "all" ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-secondary text-muted-foreground"
            }`}
          >
            全部
          </UnifiedButton>
          {categoryOptions.map((category) => (
            <UnifiedButton
              key={category}
              type="button"
              onClick={() => onCategoryFilterChange(category)}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                categoryFilter === category ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-secondary text-muted-foreground"
              }`}
            >
              {category}
            </UnifiedButton>
          ))}
        </div>

        <div className="space-y-2 overflow-y-auto pr-1" style={{ minHeight: Math.max(260, skins.length * 104 + 24) }}>
          {filtered.map((skin) => {
            const selected = skin.id === selectedSkinId;
            const isDefault = skin.id === defaultSkinId;
            const isActive = skin.id === activeSkinId;
            const isHoliday = skin.id === holidaySkinId;
            const category = getSkinCategory(skin);
            const status = skin.status || "published";
            return (
              <article
                key={skin.id}
                className={`rounded-xl border p-3 transition ${
                  selected ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/5 shadow-sm" : "border-border bg-background/60"
                }`}
              >
                <UnifiedButton type="button" className="w-full text-left" onClick={() => onSelect(skin.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{skin.name}</p>
                    <div className="flex shrink-0 gap-0.5">
                      {colorDots(skin.config).map((color, index) => (
                        <span
                          key={`${skin.id}_${index}`}
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{ background: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {isActive ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">客户端日常</span> : null}
                    {isHoliday ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">节日自动</span> : null}
                    {isDefault && !isActive ? <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">默认备选</span> : null}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : status === "disabled"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-50 text-amber-700"
                    }`}>
                      {status === "published" ? "已发布" : status === "disabled" ? "已禁用" : "草稿"}
                    </span>
                    {selected ? (
                      <span className="rounded-full bg-[var(--theme-primary)]/15 px-1.5 py-0.5 text-[10px] text-[var(--theme-primary)]">编辑中</span>
                    ) : null}
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{category}</span>
                  </div>
                </UnifiedButton>
              </article>
            );
          })}

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground">没有匹配的皮肤</p>
              <UnifiedButton
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onCategoryFilterChange("all");
                }}
                className="mt-2 text-xs text-[var(--theme-primary)]"
              >
                清空筛选
              </UnifiedButton>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
