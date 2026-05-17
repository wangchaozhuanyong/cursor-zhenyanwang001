import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as userService from "@/services/admin/userService";
import type { MemberLevel } from "@/types/user";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AnimatedConfirmDialog, LoadingButton } from "@/modules/micro-interactions";
import { Tx } from "@/components/admin/AdminText";

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
  const [deleteTarget, setDeleteTarget] = useState<MemberLevel | null>(null);

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
    setSavingId(level.id);
    try {
      await userService.deleteMemberLevel(level.id);
      await loadLevels();
      toast.success("已删除");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除失败"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground"><Tx>会员等级配置</Tx></h2>
        <p className="mt-1 text-sm text-muted-foreground"><Tx>
          订单支付完成后，系统根据用户「累计已支付金额」与「累计已支付订单笔数」判断是否满足某一等级；满足</Tx><strong><Tx>任意一个</Tx></strong><Tx>门槛即视为达标该等级。
        </Tx></p>
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)]/80 p-4 text-xs leading-relaxed text-muted-foreground theme-shadow">
        <p className="font-semibold text-foreground"><Tx>字段说明</Tx></p>
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li><span className="text-foreground"><Tx>等级名称 / 说明</Tx></span><Tx>：仅展示用；说明可写升级条件文案，便于运营与会员理解。</Tx></li>
          <li>
            <span className="text-foreground"><Tx>累计消费 (RM)</Tx></span><Tx>：用户历史已支付订单金额合计达到该值即满足本等级（与订单笔数为「或」关系）。
          </Tx></li>
          <li>
            <span className="text-foreground"><Tx>累计订单 (笔)</Tx></span><Tx>：用户历史已支付订单笔数达到该值即满足本等级（与消费金额为「或」关系）。
          </Tx></li>
          <li>
            <span className="text-foreground"><Tx>排序权重</Tx></span><Tx>：不参与门槛计算。用于两件事——①本页列表按权重从小到大排列；②若用户</Tx><strong><Tx>同时满足多个等级</Tx></strong><Tx>，系统会选中</Tx><strong><Tx>排序权重更大</Tx></strong><Tx>的那一个作为当前等级（权重相同时再比消费门槛、订单门槛）。
          </Tx></li>
          <li><span className="text-foreground"><Tx>启用</Tx></span><Tx>：关闭后该等级不参与自动升级。</Tx></li>
          <li><span className="text-foreground"><Tx>默认</Tx></span><Tx>：新用户或未达任何启用等级时的兜底等级；仅能设一个为默认。</Tx></li>
        </ul>
      </div>

      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
        <h3 className="mb-3 text-sm font-semibold text-foreground"><Tx>新增等级</Tx></h3>
        <div className="grid gap-3 lg:grid-cols-[1fr_1.6fr_130px_110px_100px_auto] lg:items-end">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground"><Tx>等级名称</Tx></span>
            <input value={newLevel.name} onChange={(e) => setNewLevel((s) => ({ ...s, name: e.target.value }))} placeholder="如：钻石会员" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground"><Tx>说明（可选）</Tx></span>
            <input value={newLevel.description} onChange={(e) => setNewLevel((s) => ({ ...s, description: e.target.value }))} placeholder="面向会员展示的升级说明" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground"><Tx>累计消费 (RM)</Tx></span>
            <input type="number" min={0} value={newLevel.min_spent} onChange={(e) => setNewLevel((s) => ({ ...s, min_spent: Number(e.target.value) }))} placeholder="0" title="累计已支付金额达此值即达标（与订单笔数为「或」）" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground"><Tx>累计订单 (笔)</Tx></span>
            <input type="number" min={0} value={newLevel.min_orders} onChange={(e) => setNewLevel((s) => ({ ...s, min_orders: Number(e.target.value) }))} placeholder="0" title="累计已支付订单笔数达此值即达标（与消费金额为「或」）" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground"><Tx>排序权重</Tx></span>
            <input type="number" value={newLevel.sort_order} onChange={(e) => setNewLevel((s) => ({ ...s, sort_order: Number(e.target.value) }))} placeholder="0" title="数字越大，同时达标多个等级时越优先；本页列表按此值升序排列" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
          </div>
          <LoadingButton
            type="button"
            variant="gold"
            state={savingId === "new" ? "loading" : "normal"}
            loadingText="新增中..."
            disabled={savingId === "new"}
            onClick={() => void handleCreate()}
            className="inline-flex h-[42px] self-end rounded-lg px-4 text-sm font-semibold"
          ><Tx>
            新增
          </Tx></LoadingButton>
        </div>
      </section>

      <section className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
              <div className="grid gap-3 lg:grid-cols-[1fr_1.6fr_130px_110px_100px_160px]">
                <div className="skeleton-base skeleton-shimmer h-10 rounded-lg" />
                <div className="skeleton-base skeleton-shimmer h-10 rounded-lg" />
                <div className="skeleton-base skeleton-shimmer h-10 rounded-lg" />
              </div>
            </div>
          ))
          : null}
        {!loading && levels.map((level) => (
          <div key={level.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.6fr_130px_110px_100px_160px] lg:items-end">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground"><Tx>等级名称</Tx></span>
                <input value={level.name || ""} onChange={(e) => updateLocal(level.id, { name: e.target.value })} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground outline-none" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground"><Tx>说明</Tx></span>
                <input value={level.description || ""} onChange={(e) => updateLocal(level.id, { description: e.target.value })} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground"><Tx>累计消费 (RM)</Tx></span>
                <input type="number" min={0} value={level.min_spent ?? 0} onChange={(e) => updateLocal(level.id, { min_spent: Number(e.target.value) })} title="与累计订单为「或」关系" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground"><Tx>累计订单 (笔)</Tx></span>
                <input type="number" min={0} value={level.min_orders ?? 0} onChange={(e) => updateLocal(level.id, { min_orders: Number(e.target.value) })} title="与累计消费为「或」关系" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground"><Tx>排序权重</Tx></span>
                <input type="number" value={level.sort_order ?? 0} onChange={(e) => updateLocal(level.id, { sort_order: Number(e.target.value) })} title="同时达标多个等级时，数值越大越优先" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none" />
              </div>
              <div className="flex flex-wrap items-center gap-3 pb-0.5 text-sm lg:self-end">
                <label className="inline-flex items-center gap-1.5 text-muted-foreground"><input type="checkbox" checked={level.enabled !== false} onChange={(e) => updateLocal(level.id, { enabled: e.target.checked })} /><Tx>启用</Tx></label>
                <label className="inline-flex items-center gap-1.5 text-muted-foreground"><input type="checkbox" checked={level.is_default === true} onChange={(e) => updateLocal(level.id, { is_default: e.target.checked })} /><Tx>默认</Tx></label>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                规则：累计消费满 RM {Number(level.min_spent || 0).toFixed(2)} <strong className="text-foreground"><Tx>或</Tx></strong> 累计已支付订单满 {level.min_orders || 0} 笔；排序权重 {level.sort_order ?? 0}（多等级同时达标时，权重大者优先）。
              </span>
              <div className="flex gap-2">
                <LoadingButton
                  type="button"
                  variant="outline"
                  state={savingId === level.id ? "loading" : "normal"}
                  loadingText="保存中..."
                  disabled={savingId === level.id}
                  onClick={() => void handleSave(level)}
                  className="inline-flex min-h-[36px] rounded-lg border border-[var(--theme-border)] px-3 text-sm text-foreground"
                ><Tx>
                  保存
                </Tx></LoadingButton>
                <button type="button" onClick={() => setDeleteTarget(level)} disabled={level.is_default === true || savingId === level.id} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-sm text-destructive disabled:opacity-40">
                  <Trash2 size={15} /><Tx> 删除
                </Tx></button>
              </div>
            </div>
          </div>
        ))}
      </section>
      <AnimatedConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        danger
        title="删除会员等级"
        description={deleteTarget ? `确定删除会员等级「${deleteTarget.name}」？已有用户会迁移到默认等级。` : ""}
        confirmText="删除"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
