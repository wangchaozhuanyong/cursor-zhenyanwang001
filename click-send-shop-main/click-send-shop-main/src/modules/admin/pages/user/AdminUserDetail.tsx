/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchUserById, adjustUserPoints, fetchUserTags, setUserTags, unbindUserWechat } from "@/services/admin/userService";
import { fetchAdminPointsRecords } from "@/services/admin/pointsService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { PointsRecord } from "@/types/points";
import type { UserTag } from "@/types/user";
import { productTagBadgeClass } from "@/utils/productTagBadge";
import { Tx } from "@/components/admin/AdminText";
import { AdminDetailGridSkeleton } from "@/components/admin/AdminLoadingSkeletons";

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/users");
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pointsRecords, setPointsRecords] = useState<PointsRecord[]>([]);
  const [allTags, setAllTags] = useState<UserTag[]>([]);
  const [tagSaving, setTagSaving] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pointsInput, setPointsInput] = useState("");
  const [reason, setReason] = useState("");
  const [wechatUnbinding, setWechatUnbinding] = useState(false);

  const loadUserPointsRecords = async (userId: string) => {
    setRecordsLoading(true);
    try {
      const data = await fetchAdminPointsRecords({ userId, page: 1, pageSize: 8 });
      setPointsRecords(data.list || []);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载积分流水失败"));
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchUserById(id), loadUserPointsRecords(id), fetchUserTags()])
      .then(([data, , tags]) => {
        setUser(data);
        setAllTags(tags);
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载用户详情失败")))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdjustPoints = async () => {
    const pts = parseInt(pointsInput);
    if (!pts) { toast.error("请输入积分数"); return; }
    try {
      await adjustUserPoints(id!, pts, reason || "管理员调整");
      setUser((u: any) => u ? { ...u, points_balance: (u.points_balance || 0) + pts } : u);
      await loadUserPointsRecords(id!);
      toast.success(`积分已${pts > 0 ? "增加" : "扣减"} ${Math.abs(pts)}`);
      setPointsInput("");
      setReason("");
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    }
  };

  const handleToggleTag = async (tagId: string) => {
    const currentTags = Array.isArray(user?.tags) ? user.tags as UserTag[] : [];
    const currentIds = currentTags.map((tag) => tag.id);
    const nextIds = currentIds.includes(tagId) ? currentIds.filter((id) => id !== tagId) : [...currentIds, tagId];
    setTagSaving(true);
    try {
      const nextTags = await setUserTags(id!, nextIds);
      setUser((u: any) => u ? { ...u, tags: nextTags } : u);
      toast.success("用户标签已更新");
    } catch (e) {
      toast.error(toastErrorMessage(e, "更新标签失败"));
    } finally {
      setTagSaving(false);
    }
  };

  const userTags = user && Array.isArray(user.tags) ? user.tags as UserTag[] : [];
  const userTagIds = new Set(userTags.map((tag) => tag.id));
  const wechatAuth = user?.wechat_auth as {
    bound?: boolean;
    nickname?: string | null;
    avatar_url?: string | null;
    openid?: string;
    unionid?: string | null;
    appid?: string | null;
    bound_at?: string;
  } | undefined;

  const handleAdminUnbindWechat = async () => {
    if (!id) return;
    setWechatUnbinding(true);
    try {
      await unbindUserWechat(id);
      const data = await fetchUserById(id);
      setUser(data);
      toast.success("微信已解绑");
    } catch (e) {
      toast.error(toastErrorMessage(e, "解绑失败"));
    } finally {
      setWechatUnbinding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack}>
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground"><Tx>用户详情</Tx></h2>
      </div>

      {loading && <AdminDetailGridSkeleton />}

      {!loading && !user && (
        <div className="py-16 text-center text-muted-foreground">
          <p><Tx>用户不存在</Tx></p>
          <button type="button" onClick={goBack} className="mt-4 text-[var(--theme-price)] underline"><Tx>返回</Tx></button>
        </div>
      )}

      {!loading && user && (
      <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="theme-shadow rounded-xl border border-[var(--theme-border)] bg-theme-surface p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground"><Tx>基本信息</Tx></h3>
          <div className="flex items-center gap-4">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--theme-price)] text-xl font-bold text-[var(--theme-price-foreground)]">
                {(user.nickname || user.phone || "U")[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{user.nickname || user.phone}</p>
              {user.phone ? <p className="text-xs text-muted-foreground">手机 {user.phone}</p> : null}
            </div>
          </div>
          {[
            { label: "会员等级", value: user.member_level_name || "普通会员" },
            { label: "累计消费", value: `RM ${Number(user.totalSpent || 0).toFixed(2)}` },
            { label: "累计已支付订单", value: `${user.orderCount || 0} 笔` },
            { label: "手机号", value: user.phone || "—" },
            { label: "WhatsApp", value: user.whatsapp || "—" },
            { label: "微信", value: user.wechat || "—" },
            { label: "邀请码", value: user.invite_code || "—" },
            { label: "上级邀请码", value: user.parent_invite_code || "—" },
            { label: "注册时间", value: user.created_at ? new Date(user.created_at).toLocaleString("zh-CN") : "—" },
          ].map((r) => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="text-foreground">{r.value}</span>
            </div>
          ))}
          <div className="border-t border-[var(--theme-border)] pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground"><Tx>账号绑定</Tx></h3>
            {[
              { label: "微信绑定状态", value: wechatAuth?.bound ? "已绑定" : "未绑定" },
              { label: "微信昵称", value: wechatAuth?.nickname || "—" },
              { label: "微信应用 ID", value: wechatAuth?.appid || "—" },
              { label: "微信 OpenID", value: wechatAuth?.openid || "—" },
              { label: "微信 UnionID", value: wechatAuth?.unionid || "—" },
              {
                label: "绑定时间",
                value: wechatAuth?.bound_at ? new Date(wechatAuth.bound_at).toLocaleString("zh-CN") : "—",
              },
            ].map((r) => (
              <div key={r.label} className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground shrink-0">{r.label}</span>
                <span className="text-foreground text-right break-all">{r.value}</span>
              </div>
            ))}
            {wechatAuth?.avatar_url ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground"><Tx>微信头像</Tx></span>
                <img src={wechatAuth.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              </div>
            ) : null}
            <PermissionGate permission="user.update">
              {wechatAuth?.bound ? (
                <button
                  type="button"
                  disabled={wechatUnbinding}
                  onClick={handleAdminUnbindWechat}
                  className="rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
                >
                  {wechatUnbinding ? "解绑中…" : "解绑微信"}
                </button>
              ) : null}
            </PermissionGate>
            <p className="text-[11px] leading-relaxed text-muted-foreground"><Tx>
              若发现重复账号，请核对手机号与微信绑定记录后人工合并；系统暂未开放自动合并。
            </Tx></p>
          </div>
          <div className="border-t border-[var(--theme-border)] pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground"><Tx>用户标签</Tx></h3>
              {tagSaving && <Loader2 className="h-4 w-4 animate-spin text-[var(--theme-price)]" />}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {userTags.length ? userTags.map((tag) => (
                <span key={tag.id} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${productTagBadgeClass(tag.color)}`}>
                  {tag.name}
                </span>
              )) : <span className="text-xs text-muted-foreground"><Tx>暂无标签</Tx></span>}
            </div>
            <PermissionGate
              permission="user.update"
              fallback={<p className="text-xs text-muted-foreground"><Tx>你仅有查看权限，无法调整标签。</Tx></p>}
            >
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const active = userTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      disabled={tagSaving}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${active ? productTagBadgeClass(tag.color) : "border-[var(--theme-border)] bg-secondary text-muted-foreground"} disabled:opacity-60`}
                    >
                      {active ? "✓ " : ""}{tag.name}
                    </button>
                  );
                })}
                {allTags.length === 0 && <span className="text-xs text-muted-foreground"><Tx>请先在用户列表创建标签</Tx></span>}
              </div>
            </PermissionGate>
          </div>
        </div>

        <div className="space-y-4">
          <div className="theme-shadow rounded-xl border border-[var(--theme-border)] bg-theme-surface p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground"><Tx>积分管理</Tx></h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground"><Tx>当前积分余额</Tx></span>
              <span className="text-lg font-bold text-[var(--theme-price)]">{user.points_balance ?? 0}</span>
            </div>
            <PermissionGate
              permission="user.points"
              fallback={<p className="text-xs text-muted-foreground"><Tx>你仅有查看权限，无法调整积分。</Tx></p>}
            >
              <div className="space-y-2">
                <input
                  type="number"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  placeholder="输入积分数（正数增加，负数扣减）"
                  className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="调整原因（可选）"
                  className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button type="button" onClick={handleAdjustPoints} className="w-full rounded-lg bg-[var(--theme-price)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-price-foreground)]"><Tx>
                  确认调整
                </Tx></button>
              </div>
            </PermissionGate>
          </div>
          <div className="theme-shadow rounded-xl border border-[var(--theme-border)] bg-theme-surface p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground"><Tx>最近积分流水</Tx></h3>
              <button
                type="button"
                onClick={() => navigate(`/admin/points/records?userId=${user.id}`)}
                className="text-xs text-[var(--theme-price)] hover:underline"
              ><Tx>
                查看全部
              </Tx></button>
            </div>
            {recordsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--theme-price)]" />
              </div>
            ) : pointsRecords.length === 0 ? (
              <div className="rounded-lg bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] p-4 text-center text-sm text-theme-muted"><Tx>
                暂无积分流水
              </Tx></div>
            ) : (
              <div className="space-y-2">
                {pointsRecords.map((record) => {
                  const amount = Number(record.amount) || 0;
                  return (
                    <div key={record.id} className="flex items-center justify-between rounded-lg bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{record.description || record.action}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {record.order_no ? `订单 ${record.order_no} · ` : ""}
                          {record.created_at ? new Date(record.created_at).toLocaleString("zh-CN") : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${amount >= 0 ? "text-[var(--theme-price)]" : "text-destructive"}`}>
                          {amount > 0 ? "+" : ""}{amount}
                        </p>
                        <p className="text-[11px] text-muted-foreground">余额 {record.balance_after ?? "—"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
