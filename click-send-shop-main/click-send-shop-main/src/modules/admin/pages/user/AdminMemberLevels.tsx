import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as userService from "@/services/admin/userService";
import type { MemberLevel } from "@/types/user";
import { toastErrorMessage } from "@/utils/errorMessage";

type Draft = Omit<MemberLevel, "id" | "created_at" | "updated_at"> & { id?: string };

const emptyDraft: Draft = {
  name: "",
  description: "",
  min_spent: 0,
  min_orders: 0,
  sort_order: 0,
  enabled: true,
  is_default: false,
};

function toPayload(draft: Draft) {
  return {
    name: String(draft.name || "").trim(),
    description: String(draft.description || "").trim(),
    min_spent: Number(draft.min_spent || 0),
    min_orders: Number(draft.min_orders || 0),
    sort_order: Number(draft.sort_order || 0),
    enabled: draft.enabled !== false,
    is_default: draft.is_default === true,
  };
}

export default function AdminMemberLevels() {
  const [levels, setLevels] = useState<MemberLevel[]>([]);
  const [newLevel, setNewLevel] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadLevels = async () => {
    setLoading(true);
    try {
      const data = await userService.fetchMemberLevels();
      setLevels(data);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载会员等级失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLevels();
  }, []);

  const updateLocal = (id: string, patch: Partial<MemberLevel>) => {
    setLevels((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleCreate = async () => {
    if (!newLevel.name?.trim()) { toast.error("请输入等级名称"); return; }
    setSavingId("new");
    try {
      await userService.createMemberLevel(toPayload(newLevel));
      setNewLevel(emptyDraft);
      await loadLevels();
      toast.success("会员等级已创建");
    } catch (e) {
      toast.error(toastErrorMessage(e, "创建失败"));
    } finally {
      setSavingId(null);
    }
  };

  const handleSave = async (level: MemberLevel) => {
    setSavingId(level.id);
    try {
      await userService.updateMemberLevel(level.id, toPayload(level));
      await loadLevels();
      toast.success("已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (level: MemberLevel) => {
    if (!window.confirm(`确定删除会员等级「${level.name}」？已有用户会迁移到默认等级。`)) return;
    setSavingId(level.id);
    try {
      await userService.deleteMemberLevel(level.id);
      await loadLevels();
      toast.success("已删除");
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除失败"));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">会员等级配置</h2>
        <p className="mt-1 text-sm text-muted-foreground">会员支付完成后会按累计消费金额或累计已支付订单数自动升级。</p>
      </div>

      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
        <h3 className="mb-3 text-sm font-semibold text-foreground">新增等级</h3>
        <div className="grid gap-3 md:grid-cols-6">
          <input value={newLevel.name} onChange={(e) => setNewLevel((s) => ({ ...s, name: e.target.value }))} placeholder="等级名称" className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none md:col-span-1" />
          <input value={newLevel.description} onChange={(e) => setNewLevel((s) => ({ ...s, description: e.target.value }))} placeholder="说明" className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none md:col-span-2" />
          <input type="number" min={0} value={newLevel.min_spent} onChange={(e) => setNewLevel((s) => ({ ...s, min_spent: Number(e.target.value) }))} placeholder="累计消费 RM" className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
          <input type="number" min={0} value={newLevel.min_orders} onChange={(e) => setNewLevel((s) => ({ ...s, min_orders: Number(e.target.value) }))} placeholder="累计订单" className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
          <button type="button" onClick={handleCreate} disabled={savingId === "new"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-[var(--theme-price-foreground)] disabled:opacity-60">
            {savingId === "new" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 新增
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {levels.map((level) => (
          <div key={level.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.6fr_130px_110px_100px_160px] lg:items-center">
              <input value={level.name || ""} onChange={(e) => updateLocal(level.id, { name: e.target.value })} className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground outline-none" />
              <input value={level.description || ""} onChange={(e) => updateLocal(level.id, { description: e.target.value })} className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
              <input type="number" min={0} value={level.min_spent ?? 0} onChange={(e) => updateLocal(level.id, { min_spent: Number(e.target.value) })} className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
              <input type="number" min={0} value={level.min_orders ?? 0} onChange={(e) => updateLocal(level.id, { min_orders: Number(e.target.value) })} className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
              <input type="number" value={level.sort_order ?? 0} onChange={(e) => updateLocal(level.id, { sort_order: Number(e.target.value) })} className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-1.5 text-muted-foreground"><input type="checkbox" checked={level.enabled !== false} onChange={(e) => updateLocal(level.id, { enabled: e.target.checked })} />启用</label>
                <label className="inline-flex items-center gap-1.5 text-muted-foreground"><input type="checkbox" checked={level.is_default === true} onChange={(e) => updateLocal(level.id, { is_default: e.target.checked })} />默认</label>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>规则：累计消费满 RM {Number(level.min_spent || 0).toFixed(2)} 或累计已支付订单满 {level.min_orders || 0} 笔</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleSave(level)} disabled={savingId === level.id} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--theme-border)] px-3 text-sm text-foreground disabled:opacity-60">
                  {savingId === level.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} 保存
                </button>
                <button type="button" onClick={() => handleDelete(level)} disabled={level.is_default === true || savingId === level.id} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-sm text-destructive disabled:opacity-40">
                  <Trash2 size={15} /> 删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
