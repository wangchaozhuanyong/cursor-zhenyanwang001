import { Copy, Plus, Search, Star, Trash2 } from "lucide-react";
import type { ThemeSceneTag, ThemeSkin } from "@/types/theme";
import { SCENE_FILTER_OPTIONS, SCENE_TAG_LABELS } from "./themeStudioConstants";
import { Tx } from "@/components/admin/AdminText";

export type ThemeSkinSidebarProps = {
  skins: ThemeSkin[];
  selectedSkinId: string;
  defaultSkinId: string;
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
};

function colorDots(config: ThemeSkin["config"]) {
  return [config.primaryColor, config.secondaryColor, config.priceColor, config.bgColor];
}

export default function ThemeSkinSidebar({
  skins,
  selectedSkinId,
  defaultSkinId,
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
}: ThemeSkinSidebarProps) {
  const q = search.trim().toLowerCase();
  const filtered = skins.filter((skin) => {
    const matchScene = sceneFilter === "all" || skin.sceneTag === sceneFilter || (sceneFilter === "default" && skin.id === defaultSkinId);
    const matchSearch =
      !q ||
      skin.name.toLowerCase().includes(q) ||
      (skin.description || "").toLowerCase().includes(q) ||
      (skin.sceneTag && SCENE_TAG_LABELS[skin.sceneTag].includes(q));
    return matchScene && matchSearch;
  });

  return (
    <aside className="flex h-[calc(100vh-110px)] w-[260px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold"><Tx>皮肤列表</Tx></p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-secondary"
          >
            <Plus size={12} /><Tx>
            新建
          </Tx></button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索皮肤..."
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
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {filtered.map((skin) => {
            const selected = skin.id === selectedSkinId;
            const isDefault = skin.id === defaultSkinId;
            return (
              <div
                key={skin.id}
                className={`rounded-lg border p-2 transition ${
                  selected ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/5 shadow-sm" : "border-border"
                }`}
              >
                <button type="button" className="w-full text-left" onClick={() => onSelect(skin.id)}>
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium leading-snug">{skin.name}</p>
                    <div className="flex shrink-0 gap-0.5">
                      {colorDots(skin.config).map((c) => (
                        <span key={c} className="h-3 w-3 rounded-full border border-black/10" style={{ background: c }} title={c} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {isDefault ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800"><Tx>默认</Tx></span> : null}
                    {selected ? <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800"><Tx>编辑中</Tx></span> : null}
                    {skin.sceneTag ? (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {SCENE_TAG_LABELS[skin.sceneTag]}
                      </span>
                    ) : null}
                  </div>
                </button>
                <div className="mt-2 flex items-center gap-1">
                  {!isDefault ? (
                    <button type="button" title="设为默认" onClick={() => onSetDefault(skin.id)} className="rounded border border-border p-1 hover:bg-secondary">
                      <Star size={12} />
                    </button>
                  ) : null}
                  <button type="button" title="复制" onClick={() => onCopy(skin.id)} className="rounded border border-border p-1 hover:bg-secondary">
                    <Copy size={12} />
                  </button>
                  {canDeleteSkin(skin.id) ? (
                    <button type="button" title="删除" onClick={() => onDelete(skin.id)} className="rounded border border-border p-1 text-destructive hover:bg-destructive/10">
                      <Trash2 size={12} />
                    </button>
                  ) : (
                    <span className="rounded border border-border px-1 py-0.5 text-[10px] text-muted-foreground" title="默认皮肤不可删除"><Tx>
                      锁定
                    </Tx></span>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground"><Tx>没有匹配的皮肤</Tx></p> : null}
        </div>
      </div>
    </aside>
  );
}
