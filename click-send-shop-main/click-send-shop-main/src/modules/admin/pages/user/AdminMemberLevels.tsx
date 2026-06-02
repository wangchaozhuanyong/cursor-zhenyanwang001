import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import AdminFieldHint, { AdminLabelWithHint } from "@/components/admin/AdminFieldHint";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminTOptional } from "@/hooks/useAdminT";
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

const compactFieldShell =
  "flex h-9 min-w-0 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)]/70 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] transition focus-within:border-[var(--theme-primary)]/60 focus-within:ring-2 focus-within:ring-[var(--theme-primary)]/12";

const compactInputClass =
  "min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/55 disabled:cursor-not-allowed disabled:opacity-60";

function CompactInlineField({
  label,
  hint,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`${compactFieldShell} ${className}`}>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        <span className="whitespace-nowrap">{label}</span>
        {hint ? <AdminFieldHint text={hint} className="-mr-0.5" /> : null}
      </span>
      {children}
    </label>
  );
}

function CompactToggle({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)]/70 px-2 text-[11px] font-medium text-foreground transition hover:border-[var(--theme-primary)]/35">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 shrink-0 accent-[var(--theme-primary)]"
      />
      <span className="whitespace-nowrap">{label}</span>
      {hint ? <AdminFieldHint text={hint} /> : null}
    </label>
  );
}

function coerceNumberOrDefault(value: unknown, defaultValue: number) {
  if (value === "" || value === null || value === undefined) return defaultValue;
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
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
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);

  const hints = useMemo(
    () => ({
      name: L("会员等级的显示名称，例如普通会员、白银会员。", "Display name for the tier, such as Regular or Silver."),
      description: L("等级规则说明，例如累计消费 RM500 或完成 3 笔订单后可升级。", "Rule description, such as upgrade after RM500 spent or 3 completed orders."),
      min_spent: L("达到这个消费门槛后可升级或匹配到该等级。", "Upgrade or match once this spending threshold is reached."),
      min_orders: L("达到这个订单数门槛后可升级或匹配到该等级。", "Upgrade or match once this order threshold is reached."),
      discount_rate: L("商品折扣比例，取值 0.01 到 1，例如 0.9 表示 9 折。", "Discount rate, from 0.01 to 1. For example, 0.9 means 10% off."),
      points_multiplier: L("积分累计倍率，取值 0 到 10，例如 2 表示 2 倍积分。", "Points multiplier, from 0 to 10. For example, 2 means 2x points."),
      sort_order: L("等级在列表中的显示排序（整数）。", "Display order in the list (integer)."),
      free_shipping_enabled: L("勾选后该等级享受免邮权益。", "Checked tiers get free shipping."),
      enabled: L("该等级是否生效；不启用则不会参与自动匹配。", "Whether this tier is active. Disabled tiers won't be auto matched."),
      is_default: L("新注册用户默认归属等级。默认等级必须启用，且不能删除。", "Default tier for new users. The default tier must be enabled and cannot be deleted."),
      create: L("填写完毕后点击新增，创建一条新的会员等级。", "Fill the form and click Add to create a new tier."),
      save: L("保存当前这一级别的修改。", "Save the changes for this tier."),
      delete: L("删除该等级。默认等级不可删除；删除后用户会迁移到当前启用的默认等级。", "Delete this tier. The default tier cannot be deleted; users will be moved to the active default tier."),
    }),
    [L],
  );

  const validateDraft = (draft: Draft) => {
    const payload = toPayload(draft);
    if (!payload.name) return L("等级名称不能为空", "Tier name is required");
    if (!Number.isFinite(payload.min_spent)) return L("累计消费请输入有效数字", "Please enter a valid number for total spent");
    if (payload.min_spent < 0) return L("累计消费不能小于 0", "Total spent cannot be less than 0");
    if (!Number.isFinite(payload.min_orders)) return L("累计订单请输入有效数字", "Please enter a valid number for total orders");
    if (payload.min_orders < 0) return L("累计订单不能小于 0", "Total orders cannot be less than 0");
    if (!Number.isFinite(payload.discount_rate)) return L("折扣率请输入有效数字", "Please enter a valid number for discount rate");
    if (payload.discount_rate <= 0 || payload.discount_rate > 1) return L("折扣率必须在 0.01 - 1 之间", "Discount rate must be between 0.01 and 1");
    if (!Number.isFinite(payload.points_multiplier)) return L("积分倍率请输入有效数字", "Please enter a valid number for points multiplier");
    if (payload.points_multiplier < 0 || payload.points_multiplier > 10) return L("积分倍率必须在 0 - 10 之间", "Points multiplier must be between 0 and 10");
    if (!Number.isFinite(payload.sort_order)) return L("排序值请输入有效数字", "Please enter a valid number for sort order");
    if (!Number.isInteger(payload.sort_order)) return L("排序值必须是整数", "Sort order must be an integer");
    if (payload.is_default && !payload.enabled) return L("默认等级必须启用", "Default tier must be enabled");
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
        toast.success(L("全量重算已在后台启动，完成后可在操作日志查看结果", "A full recalculation has been started in the background. Check the activity log when it finishes."));
        return;
      }
      toast.success(
        force
          ? L(`强制重算完成：${result?.changed || 0}/${result?.total || 0}`, `Forced recalculation done: ${result?.changed || 0}/${result?.total || 0}`)
          : L(`重算完成：${result?.changed || 0}/${result?.total || 0}，跳过锁定 ${result?.skippedLocked || 0}`, `Recalculation done: ${result?.changed || 0}/${result?.total || 0}, skipped locked ${result?.skippedLocked || 0}`),
      );
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("重算失败", "Recalculation failed"))),
  });

  const updateLocal = (id: string, patch: Partial<Draft>) => {
    setLevels((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const loading = levelsQuery.isLoading && !levelsQuery.data;
  const levelsDirty = useMemo(() => levelsBaseline !== null && JSON.stringify(levels) !== levelsBaseline, [levels, levelsBaseline]);
  const newLevelDirty = useMemo(() => JSON.stringify(newLevel) !== EMPTY_DRAFT_SERIALIZED, [newLevel]);
  useAdminTabDirty(levelsDirty || newLevelDirty);

  return (
    <AdminPageShell
      hint={L("配置会员等级门槛、折扣和积分倍率；重算会按消费和订单数自动匹配等级。", "Configure member tier thresholds, discounts, and points multipliers. Recalculation matches tiers automatically by spending and order count.")}
      toolbar={(
        <div className="flex flex-wrap gap-2">
          <LoadingButton
            type="button"
            variant="outline"
            state={recalculateMutation.isPending ? "loading" : "normal"}
            onClick={() => recalculateMutation.mutate(false)}
          >
            {L("跳过锁定重算", "Recalculate excluding locked users")}
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="outline"
            state={recalculateMutation.isPending ? "loading" : "normal"}
            onClick={() => {
              confirm({
                title: L("确认强制重算", "Confirm forced recalculation"),
                description: L("强制重算会覆盖管理员手动指定的等级，确定继续吗？", "Forced recalculation will override manually assigned tiers. Continue?"),
                confirmText: L("继续重算", "Continue"),
                danger: true,
                onConfirm: async () => {
                  recalculateMutation.mutate(true);
                },
              });
            }}
          >
            {L("强制重算全部", "Force recalculate all")}
          </LoadingButton>
        </div>
      )}
    >
      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{L("新增等级", "Add tier")}</h3>
          <AdminFieldHint text={hints.create} size="md" />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <div>
            <AdminLabelWithHint label={L("等级名称", "Tier name")} hint={hints.name} />
            <input
              value={newLevel.name || ""}
              onChange={(e) => setNewLevel((s) => ({ ...s, name: e.target.value }))}
              placeholder={L("等级名称", "Tier name")}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <AdminLabelWithHint label={L("描述", "Description")} hint={hints.description} />
            <input
              value={newLevel.description || ""}
              onChange={(e) => setNewLevel((s) => ({ ...s, description: e.target.value }))}
              placeholder={L("描述", "Description")}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <AdminLabelWithHint label={L("累计消费", "Total spent")} hint={hints.min_spent} />
            <input
              type="number"
              value={newLevel.min_spent ?? ""}
              onChange={(e) => setNewLevel((s) => ({ ...s, min_spent: e.target.value }))}
              placeholder={L("累计消费", "Total spent")}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <AdminLabelWithHint label={L("累计订单", "Total orders")} hint={hints.min_orders} />
            <input
              type="number"
              value={newLevel.min_orders ?? ""}
              onChange={(e) => setNewLevel((s) => ({ ...s, min_orders: e.target.value }))}
              placeholder={L("累计订单", "Total orders")}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <AdminLabelWithHint label={L("折扣率", "Discount rate")} hint={hints.discount_rate} />
            <input
              type="number"
              step="0.01"
              value={newLevel.discount_rate ?? ""}
              onChange={(e) => setNewLevel((s) => ({ ...s, discount_rate: e.target.value }))}
              placeholder={L("折扣率", "Discount rate")}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <AdminLabelWithHint label={L("积分倍率", "Points multiplier")} hint={hints.points_multiplier} />
            <input
              type="number"
              step="0.01"
              value={newLevel.points_multiplier ?? ""}
              onChange={(e) => setNewLevel((s) => ({ ...s, points_multiplier: e.target.value }))}
              placeholder={L("积分倍率", "Points multiplier")}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <AdminLabelWithHint label={L("排序", "Sort order")} hint={hints.sort_order} />
            <input
              type="number"
              step="1"
              value={newLevel.sort_order ?? ""}
              onChange={(e) => setNewLevel((s) => ({ ...s, sort_order: e.target.value }))}
              placeholder={L("排序", "Sort order")}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div className="flex flex-col justify-end gap-2 pt-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newLevel.free_shipping_enabled || false}
                onChange={(e) => setNewLevel((s) => ({ ...s, free_shipping_enabled: e.target.checked }))}
              />
              {L("免邮", "Free shipping")}
              <AdminFieldHint text={hints.free_shipping_enabled} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newLevel.enabled !== false}
                onChange={(e) => setNewLevel((s) => ({ ...s, enabled: e.target.checked, is_default: e.target.checked ? s.is_default : false }))}
              />
              {L("启用", "Enabled")}
              <AdminFieldHint text={hints.enabled} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newLevel.is_default || false}
                onChange={(e) => setNewLevel((s) => ({ ...s, is_default: e.target.checked, enabled: e.target.checked ? true : s.enabled }))}
              />
              {L("默认等级", "Default tier")}
              <AdminFieldHint text={hints.is_default} />
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
              toast.success(L("已创建", "Created"));
            } catch (e) {
              toast.error(toastErrorMessage(e, L("创建失败", "Creation failed")));
            } finally {
              setSavingId(null);
            }
          }}
        >
          {L("新增", "Add")}
        </LoadingButton>
      </section>

      {loading ? (
        <div>{L("加载中...", "Loading...")}</div>
      ) : (
        levels.map((level) => (
          <div key={level.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 theme-shadow">
            <div className="grid gap-2 xl:grid-cols-[minmax(9rem,0.9fr)_minmax(13rem,1.35fr)_minmax(18rem,1.1fr)_auto]">
              <CompactInlineField label={L("等级", "Tier")} hint={hints.name}>
                <input
                  value={level.name || ""}
                  onChange={(e) => updateLocal(level.id, { name: e.target.value })}
                  className={compactInputClass}
                />
              </CompactInlineField>
              <CompactInlineField label={L("描述", "Description")} hint={hints.description}>
                <input
                  value={level.description || ""}
                  onChange={(e) => updateLocal(level.id, { description: e.target.value })}
                  className={compactInputClass}
                />
              </CompactInlineField>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CompactToggle
                  label={L("免邮", "Free shipping")}
                  hint={hints.free_shipping_enabled}
                  checked={!!level.free_shipping_enabled}
                  onChange={(checked) => updateLocal(level.id, { free_shipping_enabled: checked })}
                />
                <CompactToggle
                  label={L("启用", "Enabled")}
                  hint={hints.enabled}
                  checked={level.enabled !== false}
                  onChange={(checked) => updateLocal(level.id, { enabled: checked, is_default: checked ? level.is_default : false })}
                />
                <CompactToggle
                  label={L("默认", "Default")}
                  hint={hints.is_default}
                  checked={!!level.is_default}
                  onChange={(checked) => updateLocal(level.id, { is_default: checked, enabled: checked ? true : level.enabled })}
                />
              </div>
              <div className="flex min-w-0 justify-end">
                <AdminRowActionsMenu
                  primary={(
                    <LoadingButton
                      type="button"
                      variant="outline"
                      className="h-9 px-3 text-xs"
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
                          toast.success(L("已保存", "Saved"));
                        } catch (e) {
                          toast.error(toastErrorMessage(e, L("保存失败", "Save failed")));
                        } finally {
                          setSavingId(null);
                        }
                      }}
                    >
                      {L("保存", "Save")}
                    </LoadingButton>
                  )}
                  moreLabel={L("更多", "More")}
                  menuDisabled={savingId === level.id}
                  items={[
                    {
                      key: "delete",
                      label: L("删除", "Delete"),
                      icon: <Trash2 size={14} aria-hidden />,
                      danger: true,
                      disabled: level.is_default === true || savingId === level.id,
                      onClick: () => setDeleteTarget(level),
                    },
                  ]}
                />
              </div>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <CompactInlineField label={L("消费", "Spent")} hint={hints.min_spent}>
                <input
                  type="number"
                  value={level.min_spent ?? ""}
                  onChange={(e) => updateLocal(level.id, { min_spent: e.target.value })}
                  className={compactInputClass}
                />
              </CompactInlineField>
              <CompactInlineField label={L("订单", "Orders")} hint={hints.min_orders}>
                <input
                  type="number"
                  value={level.min_orders ?? ""}
                  onChange={(e) => updateLocal(level.id, { min_orders: e.target.value })}
                  className={compactInputClass}
                />
              </CompactInlineField>
              <CompactInlineField label={L("折扣", "Discount")} hint={hints.discount_rate}>
                <input
                  type="number"
                  step="0.01"
                  value={level.discount_rate ?? ""}
                  onChange={(e) => updateLocal(level.id, { discount_rate: e.target.value })}
                  className={compactInputClass}
                />
              </CompactInlineField>
              <CompactInlineField label={L("积分", "Points")} hint={hints.points_multiplier}>
                <input
                  type="number"
                  step="0.01"
                  value={level.points_multiplier ?? ""}
                  onChange={(e) => updateLocal(level.id, { points_multiplier: e.target.value })}
                  className={compactInputClass}
                />
              </CompactInlineField>
              <CompactInlineField label={L("排序", "Sort")} hint={hints.sort_order}>
                <input
                  type="number"
                  step="1"
                  value={level.sort_order ?? ""}
                  onChange={(e) => updateLocal(level.id, { sort_order: e.target.value })}
                  className={compactInputClass}
                />
              </CompactInlineField>
            </div>
          </div>
        ))
      )}

      <AnimatedConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        danger
        title={L("删除会员等级", "Delete member tier")}
        description={deleteTarget ? L(`确定删除 ${deleteTarget.name}？`, `Delete ${deleteTarget.name}?`) : ""}
        confirmText={L("删除", "Delete")}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setSavingId(deleteTarget.id);
          try {
            await userService.deleteMemberLevel(deleteTarget.id);
            await invalidateLevels();
            toast.success(L("已删除", "Deleted"));
            setDeleteTarget(null);
          } catch (e) {
            toast.error(toastErrorMessage(e, L("删除失败", "Delete failed")));
          } finally {
            setSavingId(null);
          }
        }}
      />
    </AdminPageShell>
  );
}
