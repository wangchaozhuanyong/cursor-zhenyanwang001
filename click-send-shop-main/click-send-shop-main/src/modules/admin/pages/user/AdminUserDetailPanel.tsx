import { ArrowLeft, Copy, ShieldAlert, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  assignUserMemberLevel,
  fetchMemberLevels,
  fetchUserById,
  fetchUserStatusOverview,
  fetchUserTags,
  resetUserPassword,
  recalculateUserMemberLevel,
  setUserTags,
  toggleSubordinate,
  unbindUserWechat,
  updateUserAccountStatus,
  updateUserProfile,
  updateUserRestrictions,
  unlockUserMemberLevel,
} from "@/services/admin/userService";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import PermissionGate from "@/components/admin/PermissionGate";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { toastErrorMessage } from "@/utils/errorMessage";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { AdminInputSheet } from "@/modules/admin/components/AdminInputSheet";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import type { MemberLevel, UserEditForm, UserProfile } from "@/types/user";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { Tx } from "@/components/admin/AdminText";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { useAdminT } from "@/hooks/useAdminT";
import { formatAccountStatusLabel } from "@/utils/adminUserFilters";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { formatDateTime } from "@/utils/formatDateTime";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const tabs = ["基础资料", "订单记录", "地址信息", "积分/优惠券", "收藏/浏览", "邀请/返现", "售后记录", "评论记录", "操作日志"] as const;
type TabType = (typeof tabs)[number];

function buildUserEditForm(user: UserProfile | null): UserEditForm {
  if (!user) return {};
  return {
    nickname: user.nickname,
    phone: user.phone,
    wechat: user.wechat,
    whatsapp: user.whatsapp,
    avatar: user.avatar,
    birthday: user.birthday ? String(user.birthday).slice(0, 10) : "",
    birthday_locked: !!user.birthday_locked,
  };
}

type AdminUserDetailPanelProps = {
  userId: string;
  embedded?: boolean;
  onBack?: () => void;
  onUpdated?: () => void | Promise<void>;
  enableTabTitle?: boolean;
  className?: string;
};

export default function AdminUserDetailPanel({
  userId,
  embedded = false,
  onBack,
  onUpdated,
  enableTabTitle = true,
  className,
}: AdminUserDetailPanelProps) {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const id = userId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>(tabs[0]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UserEditForm>({});
  const capabilities = useSiteCapabilities();
  const hasMemberLevelPermission = useAdminPermissionStore((s) => s.can("member_level.manage"));
  const canManageMemberLevel = capabilities.memberLevelEnabled && hasMemberLevelPermission;
  const { confirm } = useAdminConfirm();

  type ReasonPrompt =
    | { kind: "status"; status: "normal" | "disabled" | "blacklisted" }
    | { kind: "restriction"; type: "order" | "coupon" | "comment"; enabled: boolean }
    | { kind: "memberLevel"; levelId: string };

  const [reasonPrompt, setReasonPrompt] = useState<ReasonPrompt | null>(null);

  useEffect(() => {
    setTab(tabs[0]);
    setEditOpen(false);
    setEditForm({});
    setReasonPrompt(null);
  }, [id]);

  const detailQuery = useQuery({
    queryKey: adminQueryKeys.userDetail(id),
    queryFn: async () => {
      const [u, tags, memberLevels, statusSnap] = await Promise.allSettled([
        fetchUserById(id),
        fetchUserTags(),
        canManageMemberLevel ? fetchMemberLevels() : Promise.resolve([] as MemberLevel[]),
        fetchUserStatusOverview(id),
      ]);
      if (u.status === "rejected") throw u.reason;
      return {
        user: u.value,
        allTags: tags.status === "fulfilled" ? tags.value : [],
        levels: memberLevels.status === "fulfilled" ? memberLevels.value || [] : [],
        levelsLoadFailed: memberLevels.status === "rejected",
        statusOverview: statusSnap.status === "fulfilled" ? statusSnap.value || null : null,
      };
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  const user = detailQuery.data?.user ?? null;
  const allTags = detailQuery.data?.allTags ?? [];
  const levels = detailQuery.data?.levels ?? [];
  const levelsLoadFailed = detailQuery.data?.levelsLoadFailed ?? false;
  const statusOverview = detailQuery.data?.statusOverview ?? null;
  const loading = detailQuery.isLoading && !detailQuery.data;
  const loadError = detailQuery.isError ? toastErrorMessage(detailQuery.error, tText("加载用户详情失败")) : null;
  const restrictedLabel = (on: boolean) => (on ? tText("已限制") : tText("未限制"));
  const editBaseline = buildUserEditForm(user);
  const editDirty = editOpen && JSON.stringify(editForm) !== JSON.stringify(editBaseline);
  useAdminTabDirty(editDirty);

  const tabTitle = useMemo(() => {
    if (!user) return null;
    const name = user.nickname?.trim() || user.phone?.trim();
    if (name) return tText(`用户：${name}`);
    if (id) return tText(`用户 #${id}`);
    return null;
  }, [id, user, tText]);
  useAdminTabTitle(tabTitle, enableTabTitle && !loading && Boolean(user));

  const queryClientInvalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetail(id) });
    await onUpdated?.();
  };

  const applyAccountStatus = async (status: "normal" | "disabled" | "blacklisted", reason: string) => {
    await updateUserAccountStatus(id, status, reason);
    await queryClientInvalidate();
    toast.success(
      status === "normal" ? tText("账号已恢复正常") : status === "disabled" ? tText("已禁用登录（会话已失效）") : tText("已加入黑名单"),
    );
  };

  const doStatus = (status: "normal" | "disabled" | "blacklisted") => {
    if (!id) return;
    if (status === "disabled" || status === "blacklisted") {
      setReasonPrompt({ kind: "status", status });
      return;
    }
    void applyAccountStatus(status, "").catch((e) => {
      toast.error(toastErrorMessage(e, tText("状态更新失败")));
    });
  };

  const applyRestriction = async (type: "order" | "coupon" | "comment", enabled: boolean, reason: string) => {
    await updateUserRestrictions(id, {
      reason,
      orderRestricted: type === "order" ? enabled : undefined,
      couponRestricted: type === "coupon" ? enabled : undefined,
      commentRestricted: type === "comment" ? enabled : undefined,
    });
    await queryClientInvalidate();
    const typeLabel = type === "order" ? tText("下单") : type === "coupon" ? tText("领券") : tText("评论");
    toast.success(enabled ? tText(`已开启${typeLabel}限制`) : tText(`已取消${typeLabel}限制`));
  };

  const doRestriction = (type: "order" | "coupon" | "comment", enabled: boolean) => {
    if (!id) return;
    setReasonPrompt({ kind: "restriction", type, enabled });
  };

  const saveProfile = async () => {
    try {
      await updateUserProfile(id, editForm);
      setEditOpen(false);
      await queryClientInvalidate();
      toast.success(tText("资料已保存"));
    } catch (e) {
      toast.error(toastErrorMessage(e, tText("保存失败")));
    }
  };

  const doResetPassword = () => {
    if (!id) return;
    confirm({
      title: tText("确认重置密码"),
      description: tText("将为该用户生成临时密码并复制到剪贴板。"),
      confirmText: tText("重置"),
      onConfirm: async () => {
        const pwd = await resetUserPassword(id);
        await navigator.clipboard.writeText(pwd);
        toast.success(tText(`临时密码：${pwd}（已复制）`));
      },
    });
  };

  const doToggleSubordinate = () => {
    if (!id || !user) return;
    const current = Boolean(user.subordinate_enabled ?? user.subordinateEnabled);
    const nextEnabled = !current;
    confirm({
      title: nextEnabled ? tText("开启下级功能") : tText("关闭下级功能"),
      description: nextEnabled
        ? tText("开启后该用户可发展下级并参与相关返现规则。")
        : tText("关闭后该用户将无法继续发展下级。"),
      confirmText: nextEnabled ? tText("开启") : tText("关闭"),
      onConfirm: async () => {
        try {
          await toggleSubordinate(id, nextEnabled);
          await queryClientInvalidate();
          toast.success(nextEnabled ? tText("已开启下级功能") : tText("已关闭下级功能"));
        } catch (e) {
          toast.error(toastErrorMessage(e, tText("操作失败")));
        }
      },
    });
  };

  const doUnbindWechat = () => {
    if (!id || !user?.wechat_auth?.bound) return;
    confirm({
      title: tText("确认解绑微信"),
      description: tText("解绑后用户将无法使用微信登录，请确保用户已有手机号或密码登录方式。"),
      confirmText: tText("解绑"),
      danger: true,
      onConfirm: async () => {
        try {
          await unbindUserWechat(id);
          await queryClientInvalidate();
          toast.success(tText("微信已解绑"));
        } catch (e) {
          toast.error(toastErrorMessage(e, tText("解绑失败")));
        }
      },
    });
  };

  if (loading && !user) {
    return <div className={cn("p-4 text-sm text-muted-foreground", !embedded && "p-6", className)}><Tx>加载中...</Tx></div>;
  }
  if (loadError && !user) {
    return (
      <div className={cn("space-y-3 p-4", !embedded && "p-6", className)}>
        <p className="text-sm text-[var(--theme-danger)]">{loadError}</p>
        {!embedded && onBack ? (
          <UnifiedButton type="button" className="rounded border px-3 py-1.5 text-xs" onClick={onBack}><Tx>返回用户列表</Tx></UnifiedButton>
        ) : null}
      </div>
    );
  }
  if (!user) {
    return <div className={cn("p-4 text-sm text-muted-foreground", !embedded && "p-6", className)}><Tx>用户不存在</Tx></div>;
  }

  const userTagIds = new Set((user.tags || []).map((t) => t.id));
  const accountStatusRaw = statusOverview?.account_status || user.account_status || "normal";
  const accountStatusLabel = tText(formatAccountStatusLabel(accountStatusRaw));
  const memberLevelLabel = user.member_level_name || user.memberLevel?.name || tText("未设置");
  const pointsBalanceLabel = String(user.points_balance ?? user.pointsBalance ?? 0);
  const inviteCodeLabel = user.invite_code || user.inviteCode || "-";
  const subordinateEnabled = Boolean(user.subordinate_enabled ?? user.subordinateEnabled);

  const copyUserId = async () => {
    if (!user.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      toast.success(tText("用户ID已复制"));
    } catch {
      toast.error(tText("复制失败"));
    }
  };

  const couponStats = normalizeCouponStats(user.related?.coupon_stats);

  return (
    <div className={cn("space-y-4", !embedded && "p-6", className)}>
      {!embedded ? (
        <div className="flex items-center gap-3">
          {onBack ? (
            <UnifiedButton type="button" onClick={onBack} className="rounded-md border border-border p-1.5 hover:bg-secondary">
              <ArrowLeft size={16} />
            </UnifiedButton>
          ) : null}
          <h2 className="text-lg font-semibold"><Tx>用户详情</Tx></h2>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-base font-semibold">
              <UserRound size={18} />
              <span className="truncate">{user.nickname || tText("未命名用户")}</span>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <InfoItem label={tText("手机号")} value={user.phone || "-"} />
              <InfoItem label={tText("微信")} value={user.wechat || "-"} />
              <InfoItem label="WhatsApp" value={user.whatsapp || "-"} />
              <InfoItem label={tText("会员等级")} value={memberLevelLabel} />
              <InfoItem label={tText("积分余额")} value={pointsBalanceLabel} />
              <InfoItem label={tText("邀请码")} value={inviteCodeLabel} />
              <InfoItem label={tText("下级功能")} value={subordinateEnabled ? tText("已开启") : tText("未开启")} />
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <UnifiedButton type="button" onClick={() => void copyUserId()} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-secondary">
              <Copy size={12} />
              <Tx>复制用户ID</Tx>
            </UnifiedButton>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground">
              <span><Tx>操作提示</Tx></span>
              <AdminFieldHint text={tText("建议优先核对手机号、会员等级、积分余额与账号状态，再处理限制类操作")} />
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
          <InfoCard title={tText("账户状态")} value={accountStatusLabel} />
          <InfoCard title={tText("下单限制")} value={restrictedLabel(!!statusOverview?.restrictions?.order_restricted)} />
          <InfoCard title={tText("领券限制")} value={restrictedLabel(!!statusOverview?.restrictions?.coupon_restricted)} />
          <InfoCard title={tText("评论限制")} value={restrictedLabel(!!statusOverview?.restrictions?.comment_restricted)} />
        </div>
        {statusOverview?.latest_status_action ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {tText("最近状态操作")}：{statusOverview.latest_status_action.summary || "-"} / {tText("操作人")}：{statusOverview.latest_status_action.operator_name || "-"} / {tText("时间")}：{formatDateTime(statusOverview.latest_status_action.created_at)}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold"><Tx>快捷操作</Tx></h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <PermissionGate permission="user.update"><ActionBtn label={tText("编辑资料")} onClick={() => { setEditOpen(true); setEditForm(buildUserEditForm(user)); }} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={tText("重置密码")} onClick={doResetPassword} /></PermissionGate>
          {user.wechat_auth?.bound ? <PermissionGate permission="user.update"><ActionBtn label={tText("解绑微信")} onClick={doUnbindWechat} danger /></PermissionGate> : null}
          <PermissionGate permission="user.update"><ActionBtn label={subordinateEnabled ? tText("关闭下级功能") : tText("开启下级功能")} onClick={doToggleSubordinate} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={tText("禁用登录")} disabled={(statusOverview?.account_status || user.account_status) === "disabled"} onClick={() => void doStatus("disabled")} danger /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={tText("恢复账号")} disabled={(statusOverview?.account_status || user.account_status) === "normal"} onClick={() => void doStatus("normal")} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={tText("加入黑名单")} disabled={(statusOverview?.account_status || user.account_status) === "blacklisted"} onClick={() => void doStatus("blacklisted")} danger /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.order_restricted ? tText("取消下单限制") : tText("开启下单限制")} onClick={() => void doRestriction("order", !statusOverview?.restrictions?.order_restricted)} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.coupon_restricted ? tText("取消领券限制") : tText("开启领券限制")} onClick={() => void doRestriction("coupon", !statusOverview?.restrictions?.coupon_restricted)} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.comment_restricted ? tText("取消评论限制") : tText("开启评论限制")} onClick={() => void doRestriction("comment", !statusOverview?.restrictions?.comment_restricted)} /></PermissionGate>
          {canManageMemberLevel ? <ActionBtn label={tText("按规则重新计算")} onClick={async () => { try { await recalculateUserMemberLevel(id, { force: true }); await queryClientInvalidate(); toast.success(tText("会员等级已按规则重算")); } catch (e) { toast.error(toastErrorMessage(e, tText("重算失败"))); } }} /> : null}
          {canManageMemberLevel ? <ActionBtn label={tText("解除手动锁定")} disabled={!Number(user.member_level_manual_locked || 0)} onClick={async () => { try { await unlockUserMemberLevel(id); await queryClientInvalidate(); toast.success(tText("已解除手动锁定")); } catch (e) { toast.error(toastErrorMessage(e, tText("解除失败"))); } }} /> : null}
        </div>
      </section>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-xl border border-border bg-card p-2">
          {tabs.map((t) => (
            <UnifiedButton
              key={t}
              type="button"
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
              onClick={() => setTab(t)}
            >
              {tText(t)}
            </UnifiedButton>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        {tab === "基础资料" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard title={tText("昵称")} value={user.nickname || "-"} />
              <InfoCard title={tText("手机号")} value={user.phone || "-"} />
              <InfoCard title={tText("生日")} value={user.birthday ? String(user.birthday).slice(0, 10) : tText("未填写")} />
              <InfoCard title={tText("生日锁定")} value={user.birthday_locked ? tText("是") : tText("否")} />
              <InfoCard title={tText("状态")} value={accountStatusLabel} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground"><Tx>会员等级</Tx></span>
              {canManageMemberLevel && !levelsLoadFailed ? (
                <select
                  className="min-w-[12rem] rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                  value={user.member_level_id || ""}
                  onChange={(e) => {
                    const levelId = e.target.value;
                    if (levelId === (user.member_level_id || "")) return;
                    setReasonPrompt({ kind: "memberLevel", levelId });
                  }}
                >
                  {levels.filter((lv) => lv.enabled !== false).map((lv) => <option key={lv.id} value={lv.id}>{lv.name}</option>)}
                </select>
              ) : (
                <span className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{user.member_level_name || tText("未设置")}</span>
              )}
              {Number(user.member_level_manual_locked || 0) ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                  {tText("手动指定等级")}{user.member_level_manual_reason ? `：${user.member_level_manual_reason}` : ""}
                </span>
              ) : null}
              {levelsLoadFailed ? <span className="text-xs text-muted-foreground"><Tx>会员等级配置加载失败，已隐藏编辑入口</Tx></span> : null}
            </div>
          </div>
        )}

        {tab === "订单记录" && <OrderRecordList title={tText("最近订单")} rows={user.related?.recent_orders} onAll={() => navigate(`/admin/orders?userId=${user.id}`)} />}
        {tab === "地址信息" && <AddressRecordList title={tText("地址列表")} rows={user.related?.addresses} />}
        {tab === "积分/优惠券" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard title={tText("优惠券总数")} value={String(couponStats.total)} />
              <InfoCard title={tText("已使用优惠券")} value={String(couponStats.used)} />
              <InfoCard title={tText("未使用优惠券")} value={String(Math.max(couponStats.total - couponStats.used, 0))} />
            </div>
            <DataList title={tText("积分记录")} rows={user.related?.points_records} onAll={() => navigate(`/admin/marketing/points?userId=${user.id}`)} />
          </div>
        )}
        {tab === "收藏/浏览" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ProductActivityList title={tText("最近收藏")} rows={user.related?.favorite_products} timeKey="favorited_at" onAll={() => navigate(`/admin/user-favorites?userId=${user.id}`)} />
            <ProductActivityList title={tText("最近浏览")} rows={user.related?.browsing_history} timeKey="viewed_at" onAll={() => navigate(`/admin/user-history?userId=${user.id}`)} />
          </div>
        )}
        {tab === "邀请/返现" && (
          <div className="space-y-4">
            <DataList title={tText("直属邀请")} rows={user.related?.invite_relation?.direct_invites} onAll={() => navigate(`/admin/marketing/invites?keyword=${user.invite_code || ""}`)} />
            <DataList title={tText("返现记录")} rows={user.related?.cashback_records} onAll={() => navigate(`/admin/marketing/rewards?userId=${encodeURIComponent(user.id)}`)} />
          </div>
        )}
        {tab === "售后记录" && <DataList title={tText("售后记录")} rows={user.related?.after_sales} onAll={() => navigate(`/admin/returns?userId=${user.id}`)} />}
        {tab === "评论记录" && <DataList title={tText("评论记录")} rows={user.related?.review_records} onAll={() => navigate(`/admin/reviews?userId=${user.id}`)} />}
        {tab === "操作日志" && <DataList title={tText("操作日志")} rows={user.operation_logs} onAll={() => navigate(`/admin/audit-logs?objectType=user&objectId=${user.id}`)} />}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={15} /><Tx>用户标签</Tx></h3>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <UnifiedButton
              key={tag.id}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${userTagIds.has(tag.id) ? "border-transparent bg-secondary text-foreground" : "border-border text-muted-foreground hover:bg-secondary/40"}`}
              onClick={async () => {
                const ids = Array.from(userTagIds);
                const next = userTagIds.has(tag.id) ? ids.filter((x) => x !== tag.id) : [...ids, tag.id];
                await setUserTags(id, next as string[]);
                await queryClientInvalidate();
              }}
            >
              {tag.name}
            </UnifiedButton>
          ))}
        </div>
      </section>

      <AdminFormSheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditForm({});
        }}
        title={tText("编辑资料")}
        submitText={tText("保存")}
        onSubmit={saveProfile}
        size="md"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {(["nickname", "phone", "wechat", "whatsapp", "avatar"] as const).map((f) => (
            <input
              key={f}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder={f}
              value={editForm[f] || ""}
              onChange={(e) => setEditForm((s) => ({ ...s, [f]: e.target.value }))}
            />
          ))}
          <label className="text-xs text-muted-foreground sm:col-span-2">
            <Tx>生日 (YYYY-MM-DD)</Tx>
            <SegmentedDateInput className="mt-1 w-full" controlClassName="bg-background" value={editForm.birthday || ""} onChange={(birthday) => setEditForm((s) => ({ ...s, birthday }))} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={!!editForm.birthday_locked} onChange={(e) => setEditForm((s) => ({ ...s, birthday_locked: e.target.checked }))} />
            <Tx>锁定生日（用户不可自行修改）</Tx>
          </label>
        </div>
      </AdminFormSheet>

      <AdminInputSheet
        open={reasonPrompt !== null}
        onOpenChange={(next) => {
          if (!next) setReasonPrompt(null);
        }}
        title={
          reasonPrompt?.kind === "status"
            ? reasonPrompt.status === "disabled"
              ? tText("禁用登录")
              : tText("加入黑名单")
            : reasonPrompt?.kind === "restriction"
              ? reasonPrompt.enabled
                ? tText(`开启${reasonPrompt.type === "order" ? "下单" : reasonPrompt.type === "coupon" ? "领券" : "评论"}限制`)
                : tText(`取消${reasonPrompt.type === "order" ? "下单" : reasonPrompt.type === "coupon" ? "领券" : "评论"}限制`)
              : tText("手动指定会员等级")
        }
        description={reasonPrompt?.kind === "memberLevel" ? tText("可选填写原因，确认后将锁定为该等级。") : tText("请填写操作原因，将记录到操作日志。")}
        placeholder={reasonPrompt?.kind === "memberLevel" ? tText("手动指定原因（可选）") : tText("请输入操作原因")}
        required={reasonPrompt?.kind !== "memberLevel"}
        submitText={tText("确认")}
        onSubmit={async (reason) => {
          if (!reasonPrompt) return;
          try {
            if (reasonPrompt.kind === "status") {
              await applyAccountStatus(reasonPrompt.status, reason);
            } else if (reasonPrompt.kind === "restriction") {
              await applyRestriction(reasonPrompt.type, reasonPrompt.enabled, reason);
            } else {
              await assignUserMemberLevel(id, reasonPrompt.levelId, reason);
              await queryClientInvalidate();
              toast.success(tText("会员等级已手动指定并锁定"));
            }
          } catch (e) {
            toast.error(toastErrorMessage(e, tText("操作失败")));
            throw e;
          }
        }}
      />
    </div>
  );
}

function ActionBtn({ label, onClick, danger = false, disabled = false }: { label: string; onClick: () => void | Promise<void>; danger?: boolean; disabled?: boolean }) {
  return (
    <UnifiedButton
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "border-[var(--theme-danger)] text-[var(--theme-danger)] hover:bg-[var(--theme-danger)]/10" : "border-border text-foreground hover:bg-secondary"}`}
    >
      {label}
    </UnifiedButton>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div><span>{label}：</span><span className="text-foreground">{value}</span></div>;
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 break-all text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function OrderRecordList({ title, rows, onAll }: { title: string; rows?: unknown; onAll?: () => void }) {
  const list = toRecordList(rows);
  return (
    <div className="space-y-2">
      <ListHeader title={title} onAll={onAll} />
      {list.length === 0 ? (
        <EmptyList />
      ) : (
        <div className="space-y-2">
          {list.slice(0, 8).map((row, i) => (
            <OrderRecordCard key={String(row.id ?? row.order_no ?? i)} row={row} />
          ))}
          {list.length > 8 ? <ListLimitHint /> : null}
        </div>
      )}
    </div>
  );
}

function OrderRecordCard({ row }: { row: Record<string, unknown> }) {
  const { tText } = useAdminT();
  const orderNo = readText(row, ["order_no", "orderNo", "no"]) || "-";
  const orderStatus = readText(row, ["status", "order_status"]) || "pending";
  const paymentStatus = readText(row, ["payment_status", "paymentStatus"]) || "pending";
  const amount = readMoney(row, ["payable_amount", "total_amount", "amount", "paid_amount"]);
  const createdAt = formatDateValue(row.created_at);
  const paidAt = formatDateValue(row.payment_time ?? row.paid_at);
  const contactName = readText(row, ["contact_name", "shipping_name", "recipient_name", "name"]);
  const contactPhone = readText(row, ["contact_phone", "shipping_phone", "phone"]);
  const itemSummary = readText(row, ["items_summary", "title", "product_name", "summary"]);
  const note = readText(row, ["note", "remark"]);

  return (
    <article className="rounded-xl border border-border bg-background p-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground"><Tx>订单号</Tx></p>
          <p className="mt-0.5 break-all font-mono text-sm font-semibold text-foreground">#{orderNo}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <OrderStatusBadge status={orderStatus} />
          <PaymentStatusBadge status={paymentStatus} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MiniField label={tText("应付金额")} value={`RM ${amount}`} strong />
        <MiniField label={tText("下单时间")} value={createdAt} />
        <MiniField label={tText("支付时间")} value={paidAt} />
        <MiniField label={tText("收货联系")} value={joinReadable([contactName, contactPhone])} />
      </div>

      {itemSummary || note ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {itemSummary ? <MiniField label={tText("商品摘要")} value={itemSummary} /> : null}
          {note ? <MiniField label={tText("备注")} value={note} /> : null}
        </div>
      ) : null}
    </article>
  );
}

function AddressRecordList({ title, rows }: { title: string; rows?: unknown }) {
  const list = toRecordList(rows);
  return (
    <div className="space-y-2">
      <ListHeader title={title} />
      {list.length === 0 ? (
        <EmptyList />
      ) : (
        <div className="space-y-2">
          {list.slice(0, 8).map((row, i) => (
            <AddressRecordCard key={String(row.id ?? i)} row={row} />
          ))}
          {list.length > 8 ? <ListLimitHint /> : null}
        </div>
      )}
    </div>
  );
}

function AddressRecordCard({ row }: { row: Record<string, unknown> }) {
  const { tText } = useAdminT();
  const address = normalizeAddressRecord(row);
  return (
    <article className="rounded-xl border border-border bg-background p-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{address.name || tText("未填写收货人")}</p>
            {address.isDefault ? <span className="rounded-full bg-[var(--theme-primary)]/10 px-2 py-0.5 text-[11px] text-[var(--theme-primary)]"><Tx>默认地址</Tx></span> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{address.phone || tText("未填写电话")}</p>
        </div>
        <p className="text-xs text-muted-foreground">{address.createdAt}</p>
      </div>

      <div className="mt-3 rounded-lg border border-border/70 bg-secondary/30 p-3">
        <p className="text-[11px] text-muted-foreground"><Tx>完整地址</Tx></p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{address.fullAddress || tText("未填写地址")}</p>
      </div>
    </article>
  );
}

function DataList({ title, rows, onAll }: { title: string; rows?: unknown; onAll?: () => void }) {
  const list = toRecordList(rows);
  return (
    <div className="space-y-2">
      <ListHeader title={title} onAll={onAll} />
      {list.length === 0 ? (
        <EmptyList />
      ) : (
        <div className="space-y-2">
          {list.slice(0, 8).map((row, i) => (
            <article key={String(row.id ?? i)} className="rounded-lg border border-border bg-background p-3 text-xs leading-5 text-foreground">
              <p className="break-all">{toReadableText(row)}</p>
            </article>
          ))}
          {list.length > 8 ? <ListLimitHint /> : null}
        </div>
      )}
    </div>
  );
}

function ProductActivityList({ title, rows, timeKey, onAll }: { title: string; rows?: unknown; timeKey: "favorited_at" | "viewed_at"; onAll?: () => void }) {
  const list = toRecordList(rows);
  return (
    <div className="space-y-2">
      <ListHeader title={title} onAll={onAll} />
      {list.length === 0 ? (
        <EmptyList />
      ) : (
        <div className="space-y-2">
          {list.slice(0, 6).map((row, i) => {
            const product = (row.product && typeof row.product === "object" ? row.product : row) as Record<string, unknown>;
            const image = readText(product, ["cover_image", "image_url"]);
            return (
              <article key={String(row.id ?? product.id ?? i)} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 rounded-lg border border-border bg-background p-3 text-xs">
                <div className="h-[52px] w-[52px] overflow-hidden rounded-lg border border-border bg-secondary">
                  {image ? <img src={image} alt={readText(product, ["name"]) || title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground"><Tx>无图</Tx></div>}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 font-medium text-foreground">{readText(product, ["name"]) || "-"}</p>
                  <p className="mt-1 font-semibold text-[var(--theme-price)]">RM {readMoney(product, ["price", "min_sku_price", "effective_price"])}</p>
                  <p className="mt-1 text-muted-foreground">{formatDateValue(row[timeKey])}</p>
                </div>
              </article>
            );
          })}
          {list.length > 6 ? <ListLimitHint /> : null}
        </div>
      )}
    </div>
  );
}

function ListHeader({ title, onAll }: { title: string; onAll?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold">{title}</h4>
      {onAll ? <UnifiedButton type="button" className="text-xs text-[var(--theme-price)] hover:underline" onClick={onAll}><Tx>查看全部</Tx></UnifiedButton> : null}
    </div>
  );
}

function EmptyList() {
  return <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground"><Tx>暂无数据</Tx></div>;
}

function ListLimitHint() {
  return <p className="text-xs text-muted-foreground"><Tx>仅展示前 8 条，请点击“查看全部”</Tx></p>;
}

function MiniField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary/35 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 break-words text-sm ${strong ? "font-semibold text-[var(--theme-price)]" : "text-foreground"}`}>{value || "-"}</p>
    </div>
  );
}

function toReadableText(row: Record<string, unknown>) {
  if (!row || typeof row !== "object") return String(row ?? "-");
  const priority = ["order_no", "title", "status", "amount", "created_at", "updated_at", "remark", "reason", "name", "nickname", "phone"];
  const hiddenKeys = new Set(["id", "user_id", "operator_id", "object_id", "payment_order_id", "order_id"]);
  const keys = [
    ...priority.filter((k) => k in row),
    ...Object.keys(row).filter((k) => !priority.includes(k) && !hiddenKeys.has(k) && !k.endsWith("_id")),
  ].slice(0, 8);
  if (keys.length === 0) {
    const fallbackKeys = Object.keys(row).filter((k) => !hiddenKeys.has(k)).slice(0, 3);
    if (fallbackKeys.length === 0) return "-";
    return fallbackKeys.map((k) => `${k}: ${formatCell(row[k])}`).join(" | ");
  }
  return keys.map((k) => `${k}: ${formatCell(row[k])}`).join(" | ");
}

function formatCell(v: unknown) {
  if (v == null || v === "") return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function toRecordList(rows: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row));
}

function readText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readMoney(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const raw = row[key];
    if (raw === null || raw === undefined || raw === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value.toFixed(2);
  }
  return "0.00";
}

function formatDateValue(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "-";
  return formatDateTime(value);
}

function joinReadable(parts: Array<string | undefined>): string {
  const text = parts.map((item) => item?.trim()).filter(Boolean);
  return text.length ? text.join(" · ") : "-";
}

function joinAddressParts(parts: Array<string | undefined>): string {
  return parts.map((item) => item?.trim()).filter(Boolean).join(" · ");
}

function normalizeAddressRecord(row: Record<string, unknown>) {
  const payload = parseAddressPayload(row.address);
  const source = { ...payload, ...row };
  const line1 = readText(source, ["line1", "address_line1"]);
  const line2 = readText(source, ["line2", "address_line2"]);
  const city = readText(source, ["city"]);
  const state = readText(source, ["state"]);
  const postcode = readText(source, ["postcode", "postal_code", "zip"]);
  const country = readText(source, ["country"]);
  const plainAddress = typeof row.address === "string" && !row.address.startsWith("__MYADDR_V1__") ? row.address.trim() : "";
  const fullAddress = joinAddressParts([line1, line2, joinAddressParts([postcode, city]), state, country]) || plainAddress;

  return {
    name: readText(source, ["recipient_name", "name", "receiver_name", "contact_name"]),
    phone: readText(source, ["phone", "recipient_phone", "contact_phone"]),
    fullAddress,
    createdAt: formatDateValue(row.created_at),
    isDefault: readBool(source, ["is_default", "isDefault"]),
  };
}

function parseAddressPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  const raw = value.trim();
  if (!raw.startsWith("__MYADDR_V1__")) return {};
  try {
    const parsed = JSON.parse(raw.slice("__MYADDR_V1__".length));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readBool(row: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const value = row[key];
    if (value === true || value === 1 || value === "1" || value === "true") return true;
  }
  return false;
}

function normalizeCouponStats(stats: unknown) {
  if (!stats || typeof stats !== "object") {
    return { total: 0, used: 0 };
  }
  const source = stats as { total?: unknown; used?: unknown };
  return {
    total: Number(source.total || 0),
    used: Number(source.used || 0),
  };
}
