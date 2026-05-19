import { MoreHorizontal, Plus, Search, Sparkles } from "lucide-react";
import type { ThemeSceneTag, ThemeSkin } from "@/types/theme";
import { useThemeStudioLabel } from "@/hooks/useThemeStudioLabel";
import { SCENE_FILTER_OPTIONS, SCENE_TAG_LABELS } from "./themeStudioConstants";

type StarterTemplate = { id: string; label: string };

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
  onAdd: () => void;
  onCopy: (id: string) => void;
  canDeleteSkin: (id: string) => boolean;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onAddStarter?: (starterId: string) => void;
  starterQuickAdds?: StarterTemplate[];
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
  onAdd,
  onCopy,
  canDeleteSkin,
  onDelete,
  onSetDefault,
  onAddStarter,
  starterQuickAdds = [],
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
    <aside className="w-full shrink-0 rounded-2xl border border-border bg-card p-4 shadow-sm h-[calc(100vh-112px)] overflow-hidden 2xl:sticky 2xl:top-24 2xl:w-[320px]">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">皮肤库</p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-secondary"
          >
            <Plus size={12} />
            新建
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={tl("搜索皮肤")}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
        </div>

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

        {onAddStarter && starterQuickAdds.length ? (
          <div className="rounded-xl border border-dashed border-border p-2">
            <p className="mb-2 text-xs font-medium text-foreground">从模板新建</p>
            <div className="grid max-h-[220px] grid-cols-1 gap-1 overflow-y-auto pr-1">
              {starterQuickAdds.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAddStarter(item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-left text-[11px] hover:bg-secondary"
                >
                  <Sparkles size={12} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {filtered.map((skin) => {
            const selected = skin.id === selectedSkinId;
            const isDefault = skin.id === defaultSkinId;
            const isActive = skin.id === activeSkinId;
            const deletable = canDeleteSkin(skin.id);
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
                      {colorDots(skin.config).map((c, idx) => (
                        <span
                          key={`${skin.id}_${idx}`}
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{ background: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {isDefault ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">默认</span> : null}
                    {selected ? (
                      <span className="rounded-full bg-[var(--theme-primary)]/15 px-1.5 py-0.5 text-[10px] text-[var(--theme-primary)]">编辑中</span>
                    ) : null}
                    {isActive ? <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">当前生效</span> : null}
                    {skin.clientEnabled !== false ? (
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">前台可切换</span>
                    ) : null}
                    {skin.sceneTag ? (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{tl(SCENE_TAG_LABELS[skin.sceneTag])}</span>
                    ) : null}
                  </div>
                </button>

                <details className="group relative mt-2">
                  <summary className="flex h-7 w-full list-none cursor-pointer items-center justify-center gap-1 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-secondary">
                    <MoreHorizontal size={12} />
                    更多
                  </summary>
                  <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-border bg-card p-1 shadow-lg">
                    <button type="button" onClick={() => onCopy(skin.id)} className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-secondary">
                      复制
                    </button>
                    {!isDefault ? (
                      <button
                        type="button"
                        onClick={() => onSetDefault(skin.id)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-secondary"
                      >
                        设为默认
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onDelete(skin.id)}
                      disabled={!deletable}
                      className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${deletable ? "text-red-600 hover:bg-red-50" : "text-muted-foreground"}`}
                    >
                      {deletable ? "删除" : "默认皮肤不可删除"}
                    </button>
                  </div>
                </details>
              </article>
            );
          })}

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground">没有匹配的皮肤</p>
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

