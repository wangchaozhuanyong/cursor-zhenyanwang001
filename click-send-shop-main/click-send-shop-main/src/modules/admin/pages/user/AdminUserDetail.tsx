/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowLeft, Copy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { fetchUserById, adjustUserPoints, fetchUserTags, setUserTags, unbindUserWechat, resetUserPassword, updateUserProfile, updateUserStatus, recalculateUserMemberLevel, assignUserMemberLevel, fetchMemberLevels } from "@/services/admin/userService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import { isAbortError } from "@/utils/asyncErrors";
import type { UserTag } from "@/types/user";

const tabs = ["基础资料", "订单记录", "地址信息", "积分/优惠券", "邀请/返现", "售后记录", "评论记录", "操作日志"];

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/users");
  const { id = "" } = useParams();
  const loadSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState(tabs[0]);
  const [user, setUser] = useState<any>(null);
  const [allTags, setAllTags] = useState<UserTag[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [levels, setLevels] = useState<any[]>([]);

  const reload = useCallback(async () => {
    if (!id) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [u, tags, memberLevels] = await Promise.all([
        fetchUserById(id),
        fetchUserTags(),
        fetchMemberLevels(),
      ]);
      if (controller.signal.aborted) return;
      if (seq !== loadSeqRef.current) return;
      setUser(u);
      setAllTags(tags);
      setLevels(memberLevels || []);
    } catch (e) {
      if (seq !== loadSeqRef.current || isAbortError(e)) return;
      const msg = toastErrorMessage(e, "加载用户详情失败");
      setLoadError(msg);
      setUser(null);
      toast.error(msg);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void reload();
    return () => {
      loadSeqRef.current += 1;
      abortRef.current?.abort();
    };
  }, [id, reload]);

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

  const doStatus = async (status: string) => {
    if (!id) return;
    try {
      await updateUserStatus(id, status);
      await reload();
      toast.success("状态已更新");
    } catch (e) {
      toast.error(toastErrorMessage(e, "状态更新失败"));
    }
  };

  const saveProfile = async () => {
    if (!id) return;
    try {
      await updateUserProfile(id, editForm);
      setEditOpen(false);
      await reload();
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
        <button type="button" className="rounded border px-3 py-1.5 text-xs" onClick={goBack}>
          返回用户列表
        </button>
      </div>
    );
  }
  if (!user) return <div className="p-6">用户不存在</div>;

  const userTagIds = new Set((user.tags || []).map((t: any) => t.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack}><ArrowLeft size={18} /></button>
        <h2 className="text-lg font-semibold">用户详情</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => <button key={t} className={`rounded border px-3 py-1 text-sm ${tab === t ? "bg-secondary" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <div className="rounded border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission="user.update"><button className="rounded border px-3 py-1 text-sm" onClick={() => { setEditOpen(true); setEditForm({ nickname: user.nickname, phone: user.phone, wechat: user.wechat, whatsapp: user.whatsapp, avatar: user.avatar }); }}>编辑资料</button></PermissionGate>
          <PermissionGate permission="user.update"><button className="rounded border px-3 py-1 text-sm" onClick={doResetPassword}>重置密码</button></PermissionGate>
          <PermissionGate permission="user.update"><button className="rounded border px-3 py-1 text-sm" onClick={() => void doStatus("disabled")}>禁用登录</button></PermissionGate>
          <PermissionGate permission="user.update"><button className="rounded border px-3 py-1 text-sm" onClick={() => void doStatus("normal")}>解封</button></PermissionGate>
          <PermissionGate permission="user.update"><button className="rounded border px-3 py-1 text-sm" onClick={() => void doStatus("blacklisted")}>加入黑名单</button></PermissionGate>
          <PermissionGate permission="user.update"><button className="rounded border px-3 py-1 text-sm" onClick={() => void doStatus("order_limited")}>限制下单</button></PermissionGate>
          <PermissionGate permission="user.update"><button className="rounded border px-3 py-1 text-sm" onClick={() => void doStatus("coupon_limited")}>限制领券</button></PermissionGate>
          <PermissionGate permission="user.update"><button className="rounded border px-3 py-1 text-sm" onClick={() => void doStatus("comment_limited")}>限制评论</button></PermissionGate>
          <PermissionGate permission="member_level.manage"><button className="rounded border px-3 py-1 text-sm" onClick={async () => { try { await recalculateUserMemberLevel(id!); await reload(); toast.success("会员等级已重算"); } catch (e) { toast.error(toastErrorMessage(e, "重算失败")); } }}>重算会员等级</button></PermissionGate>
        </div>

        {tab === "基础资料" && <div className="space-y-2 text-sm"><div>昵称：{user.nickname || "-"}</div><div>手机号：{user.phone || "-"}</div><div>微信：{user.wechat || "-"}</div><div>WhatsApp：{user.whatsapp || "-"}</div><div>状态：{user.account_status || "normal"}</div><div className="flex items-center gap-2">会员等级：<select className="border rounded px-2 py-1 text-sm" value={user.member_level_id || ""} onChange={async (e) => { try { await assignUserMemberLevel(id!, e.target.value); await reload(); toast.success("会员等级已更新"); } catch (err) { toast.error(toastErrorMessage(err, "更新失败")); } }}><option value="">未设置</option>{levels.map((lv) => <option key={lv.id} value={lv.id}>{lv.name}</option>)}</select></div></div>}
        {tab === "订单记录" && <List rows={user.related?.recent_orders} onAll={() => navigate(`/admin/orders?userId=${user.id}`)} />}
        {tab === "地址信息" && <List rows={user.related?.addresses} />}
        {tab === "积分/优惠券" && <><div className="text-sm">优惠券统计：{JSON.stringify(user.related?.coupon_stats || {})}</div><List rows={user.related?.points_records} onAll={() => navigate(`/admin/points/records?userId=${user.id}`)} /></>}
        {tab === "邀请/返现" && <><List rows={user.related?.invite_relation?.direct_invites} onAll={() => navigate(`/admin/marketing/invites?keyword=${user.invite_code || ""}`)} /><List rows={user.related?.cashback_records} onAll={() => navigate(`/admin/rewards/records?userId=${user.id}`)} /></>}
        {tab === "售后记录" && <List rows={user.related?.after_sales} onAll={() => navigate(`/admin/returns?userId=${user.id}`)} />}
        {tab === "评论记录" && <List rows={user.related?.review_records} onAll={() => navigate(`/admin/reviews?keyword=${user.id}`)} />}
        {tab === "操作日志" && <List rows={user.operation_logs} onAll={() => navigate(`/admin/system/logs?objectType=user&objectId=${user.id}`)} />}

        <div className="pt-3 border-t">
          <div className="text-sm mb-2">用户标签</div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => <button key={tag.id} className={`rounded border px-2 py-1 text-xs ${userTagIds.has(tag.id) ? "bg-secondary" : ""}`} onClick={async () => {
              const ids = Array.from(userTagIds);
              const next = userTagIds.has(tag.id) ? ids.filter((x) => x !== tag.id) : [...ids, tag.id];
              const nextTags = await setUserTags(id!, next as string[]);
              setUser((u: any) => ({ ...u, tags: nextTags }));
            }}>{tag.name}</button>)}
          </div>
        </div>
      </div>

      {editOpen && <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"><div className="bg-white rounded p-4 w-full max-w-md space-y-2">
        <h3 className="font-semibold">编辑资料</h3>
        {(["nickname", "phone", "wechat", "whatsapp", "avatar"] as const).map((f) => <input key={f} className="w-full border rounded px-2 py-1" placeholder={f} value={editForm[f] || ""} onChange={(e) => setEditForm((s: any) => ({ ...s, [f]: e.target.value }))} />)}
        <div className="flex justify-end gap-2"><button className="border rounded px-3 py-1" onClick={() => setEditOpen(false)}>取消</button><button className="border rounded px-3 py-1" onClick={saveProfile}>保存</button></div>
      </div></div>}
    </div>
  );
}

function List({ rows, onAll }: { rows?: any[]; onAll?: () => void }) {
  return (
    <div className="space-y-2">
      {onAll && <button className="text-xs underline" onClick={onAll}>查看全部</button>}
      {(rows || []).length === 0 ? <div className="text-sm text-muted-foreground">暂无数据</div> : (rows || []).map((r, i) => <pre key={r.id || i} className="text-xs whitespace-pre-wrap rounded bg-secondary p-2">{JSON.stringify(r, null, 2)}</pre>)}
    </div>
  );
}

