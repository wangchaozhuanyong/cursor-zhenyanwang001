import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { FooterNavEditorItem } from "@/types/content";
import { Tx } from "@/components/admin/AdminText";
import { THEME_TEXT_DANGER } from "@/utils/themeVisuals";
import { useAdminT } from "@/hooks/useAdminT";
import {
  DEFAULT_FOOTER_NAV_ITEMS,
  parseFooterNavJson,
  serializeFooterNavForSave,
} from "./footerNavUtils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type Props = {
  value: string;
  onChange: (json: string) => void;
};

export default function FooterNavEditor({ value, onChange }: Props) {
  const { tText } = useAdminT();
  const [items, setItems] = useState<FooterNavEditorItem[]>(DEFAULT_FOOTER_NAV_ITEMS);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");

  useEffect(() => {
    const { items: parsed, error } = parseFooterNavJson(value);
    if (error && String(value ?? "").trim()) {
      setParseError(error);
      setShowJson(true);
      setJsonDraft(value);
      return;
    }
    setParseError(null);
    setItems(parsed);
    setJsonDraft(serializeFooterNavForSave(parsed));
  }, [value]);

  const commitItems = (next: FooterNavEditorItem[]) => {
    const sorted = [...next]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((it, idx) => ({ ...it, sortOrder: idx + 1 }));
    setItems(sorted);
    setParseError(null);
    const json = serializeFooterNavForSave(sorted);
    onChange(json);
    setJsonDraft(json);
  };

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const updateAt = (index: number, patch: Partial<FooterNavEditorItem>) => {
    const next = sorted.map((it, i) => (i === index ? { ...it, ...patch } : it));
    commitItems(next);
  };

  const reorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const list = [...sorted];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    commitItems(list);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground"><Tx>可视化编辑页脚导航；保存分组后写入 footerNav。</Tx></p>
        <div className="flex flex-wrap gap-2">
          <UnifiedButton
            type="button"
            onClick={() => commitItems([...DEFAULT_FOOTER_NAV_ITEMS])}
            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
          >
            <Tx>恢复默认</Tx>
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={() =>
              commitItems([
                ...sorted,
                { label: "", path: "/", section: "support", enabled: true, sortOrder: sorted.length + 1 },
              ])
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
          >
            <Plus size={12} /><Tx>新增</Tx>
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={() => setShowJson((v) => !v)}
            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
          >
            {showJson ? <Tx>收起 JSON</Tx> : <Tx>高级 JSON</Tx>}
          </UnifiedButton>
        </div>
      </div>

      {parseError ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
          {parseError} — <Tx>请修正 JSON 或恢复默认</Tx>
        </p>
      ) : null}

      <div className="space-y-2">
        {sorted.map((item, idx) => (
          <div key={`footer-nav-${idx}-${item.sortOrder}`} className="rounded-xl border border-border bg-background p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr,1fr,100px,72px,auto]">
              <input
                value={item.label}
                onChange={(e) => updateAt(idx, { label: e.target.value })}
                placeholder={tText("名称")}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-[var(--theme-primary)]"
              />
              <input
                value={item.path}
                onChange={(e) => updateAt(idx, { path: e.target.value })}
                placeholder="/path"
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-[var(--theme-primary)]"
              />
              <select
                value={item.section}
                onChange={(e) => updateAt(idx, { section: e.target.value as FooterNavEditorItem["section"] })}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-[var(--theme-primary)]"
              >
                <option value="support">support</option>
                <option value="policy">policy</option>
                <option value="other">other</option>
              </select>
              <label className="inline-flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => updateAt(idx, { enabled: e.target.checked })}
                />
                <Tx>启用</Tx>
              </label>
              <div className="flex gap-1">
                <UnifiedButton
                  type="button"
                  disabled={idx === 0}
                  onClick={() => reorder(idx, idx - 1)}
                  className="rounded-lg border border-border p-1.5 disabled:opacity-40"
                >
                  <ArrowUp size={14} />
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  disabled={idx === sorted.length - 1}
                  onClick={() => reorder(idx, idx + 1)}
                  className="rounded-lg border border-border p-1.5 disabled:opacity-40"
                >
                  <ArrowDown size={14} />
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={() => commitItems(sorted.filter((_, i) => i !== idx))}
                  className={`rounded-lg border border-border p-1.5 ${THEME_TEXT_DANGER}`}
                >
                  <Trash2 size={14} />
                </UnifiedButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showJson ? (
        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ChevronDown size={14} /><Tx>原始 JSON</Tx>
          </p>
          <textarea
            rows={8}
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs outline-none focus:border-[var(--theme-primary)]"
          />
          <UnifiedButton
            type="button"
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            onClick={() => {
              const { items: parsed, error } = parseFooterNavJson(jsonDraft);
              if (error) {
                setParseError(error);
                return;
              }
              commitItems(parsed);
              setShowJson(false);
            }}
          >
            <Tx>从 JSON 导入</Tx>
          </UnifiedButton>
        </div>
      ) : (
        <UnifiedButton
          type="button"
          onClick={() => {
            setJsonDraft(serializeFooterNavForSave(sorted));
            setShowJson(true);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronRight size={14} /><Tx>展开高级 JSON 编辑</Tx>
        </UnifiedButton>
      )}
    </div>
  );
}
