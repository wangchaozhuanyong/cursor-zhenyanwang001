import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as userService from "@/services/admin/userService";
import type { MemberLevelPayload } from "@/services/admin/userService";
import type { MemberLevel } from "@/types/user";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AnimatedConfirmDialog, LoadingButton } from "@/modules/micro-interactions";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { THEME_BORDER_DANGER_SOFT, THEME_TEXT_DANGER } from "@/utils/themeVisuals";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminLabelWithHint } from "@/components/admin/AdminFieldHint";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";

type Draft = Omit<MemberLevel, "id" | "created_at" | "updated_at"> & {
  id?: string;
  min_spent?: string | number;
  min_orders?: string | number;
  discount_rate?: string | number;
  points_multiplier?: string | number;
  sort_order?: string | number;
  free_shipping_enabled?: boolean;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  min_spent: "0",
  min_orders: "0",
  discount_rate: "1",
  points_multiplier: "1",
  free_shipping_enabled: false,
  sort_order: "0",
  enabled: true,
  is_default: false,
};
const EMPTY_DRAFT_SERIALIZED = JSON.stringify(emptyDraft);

function coerceNumberOrDefault(value: unknown, defaultValue: number) {
  if (value === "" || value === null || value === undefined) return defaultValue;
  const n = Number(value);
  return n;
}

function toPayload(draft: Draft): MemberLevelPayload {
  return {
    name: String(draft.name || "").trim(),
    description: String(draft.description || "").trim(),
    min_spent: coerceNumberOrDefault(draft.min_spent, 0),
    min_orders: coerceNumberOrDefault(draft.min_orders, 0),
    discount_rate: coerceNumberOrDefault(draft.discount_rate, 1),
    points_multiplier: coerceNumberOrDefault(draft.points_multiplier, 1),
    free_shipping_enabled: draft.free_shipping_enabled === true,
    sort_order: coerceNumberOrDefault(draft.sort_order, 0),
    enabled: draft.enabled !== false,
    is_default: draft.is_default === true,
  };
}

export default function AdminMemberLevels() {
  const { tText } = useAdminT();
  const hints = useMemo(() => ({
    name: tText("会员等级的显示名称（如“普通会员”“白银会员”）。"),
    description: tText("等级规则说明文案（例如“累计消费 RM500 或完成 3 笔订单后可升级”。"),
    min_spent: tText("达到该金额门槛后可升级/匹配到该等级。"),
    min_orders: tText("达到该订单数门槛后可升级/匹配到该等级。"),
    discount_rate: tText("商品折扣比例，取值 0.01～1（例如 0.9 表示 9 折）。"),
    points_multiplier: tText("积分累计倍率，0～10（例如 2 表示 2 倍积分）。"),
    sort_order: tText("等级在列表中的显示排序（整数）。"),
    free_shipping_enabled: tText("勾选后该等级享受免邮权益。"),
    enabled: tText("该等级是否生效；不启用则不会参与自动匹配。"),
    is_default: tText("新注册用户默认归属等级（默认等级必须启用，且不能删除）。"),
    create: tText("填写完毕后点击「新增」创建一条新的会员等级。"),
    save: tText("保存当前这一条等级的修改。"),
    delete: tText("删除该等级（默认等级不可删除；删除时会把用户迁移到启用的默认等级）。"),
  }), [tText]);

  const validateDraft = (draft: Draft) => {
    const payload = toPayload(draft);
    if (!payload.name) return tText("等级名称不能为空");
    if (!Number.isFinite(payload.min_spent)) return tText("累计消费请输入有效数字");
    if (payload.min_spent < 0) return tText("累计消费不能小于 0");
    if (!Number.isFinite(payload.min_orders)) return tText("累计订单请输入有效数字");
    if (payload.min_orders < 0) return tText("累计订单不能小于 0");
    if (!Number.isFinite(payload.discount_rate)) return tText("折扣率请输入有效数字");
    if (payload.discount_rate <= 0 || payload.discount_rate > 1) return tText("折扣率必须在 0.01 - 1 之间");
    if (!Number.isFinite(payload.points_multiplier)) return tText("积分倍率请输入有效数字");
    if (payload.points_multiplier < 0 || payload.points_multiplier > 10) return tText("积分倍率必须在 0 - 10 之间");
    if (!Number.isFinite(payload.sort_order)) return tText("排序值请输入有效数字");
    if (!Number.isInteger(payload.sort_order)) return tText("排序值必须为整数");
    if (payload.is_default && !payload.enabled) return tText("默认等级必须启用");
    return "";
  };
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const [levels, setLevels] = useState<Draft[]>([]);
  const [newLevel, setNewLevel] = useState<Draft>(emptyDraft);
  const [levelsBaseline, setLevelsBaseline] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberLevel | null>(null);

  const levelsQuery = useQuery({
    queryKey: adminQueryKeys.memberLevels(),
    queryFn: userService.fetchMemberLevels,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!levelsQuery.data) return;
    const normalized = levelsQuery.data.map((level) => ({
      ...level,
      min_spent: String(level.min_spent ?? 0),
      min_orders: String(level.min_orders ?? 0),
      discount_rate: String(level.discount_rate ?? 1),
      points_multiplier: String(level.points_multiplier ?? 1),
      sort_order: String(level.sort_order ?? 0),
    })) satisfies Draft[];
    setLevels(normalized);
    setLevelsBaseline(JSON.stringify(normalized));
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
      if (result?.async || result?.accepted) {
        toast.success(tText("全量重算已在后台启动，完成后可在操作日志查看结果"));
        return;
      }
      toast.success(
        force
          ? tText(`强制重算完成：${result?.changed || 0}/${result?.total || 0}`)
          : tText(`重算完成：${result?.changed || 0}/${result?.total || 0}，跳过锁定 ${result?.skippedLocked || 0}`),
      );
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("重算失败"))),
  });

  const updateLocal = (id: string, patch: Partial<Draft>) => {
    setLevels((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const loading = levelsQuery.isLoading && !levelsQuery.data;
  const levelsDirty = useMemo(
    () => levelsBaseline !== null && JSON.stringify(levels) !== levelsBaseline,
    [levels, levelsBaseline],
  );
  const newLevelDirty = useMemo(
    () => JSON.stringify(newLevel) !== EMPTY_DRAFT_SERIALIZED,
    [newLevel],
  );
  useAdminTabDirty(levelsDirty || newLevelDirty);

  return (
    <AdminPageShell
      hint={<Tx>配置会员等级门槛、折扣与积分倍率；重算会按消费与订单数自动匹配等级。</Tx>}
      toolbar={(
        <div className="flex flex-wrap gap-2">
          <LoadingButton
            type="button"
            variant="outline"
            state={recalculateMutation.isPending ? "loading" : "normal"}
            onClick={() => recalculateMutation.mutate(false)}
          >
            <Tx>跳过锁定重算</Tx>
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="outline"
            state={recalculateMutation.isPending ? "loading" : "normal"}
            onClick={() => {
              confirm({ title: tText("确认强制重算"),
                description: tText("强制重算会覆盖管理员手动指定等级，确认继续？"),
                confirmText: tText("继续重算"),
                danger: true,
                onConfirm: async () => {
                  recalculateMutation.mutate(true);
                },
              });
            }}
          >
            <Tx>强制重算全部</Tx>
          </LoadingButton>
        </div>
      )}
    >
      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground"><Tx>新增等级</Tx></h3>
          <AdminFieldHint text={<Tx>{hints.create}</Tx>} size="md" />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <div>
            <AdminLabelWithHint label={<Tx>等级名称</Tx>} hint={<Tx>{hints.name}</Tx>} />
            <input value={newLevel.name || ""} onChange={(e) => setNewLevel((s) => ({ ...s, name: e.target.value }))} placeholder={tText("等级名称")} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <AdminLabelWithHint label={<Tx>描述</Tx>} hint={<Tx>{hints.description}</Tx>} />
            <input value={newLevel.description || ""} onChange={(e) => setNewLevel((s) => ({ ...s, description: e.target.value }))} placeholder={tText("描述")} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <AdminLabelWithHint label={<Tx>累计消费</Tx>} hint={<Tx>{hints.min_spent}</Tx>} />
            <input type="number" value={newLevel.min_spent ?? ""} onChange={(e) => setNewLevel((s) => ({ ...s, min_spent: e.target.value }))} placeholder={tText("累计消费")} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <AdminLabelWithHint label={<Tx>累计订单</Tx>} hint={<Tx>{hints.min_orders}</Tx>} />
            <input type="number" value={newLevel.min_orders ?? ""} onChange={(e) => setNewLevel((s) => ({ ...s, min_orders: e.target.value }))} placeholder={tText("累计订单")} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <AdminLabelWithHint label={<Tx>折扣率</Tx>} hint={<Tx>{hints.discount_rate}</Tx>} />
            <input type="number" step="0.01" value={newLevel.discount_rate ?? ""} onChange={(e) => setNewLevel((s) => ({ ...s, discount_rate: e.target.value }))} placeholder={tText("折扣率")} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <AdminLabelWithHint label={<Tx>积分倍率</Tx>} hint={<Tx>{hints.points_multiplier}</Tx>} />
            <input type="number" step="0.01" value={newLevel.points_multiplier ?? ""} onChange={(e) => setNewLevel((s) => ({ ...s, points_multiplier: e.target.value }))} placeholder={tText("积分倍率")} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <AdminLabelWithHint label={<Tx>排序</Tx>} hint={<Tx>{hints.sort_order}</Tx>} />
            <input type="number" step="1" value={newLevel.sort_order ?? ""} onChange={(e) => setNewLevel((s) => ({ ...s, sort_order: e.target.value }))} placeholder={tText("排序")} className="w-full rounded border px-2 py-1" />
          </div>
          <div className="flex flex-col justify-end gap-2 pt-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newLevel.free_shipping_enabled || false} onChange={(e) => setNewLevel((s) => ({ ...s, free_shipping_enabled: e.target.checked }))} />
              <Tx>免邮</Tx>
              <AdminFieldHint text={<Tx>{hints.free_shipping_enabled}</Tx>} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newLevel.enabled !== false} onChange={(e) => setNewLevel((s) => ({ ...s, enabled: e.target.checked, is_default: e.target.checked ? s.is_default : false }))} />
              <Tx>启用</Tx>
              <AdminFieldHint text={<Tx>{hints.enabled}</Tx>} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newLevel.is_default || false} onChange={(e) => setNewLevel((s) => ({ ...s, is_default: e.target.checked, enabled: e.target.checked ? true : s.enabled }))} />
              <Tx>默认等级</Tx>
              <AdminFieldHint text={<Tx>{hints.is_default}</Tx>} />
            </label>
          </div>
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
              toast.success(tText("已创建"));
            } catch (e) {
              toast.error(toastErrorMessage(e, tText("创建失败")));
            } finally {
              setSavingId(null);
            }
          }}
        >
          <Tx>新增</Tx>
        </LoadingButton>
      </section>

      {loading ? <div><Tx>加载中...</Tx></div> : levels.map((level) => (
        <div key={level.id} className="theme-rounded space-y-2 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <AdminLabelWithHint label={<Tx>等级名称</Tx>} hint={<Tx>{hints.name}</Tx>} />
              <input value={level.name || ""} onChange={(e) => updateLocal(level.id, { name: e.target.value })} className="w-full rounded border px-2 py-1" />
            </div>
            <div>
              <AdminLabelWithHint label={<Tx>描述</Tx>} hint={<Tx>{hints.description}</Tx>} />
              <input value={level.description || ""} onChange={(e) => updateLocal(level.id, { description: e.target.value })} className="w-full rounded border px-2 py-1" />
            </div>
            <div>
              <AdminLabelWithHint label={<Tx>累计消费</Tx>} hint={<Tx>{hints.min_spent}</Tx>} />
              <input type="number" value={level.min_spent ?? ""} onChange={(e) => updateLocal(level.id, { min_spent: e.target.value })} className="w-full rounded border px-2 py-1" />
            </div>
            <div>
              <AdminLabelWithHint label={<Tx>累计订单</Tx>} hint={<Tx>{hints.min_orders}</Tx>} />
              <input type="number" value={level.min_orders ?? ""} onChange={(e) => updateLocal(level.id, { min_orders: e.target.value })} className="w-full rounded border px-2 py-1" />
            </div>
            <div>
              <AdminLabelWithHint label={<Tx>折扣率</Tx>} hint={<Tx>{hints.discount_rate}</Tx>} />
              <input type="number" step="0.01" value={level.discount_rate ?? ""} onChange={(e) => updateLocal(level.id, { discount_rate: e.target.value })} className="w-full rounded border px-2 py-1" />
            </div>
            <div>
              <AdminLabelWithHint label={<Tx>积分倍率</Tx>} hint={<Tx>{hints.points_multiplier}</Tx>} />
              <input type="number" step="0.01" value={level.points_multiplier ?? ""} onChange={(e) => updateLocal(level.id, { points_multiplier: e.target.value })} className="w-full rounded border px-2 py-1" />
            </div>
            <div>
              <AdminLabelWithHint label={<Tx>排序</Tx>} hint={<Tx>{hints.sort_order}</Tx>} />
              <input type="number" step="1" value={level.sort_order ?? ""} onChange={(e) => updateLocal(level.id, { sort_order: e.target.value })} className="w-full rounded border px-2 py-1" />
            </div>
            <div className="flex flex-col justify-end gap-2 pt-5">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!level.free_shipping_enabled} onChange={(e) => updateLocal(level.id, { free_shipping_enabled: e.target.checked })} />
                <Tx>免邮</Tx>
                <AdminFieldHint text={<Tx>{hints.free_shipping_enabled}</Tx>} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={level.enabled !== false} onChange={(e) => updateLocal(level.id, { enabled: e.target.checked, is_default: e.target.checked ? level.is_default : false })} />
                <Tx>启用</Tx>
                <AdminFieldHint text={<Tx>{hints.enabled}</Tx>} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!level.is_default} onChange={(e) => updateLocal(level.id, { is_default: e.target.checked, enabled: e.target.checked ? true : level.enabled })} />
                <Tx>默认等级</Tx>
                <AdminFieldHint text={<Tx>{hints.is_default}</Tx>} />
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <AdminRowActionsMenu
              primary={(
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
                      toast.success(tText("已保存"));
                    } catch (e) {
                      toast.error(toastErrorMessage(e, tText("保存失败")));
                    } finally {
                      setSavingId(null);
                    }
                  }}
                >
                  <Tx>保存</Tx>
                </LoadingButton>
              )}
              moreLabel={<Tx>更多</Tx>}
              menuDisabled={savingId === level.id}
              items={[
                {
                  key: "delete",
                  label: <Tx>删除</Tx>,
                  icon: <Trash2 size={14} aria-hidden />,
                  danger: true,
                  disabled: level.is_default === true || savingId === level.id,
                  onClick: () => setDeleteTarget(level),
                },
              ]}
            />
          </div>
        </div>
      ))}

      <AnimatedConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        danger
        title={tText("删除会员等级")}
        description={deleteTarget ? tText(`确定删除 ${deleteTarget.name}？`) : ""}
        confirmText={tText("删除")}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setSavingId(deleteTarget.id);
          try {
            await userService.deleteMemberLevel(deleteTarget.id);
            await invalidateLevels();
            toast.success(tText("已删除"));
            setDeleteTarget(null);
          } catch (e) {
            toast.error(toastErrorMessage(e, tText("删除失败")));
          } finally {
            setSavingId(null);
          }
        }}
      />
    </AdminPageShell>
  );
}
