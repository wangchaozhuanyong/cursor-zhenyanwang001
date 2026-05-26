import { ArrowLeft, ShieldAlert, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchUserById,
  fetchUserTags,
  setUserTags,
  resetUserPassword,
  updateUserProfile,
  updateUserAccountStatus,
  updateUserRestrictions,
  fetchUserStatusOverview,
  recalculateUserMemberLevel,
  assignUserMemberLevel,
  unlockUserMemberLevel,
  fetchMemberLevels,
} from "@/services/admin/userService";
import PermissionGate from "@/components/admin/PermissionGate";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { AdminInputSheet } from "@/modules/admin/components/AdminInputSheet";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import type { MemberLevel, UserEditForm, UserProfile, UserStatusOverview, UserTag } from "@/types/user";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { formatAccountStatusLabel } from "@/utils/adminUserFilters";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";

const tabs = ["基础资料", "订单记录", "地址信息", "积分/优惠券", "邀请/返现", "售后记录", "评论记录", "操作日志"] as const;

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

export default function AdminUserDetail() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/users");
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>(tabs[0]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UserEditForm>({});
  const capabilities = useSiteCapabilities();
  const hasMemberLevelPermission = useAdminPermissionStore((s) => s.can("member_level.manage"));
  const canManageMemberLevel = capabilities.memberLevelEnabled && hasMemberLevelPermission;
  const { confirm } = useAdminConfirm();

  type ReasonPrompt =
    | { kind: "status"; status: "disabled" | "blacklisted" }
    | { kind: "restriction"; type: "order" | "coupon" | "comment"; enabled: boolean }
    | { kind: "memberLevel"; levelId: string };

  const [reasonPrompt, setReasonPrompt] = useState<ReasonPrompt | null>(null);

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
        levels: memberLevels.status === "fulfilled" ? (memberLevels.value || []) : [],
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

  const invalidateUserDetail = () =>
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetail(id) });

  const doResetPassword = () => {
    if (!id) return;
    confirm({ title: tText("确认重置密码"),
      description: tText("将为该用户生成临时密码并复制到剪贴板。"),
      confirmText: tText("重置"),
      onConfirm: async () => {
        const pwd = await resetUserPassword(id);
        await navigator.clipboard.writeText(pwd);
        toast.success(tText(`临时密码：${pwd}（已复制）`));
      },
    });
  };

  const applyAccountStatus = async (status: "normal" | "disabled" | "blacklisted", reason: string) => {
    if (!id) return;
    await updateUserAccountStatus(id, status, reason);
    await invalidateUserDetail();
    toast.success(
      status === "normal"
        ? tText("账号已恢复正常")
        : status === "disabled"
          ? tText("已禁用登录（会话已失效）")
          : tText("已加入黑名单"),
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

  const applyRestriction = async (
    type: "order" | "coupon" | "comment",
    enabled: boolean,
    reason: string,
  ) => {
    if (!id) return;
    await updateUserRestrictions(id, {
      reason,
      orderRestricted: type === "order" ? enabled : undefined,
      couponRestricted: type === "coupon" ? enabled : undefined,
      commentRestricted: type === "comment" ? enabled : undefined,
    });
    await invalidateUserDetail();
    const typeLabel =
      type === "order" ? tText("下单") : type === "coupon" ? tText("领券") : tText("评论");
    toast.success(
      enabled
        ? tText(`已开启${typeLabel}限制`)
        : tText(`已取消${typeLabel}限制`),
    );
  };

  const doRestriction = (type: "order" | "coupon" | "comment", enabled: boolean) => {
    if (!id) return;
    setReasonPrompt({ kind: "restriction", type, enabled });
  };

  const saveProfile = async () => {
    if (!id) return;
    try {
      await updateUserProfile(id, editForm);
      setEditOpen(false);
      await invalidateUserDetail();
      toast.success(tText("资料已保存"));
    } catch (e) {
      toast.error(toastErrorMessage(e, tText("保存失败")));
    }
  };

  if (loading && !user) return <div className="p-6"><Tx>加载中...</Tx></div>;
  if (loadError && !user) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-[var(--theme-danger)]">{loadError}</p>
        <button type="button" className="rounded border px-3 py-1.5 text-xs" onClick={goBack}><Tx>返回用户列表</Tx></button>
      </div>
    );
  }
  if (!user) return <div className="p-6"><Tx>用户不存在</Tx></div>;

  const userTagIds = new Set((user.tags || []).map((t) => t.id));
  const accountStatusRaw = statusOverview?.account_status || user.account_status || "normal";
  const accountStatusLabel = tText(formatAccountStatusLabel(accountStatusRaw));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} className="rounded-md border border-border p-1.5 hover:bg-secondary">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-lg font-semibold"><Tx>用户详情</Tx></h2>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-base font-semibold">
              <UserRound size={18} />
              <span className="truncate">{user.nickname || tText("未命名用户")}</span>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <InfoItem label={tText("用户ID")} value={user.id || "-"} />
              <InfoItem label={tText("手机号")} value={user.phone || "-"} />
              <InfoItem label={tText("微信")} value={user.wechat || "-"} />
              <InfoItem label="WhatsApp" value={user.whatsapp || "-"} />
              <InfoItem label={tText("账号状态")} value={accountStatusLabel} />
              <InfoItem label={tText("邀请码")} value={user.invite_code || "-"} />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground">
            <span><Tx>操作提示</Tx></span>
            <AdminFieldHint text={tText("建议优先在「基础资料」核对状态，再处理限制类操作")} />
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
            {tText("最近状态操作")}：{statusOverview.latest_status_action.summary || "-"} / {tText("操作人")}：{statusOverview.latest_status_action.operator_name || "-"} / {tText("时间")}：{statusOverview.latest_status_action.created_at || "-"}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold"><Tx>快捷操作</Tx></h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <PermissionGate permission="user.update"><ActionBtn label={tText("编辑资料")} onClick={() => { setEditOpen(true); setEditForm(buildUserEditForm(user)); }} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={tText("重置密码")} onClick={doResetPassword} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={tText("禁用登录")} disabled={(statusOverview?.account_status || user.account_status) === "disabled"} onClick={() => void doStatus("disabled")} danger /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={tText("恢复账号")} disabled={(statusOverview?.account_status || user.account_status) === "normal"} onClick={() => void doStatus("normal")} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={tText("加入黑名单")} disabled={(statusOverview?.account_status || user.account_status) === "blacklisted"} onClick={() => void doStatus("blacklisted")} danger /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.order_restricted ? tText("取消下单限制") : tText("开启下单限制")} onClick={() => void doRestriction("order", !statusOverview?.restrictions?.order_restricted)} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.coupon_restricted ? tText("取消领券限制") : tText("开启领券限制")} onClick={() => void doRestriction("coupon", !statusOverview?.restrictions?.coupon_restricted)} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.comment_restricted ? tText("取消评论限制") : tText("开启评论限制")} onClick={() => void doRestriction("comment", !statusOverview?.restrictions?.comment_restricted)} /></PermissionGate>
          {canManageMemberLevel ? <ActionBtn label={tText("按规则重新计算")} onClick={async () => { try { await recalculateUserMemberLevel(id, { force: true }); await invalidateUserDetail(); toast.success(tText("会员等级已按规则重算")); } catch (e) { toast.error(toastErrorMessage(e, tText("重算失败"))); } }} /> : null}
          {canManageMemberLevel ? <ActionBtn label={tText("解除手动锁定")} disabled={!Number(user.member_level_manual_locked || 0)} onClick={async () => { try { await unlockUserMemberLevel(id); await invalidateUserDetail(); toast.success(tText("已解除手动锁定")); } catch (e) { toast.error(toastErrorMessage(e, tText("解除失败"))); } }} /> : null}
        </div>
      </section>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-xl border border-border bg-card p-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
              onClick={() => setTab(t)}
            >
              {tText(t)}
            </button>
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
                  <option value=""><Tx>未设置</Tx></option>
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

        {tab === "订单记录" && <DataList title={tText("最近订单")} rows={user.related?.recent_orders} onAll={() => navigate(`/admin/orders?userId=${user.id}`)} />}
        {tab === "地址信息" && <DataList title={tText("地址列表")} rows={user.related?.addresses} />}
        {tab === "积分/优惠券" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              <span className="text-muted-foreground"><Tx>优惠券统计：</Tx></span>
              <span className="ml-1 break-all">{JSON.stringify(user.related?.coupon_stats || {})}</span>
            </div>
            <DataList title={tText("积分记录")} rows={user.related?.points_records} onAll={() => navigate(`/admin/marketing/points?userId=${user.id}`)} />
          </div>
        )}
        {tab === "邀请/返现" && (
          <div className="space-y-4">
            <DataList title={tText("直属邀请")} rows={user.related?.invite_relation?.direct_invites} onAll={() => navigate(`/admin/marketing/invites?keyword=${user.invite_code || ""}`)} />
            <DataList title={tText("返现记录")} rows={user.related?.cashback_records} onAll={() => navigate(`/admin/rewards/records?userId=${user.id}`)} />
          </div>
        )}
        {tab === "售后记录" && <DataList title={tText("售后记录")} rows={user.related?.after_sales} onAll={() => navigate(`/admin/returns?userId=${user.id}`)} />}
        {tab === "评论记录" && <DataList title={tText("评论记录")} rows={user.related?.review_records} onAll={() => navigate(`/admin/reviews?keyword=${user.id}`)} />}
        {tab === "操作日志" && <DataList title={tText("操作日志")} rows={user.operation_logs} onAll={() => navigate(`/admin/audit-logs?objectType=user&objectId=${user.id}`)} />}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={15} /><Tx>用户标签</Tx></h3>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${userTagIds.has(tag.id) ? "border-transparent bg-secondary text-foreground" : "border-border text-muted-foreground hover:bg-secondary/40"}`}
              onClick={async () => {
                const ids = Array.from(userTagIds);
                const next = userTagIds.has(tag.id) ? ids.filter((x) => x !== tag.id) : [...ids, tag.id];
                await setUserTags(id, next as string[]);
                await invalidateUserDetail();
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </section>

      <AdminFormSheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditForm({});
          }
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
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={editForm.birthday || ""}
              onChange={(e) => setEditForm((s) => ({ ...s, birthday: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={!!editForm.birthday_locked}
              onChange={(e) => setEditForm((s) => ({ ...s, birthday_locked: e.target.checked }))}
            />
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
                ? tText(
                    `开启${
                      reasonPrompt.type === "order" ? "下单" : reasonPrompt.type === "coupon" ? "领券" : "评论"
                    }限制`,
                  )
                : tText(
                    `取消${
                      reasonPrompt.type === "order" ? "下单" : reasonPrompt.type === "coupon" ? "领券" : "评论"
                    }限制`,
                  )
              : tText("手动指定会员等级")
        }
        description={
          reasonPrompt?.kind === "memberLevel"
            ? tText("可选填写原因，确认后将锁定为该等级。")
            : tText("请填写操作原因，将记录到操作日志。")
        }
        placeholder={
          reasonPrompt?.kind === "memberLevel" ? tText("手动指定原因（可选）") : tText("请输入操作原因")
        }
        required={reasonPrompt?.kind !== "memberLevel"}
        submitText={tText("确认")}
        onSubmit={async (reason) => {
          if (!reasonPrompt || !id) return;
          try {
            if (reasonPrompt.kind === "status") {
              await applyAccountStatus(reasonPrompt.status, reason);
            } else if (reasonPrompt.kind === "restriction") {
              await applyRestriction(reasonPrompt.type, reasonPrompt.enabled, reason);
            } else {
              await assignUserMemberLevel(id, reasonPrompt.levelId, reason);
              await invalidateUserDetail();
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
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "border-[var(--theme-danger)] text-[var(--theme-danger)] hover:bg-[var(--theme-danger)]/10" : "border-border text-foreground hover:bg-secondary"}`}
    >
      {label}
    </button>
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

function DataList({ title, rows, onAll }: { title: string; rows?: Record<string, unknown>[]; onAll?: () => void }) {
  const list = Array.isArray(rows) ? rows : [];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        {onAll ? <button type="button" className="text-xs text-[var(--theme-price)] hover:underline" onClick={onAll}><Tx>查看全部</Tx></button> : null}
      </div>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground"><Tx>暂无数据</Tx></div>
      ) : (
        <div className="space-y-2">
          {list.slice(0, 8).map((row, i) => (
            <article key={String(row.id ?? i)} className="rounded-lg border border-border bg-background p-3 text-xs leading-5 text-foreground">
              <p className="break-all">{toReadableText(row)}</p>
            </article>
          ))}
          {list.length > 8 ? <p className="text-xs text-muted-foreground"><Tx>仅展示前 8 条，请点击“查看全部”</Tx></p> : null}
        </div>
      )}
    </div>
  );
}

function toReadableText(row: Record<string, unknown>) {
  if (!row || typeof row !== "object") return String(row ?? "-");
  const priority = ["order_no", "title", "status", "amount", "created_at", "updated_at", "remark", "reason", "name", "id"];
  const keys = [...priority.filter((k) => k in row), ...Object.keys(row).filter((k) => !priority.includes(k))].slice(0, 8);
  return keys.map((k) => `${k}: ${formatCell(row[k])}`).join(" | ");
}

function formatCell(v: unknown) {
  if (v == null || v === "") return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
