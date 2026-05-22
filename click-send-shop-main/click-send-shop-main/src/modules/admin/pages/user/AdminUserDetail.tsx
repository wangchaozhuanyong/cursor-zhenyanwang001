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
import type { MemberLevel, UserEditForm, UserProfile, UserStatusOverview, UserTag } from "@/types/user";
import { adminQueryKeys } from "@/lib/adminQueryKeys";

const tabs = ["基础资料", "订单记录", "地址信息", "积分/优惠券", "邀请/返现", "售后记录", "评论记录", "操作日志"] as const;

type TabType = (typeof tabs)[number];

export default function AdminUserDetail() {
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
  const loadError = detailQuery.isError ? toastErrorMessage(detailQuery.error, "加载用户详情失败") : null;

  const invalidateUserDetail = () =>
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetail(id) });

  const doResetPassword = async () => {
    if (!id) return;
    if (!window.confirm("确认重置该用户密码？")) return;
    try {
      const pwd = await resetUserPassword(id);
      await navigator.clipboard.writeText(pwd);
      toast.success(`临时密码：${pwd}（已复制）`);
    } catch (e) {
      toast.error(toastErrorMessage(e, "重置失败"));
    }
  };

  const doStatus = async (status: "normal" | "disabled" | "blacklisted") => {
    if (!id) return;
    const needReason = status === "disabled" || status === "blacklisted";
    const reason = needReason ? window.prompt("请输入操作原因（必填）", "")?.trim() || "" : "";
    if (needReason && !reason) {
      toast.error("请填写操作原因");
      return;
    }
    try {
      await updateUserAccountStatus(id, status, reason);
      await invalidateUserDetail();
      toast.success(status === "normal" ? "账号已恢复正常" : status === "disabled" ? "已禁用登录（会话已失效）" : "已加入黑名单");
    } catch (e) {
      toast.error(toastErrorMessage(e, "状态更新失败"));
    }
  };

  const doRestriction = async (type: "order" | "coupon" | "comment", enabled: boolean) => {
    if (!id) return;
    const reason = window.prompt(`请输入${enabled ? "开启" : "取消"}限制原因（必填）`, "")?.trim() || "";
    if (!reason) {
      toast.error("请填写操作原因");
      return;
    }
    try {
      await updateUserRestrictions(id, {
        reason,
        orderRestricted: type === "order" ? enabled : undefined,
        couponRestricted: type === "coupon" ? enabled : undefined,
        commentRestricted: type === "comment" ? enabled : undefined,
      });
      await invalidateUserDetail();
      toast.success(`${enabled ? "已开启" : "已取消"}${type === "order" ? "下单" : type === "coupon" ? "领券" : "评论"}限制`);
    } catch (e) {
      toast.error(toastErrorMessage(e, "限制更新失败"));
    }
  };

  const saveProfile = async () => {
    if (!id) return;
    try {
      await updateUserProfile(id, editForm);
      setEditOpen(false);
      await invalidateUserDetail();
      toast.success("资料已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    }
  };

  if (loading && !user) return <div className="p-6">加载中...</div>;
  if (loadError && !user) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-[var(--theme-danger)]">{loadError}</p>
        <button type="button" className="rounded border px-3 py-1.5 text-xs" onClick={goBack}>返回用户列表</button>
      </div>
    );
  }
  if (!user) return <div className="p-6">用户不存在</div>;

  const userTagIds = new Set((user.tags || []).map((t) => t.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} className="rounded-md border border-border p-1.5 hover:bg-secondary">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-lg font-semibold">用户详情</h2>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-base font-semibold">
              <UserRound size={18} />
              <span className="truncate">{user.nickname || "未命名用户"}</span>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <InfoItem label="用户ID" value={user.id || "-"} />
              <InfoItem label="手机号" value={user.phone || "-"} />
              <InfoItem label="微信" value={user.wechat || "-"} />
              <InfoItem label="WhatsApp" value={user.whatsapp || "-"} />
              <InfoItem label="账号状态" value={statusOverview?.account_status || user.account_status || "normal"} />
              <InfoItem label="邀请码" value={user.invite_code || "-"} />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground">
            <span>操作提示</span>
            <AdminFieldHint text="建议优先在「基础资料」核对状态，再处理限制类操作" />
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
          <InfoCard title="账户状态" value={statusOverview?.account_status || "normal"} />
          <InfoCard title="下单限制" value={statusOverview?.restrictions?.order_restricted ? "已限制" : "未限制"} />
          <InfoCard title="领券限制" value={statusOverview?.restrictions?.coupon_restricted ? "已限制" : "未限制"} />
          <InfoCard title="评论限制" value={statusOverview?.restrictions?.comment_restricted ? "已限制" : "未限制"} />
        </div>
        {statusOverview?.latest_status_action ? (
          <p className="mt-2 text-xs text-muted-foreground">
            最近状态操作：{statusOverview.latest_status_action.summary || "-"} / 操作人：{statusOverview.latest_status_action.operator_name || "-"} / 时间：{statusOverview.latest_status_action.created_at || "-"}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">快捷操作</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <PermissionGate permission="user.update"><ActionBtn label="编辑资料" onClick={() => { setEditOpen(true); setEditForm({ nickname: user.nickname, phone: user.phone, wechat: user.wechat, whatsapp: user.whatsapp, avatar: user.avatar }); }} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label="重置密码" onClick={doResetPassword} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label="禁用登录" disabled={(statusOverview?.account_status || user.account_status) === "disabled"} onClick={() => void doStatus("disabled")} danger /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label="恢复账号" disabled={(statusOverview?.account_status || user.account_status) === "normal"} onClick={() => void doStatus("normal")} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label="加入黑名单" disabled={(statusOverview?.account_status || user.account_status) === "blacklisted"} onClick={() => void doStatus("blacklisted")} danger /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.order_restricted ? "取消下单限制" : "开启下单限制"} onClick={() => void doRestriction("order", !statusOverview?.restrictions?.order_restricted)} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.coupon_restricted ? "取消领券限制" : "开启领券限制"} onClick={() => void doRestriction("coupon", !statusOverview?.restrictions?.coupon_restricted)} /></PermissionGate>
          <PermissionGate permission="user.update"><ActionBtn label={statusOverview?.restrictions?.comment_restricted ? "取消评论限制" : "开启评论限制"} onClick={() => void doRestriction("comment", !statusOverview?.restrictions?.comment_restricted)} /></PermissionGate>
          {canManageMemberLevel ? <ActionBtn label="按规则重新计算" onClick={async () => { try { await recalculateUserMemberLevel(id, { force: true }); await invalidateUserDetail(); toast.success("会员等级已按规则重算"); } catch (e) { toast.error(toastErrorMessage(e, "重算失败")); } }} /> : null}
          {canManageMemberLevel ? <ActionBtn label="解除手动锁定" disabled={!Number(user.member_level_manual_locked || 0)} onClick={async () => { try { await unlockUserMemberLevel(id); await invalidateUserDetail(); toast.success("已解除手动锁定"); } catch (e) { toast.error(toastErrorMessage(e, "解除失败")); } }} /> : null}
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
              {t}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        {tab === "基础资料" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard title="昵称" value={user.nickname || "-"} />
              <InfoCard title="手机号" value={user.phone || "-"} />
              <InfoCard title="状态" value={user.account_status || "normal"} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">会员等级</span>
              {canManageMemberLevel && !levelsLoadFailed ? (
                <select
                  className="min-w-[12rem] rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                  value={user.member_level_id || ""}
                  onChange={async (e) => {
                    const reason = window.prompt("请输入手动指定原因（可选）", "")?.trim() || "";
                    try {
                      await assignUserMemberLevel(id, e.target.value, reason);
                      await invalidateUserDetail();
                      toast.success("会员等级已手动指定并锁定");
                    } catch (err) {
                      toast.error(toastErrorMessage(err, "更新失败"));
                    }
                  }}
                >
                  <option value="">未设置</option>
                  {levels.filter((lv) => lv.enabled !== false).map((lv) => <option key={lv.id} value={lv.id}>{lv.name}</option>)}
                </select>
              ) : (
                <span className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{user.member_level_name || "未设置"}</span>
              )}
              {Number(user.member_level_manual_locked || 0) ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                  手动指定等级{user.member_level_manual_reason ? `：${user.member_level_manual_reason}` : ""}
                </span>
              ) : null}
              {levelsLoadFailed ? <span className="text-xs text-muted-foreground">会员等级配置加载失败，已隐藏编辑入口</span> : null}
            </div>
          </div>
        )}

        {tab === "订单记录" && <DataList title="最近订单" rows={user.related?.recent_orders} onAll={() => navigate(`/admin/orders?userId=${user.id}`)} />}
        {tab === "地址信息" && <DataList title="地址列表" rows={user.related?.addresses} />}
        {tab === "积分/优惠券" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              <span className="text-muted-foreground">优惠券统计：</span>
              <span className="ml-1 break-all">{JSON.stringify(user.related?.coupon_stats || {})}</span>
            </div>
            <DataList title="积分记录" rows={user.related?.points_records} onAll={() => navigate(`/admin/points/records?userId=${user.id}`)} />
          </div>
        )}
        {tab === "邀请/返现" && (
          <div className="space-y-4">
            <DataList title="直属邀请" rows={user.related?.invite_relation?.direct_invites} onAll={() => navigate(`/admin/marketing/invites?keyword=${user.invite_code || ""}`)} />
            <DataList title="返现记录" rows={user.related?.cashback_records} onAll={() => navigate(`/admin/rewards/records?userId=${user.id}`)} />
          </div>
        )}
        {tab === "售后记录" && <DataList title="售后记录" rows={user.related?.after_sales} onAll={() => navigate(`/admin/returns?userId=${user.id}`)} />}
        {tab === "评论记录" && <DataList title="评论记录" rows={user.related?.review_records} onAll={() => navigate(`/admin/reviews?keyword=${user.id}`)} />}
        {tab === "操作日志" && <DataList title="操作日志" rows={user.operation_logs} onAll={() => navigate(`/admin/audit-logs?objectType=user&objectId=${user.id}`)} />}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={15} /> 用户标签</h3>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${userTagIds.has(tag.id) ? "border-transparent bg-secondary text-foreground" : "border-border text-muted-foreground hover:bg-secondary/40"}`}
              onClick={async () => {
                const ids = Array.from(userTagIds);
                const next = userTagIds.has(tag.id) ? ids.filter((x) => x !== tag.id) : [...ids, tag.id];
                const nextTags = await setUserTags(id, next as string[]);
                setUser((u) => (u ? { ...u, tags: nextTags } : u));
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </section>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">编辑资料</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {( ["nickname", "phone", "wechat", "whatsapp", "avatar"] as const).map((f) => (
                <input
                  key={f}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder={f}
                  value={editForm[f] || ""}
                  onChange={(e) => setEditForm((s) => ({ ...s, [f]: e.target.value }))}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm" onClick={() => setEditOpen(false)}>取消</button>
              <button className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm" onClick={saveProfile}>保存</button>
            </div>
          </div>
        </div>
      )}
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
        {onAll ? <button type="button" className="text-xs text-[var(--theme-price)] hover:underline" onClick={onAll}>查看全部</button> : null}
      </div>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">暂无数据</div>
      ) : (
        <div className="space-y-2">
          {list.slice(0, 8).map((row, i) => (
            <article key={String(row.id ?? i)} className="rounded-lg border border-border bg-background p-3 text-xs leading-5 text-foreground">
              <p className="break-all">{toReadableText(row)}</p>
            </article>
          ))}
          {list.length > 8 ? <p className="text-xs text-muted-foreground">仅展示前 8 条，请点击“查看全部”</p> : null}
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
