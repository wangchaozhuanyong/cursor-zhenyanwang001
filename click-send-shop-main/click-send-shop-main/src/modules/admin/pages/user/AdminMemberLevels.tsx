import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as userService from "@/services/admin/userService";
import type { MemberLevelPayload } from "@/services/admin/userService";
import type { MemberLevel } from "@/types/user";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { LoadingButton } from "@/modules/micro-interactions";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { THEME_BORDER_DANGER_SOFT, THEME_TEXT_DANGER } from "@/utils/themeVisuals";

type Draft = Omit<MemberLevel, "id" | "created_at" | "updated_at"> & {
  id?: string;
  discount_rate?: number;
  points_multiplier?: number;
  free_shipping_enabled?: boolean;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  min_spent: 0,
  min_orders: 0,
  discount_rate: 1,
  points_multiplier: 1,
  free_shipping_enabled: false,
  sort_order: 0,
  enabled: true,
  is_default: false,
};

function toPayload(draft: Draft): MemberLevelPayload {
  return {
    name: String(draft.name || "").trim(),
    description: String(draft.description || "").trim(),
    min_spent: Number(draft.min_spent ?? 0),
    min_orders: Number(draft.min_orders ?? 0),
    discount_rate: Number(draft.discount_rate ?? 1),
    points_multiplier: Number(draft.points_multiplier ?? 1),
    free_shipping_enabled: draft.free_shipping_enabled === true,
    sort_order: Number(draft.sort_order ?? 0),
    enabled: draft.enabled !== false,
    is_default: draft.is_default === true,
  };
}

function validateDraft(draft: Draft) {
  const payload = toPayload(draft);
  if (!payload.name) return "等级名称不能为空";
  if (payload.min_spent < 0) return "累计消费不能小于 0";
  if (payload.min_orders < 0) return "累计订单不能小于 0";
  if (payload.discount_rate <= 0 || payload.discount_rate > 1) return "折扣率必须在 0.01 - 1 之间";
  if (payload.points_multiplier < 0 || payload.points_multiplier > 10) return "积分倍率必须在 0 - 10 之间";
  if (!Number.isInteger(payload.sort_order)) return "排序值必须为整数";
  if (payload.is_default && !payload.enabled) return "默认等级必须启用";
  return "";
}

export default function AdminMemberLevels() {
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const [levels, setLevels] = useState<MemberLevel[]>([]);
  const [newLevel, setNewLevel] = useState<Draft>(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberLevel | null>(null);

  const levelsQuery = useQuery({
    queryKey: adminQueryKeys.memberLevels(),
    queryFn: userService.fetchMemberLevels,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (levelsQuery.data) setLevels(levelsQuery.data);
  }, [levelsQuery.data]);

  const invalidateLevels = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.memberLevelsRoot() }),
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.usersRoot(), "member-levels"] }),
    ]);
  };

  const recalculateMutation = useMutation({
    mutationFn: (force?: boolean) => userService.recalculateAllMemberLevels(force ? { force: true } : undefined),
    onSuccess: (result, force) => {
      toast.success(
        force
          ? `强制重算完成：${result?.changed || 0}/${result?.total || 0}`
          : `重算完成：${result?.changed || 0}/${result?.total || 0}，跳过锁定 ${result?.skippedLocked || 0}`,
      );
    },
    onError: (error) => toast.error(toastErrorMessage(error, "重算失败")),
  });

  const updateLocal = (id: string, patch: Partial<MemberLevel>) => {
    setLevels((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const loading = levelsQuery.isLoading && !levelsQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">会员等级配置</h2>
        <div className="flex flex-wrap gap-2">
          <LoadingButton
            type="button"
            variant="outline"
            state={recalculateMutation.isPending ? "loading" : "normal"}
            onClick={() => recalculateMutation.mutate(false)}
          >
            跳过锁定重算
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="outline"
            state={recalculateMutation.isPending ? "loading" : "normal"}
            onClick={() => {
              confirm({
                title: "确认强制重算",
                description: "强制重算会覆盖管理员手动指定等级，确认继续？",
                confirmText: "继续重算",
                danger: true,
                onConfirm: async () => {
                  recalculateMutation.mutate(true);
                },
              });
            }}
          >
            强制重算全部
          </LoadingButton>
        </div>
      </div>

      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
        <h3 className="mb-3 text-sm font-semibold text-foreground">新增等级</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <input value={newLevel.name || ""} onChange={(e) => setNewLevel((s) => ({ ...s, name: e.target.value }))} placeholder="等级名称" className="rounded border px-2 py-1" />
          <input value={newLevel.description || ""} onChange={(e) => setNewLevel((s) => ({ ...s, description: e.target.value }))} placeholder="描述" className="rounded border px-2 py-1" />
          <input type="number" value={newLevel.min_spent || 0} onChange={(e) => setNewLevel((s) => ({ ...s, min_spent: Number(e.target.value) }))} placeholder="累计消费" className="rounded border px-2 py-1" />
          <input type="number" value={newLevel.min_orders || 0} onChange={(e) => setNewLevel((s) => ({ ...s, min_orders: Number(e.target.value) }))} placeholder="累计订单" className="rounded border px-2 py-1" />
          <input type="number" step="0.01" value={newLevel.discount_rate || 1} onChange={(e) => setNewLevel((s) => ({ ...s, discount_rate: Number(e.target.value) }))} placeholder="折扣率" className="rounded border px-2 py-1" />
          <input type="number" step="0.01" value={newLevel.points_multiplier || 1} onChange={(e) => setNewLevel((s) => ({ ...s, points_multiplier: Number(e.target.value) }))} placeholder="积分倍率" className="rounded border px-2 py-1" />
          <input type="number" step="1" value={newLevel.sort_order || 0} onChange={(e) => setNewLevel((s) => ({ ...s, sort_order: Number(e.target.value) }))} placeholder="排序" className="rounded border px-2 py-1" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newLevel.free_shipping_enabled || false} onChange={(e) => setNewLevel((s) => ({ ...s, free_shipping_enabled: e.target.checked }))} />免邮</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newLevel.enabled !== false} onChange={(e) => setNewLevel((s) => ({ ...s, enabled: e.target.checked, is_default: e.target.checked ? s.is_default : false }))} />启用</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newLevel.is_default || false} onChange={(e) => setNewLevel((s) => ({ ...s, is_default: e.target.checked, enabled: e.target.checked ? true : s.enabled }))} />默认等级</label>
        </div>
        <LoadingButton
          className="mt-3"
          type="button"
          variant="gold"
          state={savingId === "new" ? "loading" : "normal"}
          onClick={async () => {
            const err = validateDraft(newLevel);
            if (err) {
              toast.error(err);
              return;
            }
            setSavingId("new");
            try {
              await userService.createMemberLevel(toPayload(newLevel));
              setNewLevel(emptyDraft);
              await invalidateLevels();
              toast.success("已创建");
            } catch (e) {
              toast.error(toastErrorMessage(e, "创建失败"));
            } finally {
              setSavingId(null);
            }
          }}
        >
          新增
        </LoadingButton>
      </section>

      {loading ? <div>加载中...</div> : levels.map((level) => (
        <div key={level.id} className="theme-rounded space-y-2 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <div className="grid gap-2 md:grid-cols-4">
            <input value={level.name || ""} onChange={(e) => updateLocal(level.id, { name: e.target.value })} className="rounded border px-2 py-1" />
            <input value={level.description || ""} onChange={(e) => updateLocal(level.id, { description: e.target.value })} className="rounded border px-2 py-1" />
            <input type="number" value={level.min_spent || 0} onChange={(e) => updateLocal(level.id, { min_spent: Number(e.target.value) })} className="rounded border px-2 py-1" />
            <input type="number" value={level.min_orders || 0} onChange={(e) => updateLocal(level.id, { min_orders: Number(e.target.value) })} className="rounded border px-2 py-1" />
            <input type="number" step="0.01" value={level.discount_rate || 1} onChange={(e) => updateLocal(level.id, { discount_rate: Number(e.target.value) })} className="rounded border px-2 py-1" />
            <input type="number" step="0.01" value={level.points_multiplier || 1} onChange={(e) => updateLocal(level.id, { points_multiplier: Number(e.target.value) })} className="rounded border px-2 py-1" />
            <input type="number" step="1" value={level.sort_order || 0} onChange={(e) => updateLocal(level.id, { sort_order: Number(e.target.value) })} className="rounded border px-2 py-1" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!level.free_shipping_enabled} onChange={(e) => updateLocal(level.id, { free_shipping_enabled: e.target.checked })} />免邮</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={level.enabled !== false} onChange={(e) => updateLocal(level.id, { enabled: e.target.checked, is_default: e.target.checked ? level.is_default : false })} />启用</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!level.is_default} onChange={(e) => updateLocal(level.id, { is_default: e.target.checked, enabled: e.target.checked ? true : level.enabled })} />默认等级</label>
          </div>
          <div className="flex gap-2">
            <LoadingButton
              type="button"
              variant="outline"
              state={savingId === level.id ? "loading" : "normal"}
              onClick={async () => {
                const err = validateDraft(level);
                if (err) {
                  toast.error(err);
                  return;
                }
                setSavingId(level.id);
                try {
                  await userService.updateMemberLevel(level.id, toPayload(level));
                  await invalidateLevels();
                  toast.success("已保存");
                } catch (e) {
                  toast.error(toastErrorMessage(e, "保存失败"));
                } finally {
                  setSavingId(null);
                }
              }}
            >
              保存
            </LoadingButton>
            <button
              type="button"
              onClick={() => setDeleteTarget(level)}
              disabled={level.is_default === true || savingId === level.id}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-sm disabled:opacity-40 ${THEME_BORDER_DANGER_SOFT} ${THEME_TEXT_DANGER}`}
            >
              <Trash2 size={15} />
              删除
            </button>
          </div>
        </div>
      ))}

      <AnimatedConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        danger
        title="删除会员等级"
        description={deleteTarget ? `确定删除 ${deleteTarget.name}？` : ""}
        confirmText="删除"
        onConfirm={async () => {
          if (!deleteTarget) return;
          setSavingId(deleteTarget.id);
          try {
            await userService.deleteMemberLevel(deleteTarget.id);
            await invalidateLevels();
            toast.success("已删除");
            setDeleteTarget(null);
          } catch (e) {
            toast.error(toastErrorMessage(e, "删除失败"));
          } finally {
            setSavingId(null);
          }
        }}
      />
    </div>
  );
}
