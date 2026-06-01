import type { ThemeSceneTag, ThemeSkin } from "@/types/theme";
import { useThemeStudioLabel } from "@/hooks/useThemeStudioLabel";
import { SCENE_FILTER_OPTIONS, SCENE_TAG_LABELS } from "./themeStudioConstants";
import { Tx } from "@/components/admin/AdminText";
import AdminSearchInput from "@/components/admin/AdminSearchInput";

export type ThemeSkinSidebarProps = {
  skins: ThemeSkin[];
  selectedSkinId: string;
  defaultSkinId: string;
  activeSkinId?: string;
  search: string;
  sceneFilter: "all" | ThemeSceneTag;
  onSearchChange: (v: string) => void;
  onSceneFilterChange: (v: "all" | ThemeSceneTag) => void;
  onSelect: (id: string) => void;
};

function colorDots(config: ThemeSkin["config"]) {
  return [config.primaryColor, config.secondaryColor, config.accentColor, config.bgColor];
}

export default function ThemeSkinSidebar({
  skins,
  selectedSkinId,
  defaultSkinId,
  activeSkinId,
  search,
  sceneFilter,
  onSearchChange,
  onSceneFilterChange,
  onSelect,
}: ThemeSkinSidebarProps) {
  const tl = useThemeStudioLabel();
  const q = search.trim().toLowerCase();
  const filtered = skins.filter((skin) => {
    const matchScene =
      sceneFilter === "all" || skin.sceneTag === sceneFilter || (sceneFilter === "default" && skin.id === defaultSkinId);
    const matchSearch =
      !q ||
      skin.name.toLowerCase().includes(q) ||
      (skin.description || "").toLowerCase().includes(q) ||
      (skin.sceneTag && SCENE_TAG_LABELS[skin.sceneTag].toLowerCase().includes(q));
    return matchScene && matchSearch;
  });

  return (
    <aside className="w-full shrink-0 self-start rounded-2xl border border-border bg-card p-4 shadow-sm 2xl:sticky 2xl:top-24 2xl:w-[320px]">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground"><Tx>系统皮肤</Tx></p>
          <p className="mt-1 text-xs text-muted-foreground">只保留后台统一管理，不提供客户自行切换。</p>
        </div>

        <AdminSearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={tl("搜索皮肤")}
          iconSize={14}
          className="min-h-[36px] rounded-lg border border-border bg-background pl-8 pr-2 text-xs leading-4"
        />

        <div className="flex flex-wrap gap-1">
          {SCENE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSceneFilterChange(opt.id)}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                sceneFilter === opt.id ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-secondary text-muted-foreground"
              }`}
            >
              {tl(opt.label)}
            </button>
          ))}
        </div>

        <div className="space-y-2 overflow-y-auto pr-1" style={{ minHeight: Math.max(260, skins.length * 104 + 24) }}>
          {filtered.map((skin) => {
            const selected = skin.id === selectedSkinId;
            const isDefault = skin.id === defaultSkinId;
            const isActive = skin.id === activeSkinId;
            return (
              <article
                key={skin.id}
                className={`rounded-xl border p-3 transition ${
                  selected ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/5 shadow-sm" : "border-border bg-background/60"
                }`}
              >
                <button type="button" className="w-full text-left" onClick={() => onSelect(skin.id)}>
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
                    {isDefault ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700"><Tx>日常默认</Tx></span> : null}
                    {selected ? (
                      <span className="rounded-full bg-[var(--theme-primary)]/15 px-1.5 py-0.5 text-[10px] text-[var(--theme-primary)]"><Tx>编辑中</Tx></span>
                    ) : null}
                    {isActive ? <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700"><Tx>当前生效</Tx></span> : null}
                    {skin.sceneTag ? (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{tl(SCENE_TAG_LABELS[skin.sceneTag])}</span>
                    ) : null}
                  </div>
                </button>
              </article>
            );
          })}

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground"><Tx>没有匹配的皮肤</Tx></p>
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onSceneFilterChange("all");
                }}
                className="mt-2 text-xs text-[var(--theme-primary)]"
              >
                清空筛选
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
