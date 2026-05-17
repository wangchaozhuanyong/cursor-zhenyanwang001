import { useEffect, useLayoutEffect, useState } from "react";
import { Download, Trash2, Users } from "lucide-react";
import { AnimatedConfirmDialog, AnimatedTable, LoadingButton } from "@/modules/micro-interactions";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import * as userService from "@/services/admin/userService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import { toastErrorMessage } from "@/utils/errorMessage";
import { productTagBadgeClass } from "@/utils/productTagBadge";
import type { UserTag } from "@/types/user";

function UserTagBadges({ tags }: { tags?: UserTag[] }) {
  if (!tags?.length) return <span className="text-xs text-muted-foreground">无标签</span>;
  return <div className="flex flex-wrap gap-1">{tags.map((tag) => <span key={tag.id} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${productTagBadgeClass(tag.color)}`}>{tag.name}</span>)}</div>;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const users = useAdminUsersStore((s) => s.users);
  const total = useAdminUsersStore((s) => s.total);
  const page = useAdminUsersStore((s) => s.page);
  const pageSize = useAdminUsersStore((s) => s.pageSize);
  const loading = useAdminUsersStore((s) => s.loading);
  const search = useAdminUsersStore((s) => s.search);
  const selectedTagId = useAdminUsersStore((s) => s.selectedTagId);
  const wechatBoundFilter = useAdminUsersStore((s) => s.wechatBoundFilter);
  const phoneBoundFilter = useAdminUsersStore((s) => s.phoneBoundFilter);
  const accountStatusFilter = useAdminUsersStore((s) => s.accountStatusFilter);
  const summary = useAdminUsersStore((s) => s.summary);
  const setSearch = useAdminUsersStore((s) => s.setSearch);
  const setSelectedTagId = useAdminUsersStore((s) => s.setSelectedTagId);
  const setWechatBoundFilter = useAdminUsersStore((s) => s.setWechatBoundFilter);
  const setPhoneBoundFilter = useAdminUsersStore((s) => s.setPhoneBoundFilter);
  const setAccountStatusFilter = useAdminUsersStore((s) => s.setAccountStatusFilter);
  const setPage = useAdminUsersStore((s) => s.setPage);
  const setPageSize = useAdminUsersStore((s) => s.setPageSize);
  const loadUsers = useAdminUsersStore((s) => s.loadUsers);
  const resetUsersStore = useAdminUsersStore((s) => s.reset);
  const [tags, setTags] = useState<UserTag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("金色");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagDeleteId, setTagDeleteId] = useState<string | null>(null);

  useLayoutEffect(() => { useAdminUsersStore.setState({ loading: true }); }, []);
  useEffect(() => { loadUsers().catch((e) => toast.error(toastErrorMessage(e, "加载失败"))); }, [loadUsers]);
  useEffect(() => { userService.fetchUserTags().then(setTags).catch((e) => toast.error(toastErrorMessage(e, "加载标签失败"))); }, []);
  useEffect(() => () => resetUsersStore(), [resetUsersStore]);

  const queryBase = { keyword: search || undefined, tagId: selectedTagId || undefined, wechatBound: wechatBoundFilter || undefined, phoneBound: phoneBoundFilter || undefined, accountStatus: accountStatusFilter || undefined };

  const handleExportCsv = async () => {
    try {
      await userService.exportUsersCsv(queryBase);
      toast.success("已开始导出 CSV");
    } catch (e) { toast.error(toastErrorMessage(e, "导出失败")); }
  };

  const reloadTags = async () => setTags(await userService.fetchUserTags());

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1"><SearchBar placeholder="搜索昵称/手机号/微信/邀请码" value={search} onChange={(value) => { setSearch(value); setPage(1); loadUsers({ page: 1, keyword: value }).catch((e) => toast.error(toastErrorMessage(e, "加载失败"))); }} /></div>
        <select value={selectedTagId} onChange={(e) => { setSelectedTagId(e.target.value); setPage(1); loadUsers({ page: 1, tagId: e.target.value }).catch((er) => toast.error(toastErrorMessage(er, "加载失败"))); }} className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"><option value="">全部标签</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select>
        <select value={wechatBoundFilter} onChange={(e) => { setWechatBoundFilter(e.target.value); setPage(1); loadUsers({ page: 1, wechatBound: e.target.value }).catch((er) => toast.error(toastErrorMessage(er, "加载失败"))); }} className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"><option value="">微信绑定(全部)</option><option value="1">已绑定</option><option value="0">未绑定</option></select>
        <select value={phoneBoundFilter} onChange={(e) => { setPhoneBoundFilter(e.target.value); setPage(1); loadUsers({ page: 1, phoneBound: e.target.value }).catch((er) => toast.error(toastErrorMessage(er, "加载失败"))); }} className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"><option value="">手机号(全部)</option><option value="1">已绑定</option><option value="0">未绑定</option></select>
        <select value={accountStatusFilter} onChange={(e) => { setAccountStatusFilter(e.target.value); setPage(1); loadUsers({ page: 1, accountStatus: e.target.value }).catch((er) => toast.error(toastErrorMessage(er, "加载失败"))); }} className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"><option value="">账号状态(全部)</option><option value="normal">正常</option><option value="disabled">禁用登录</option><option value="blacklisted">黑名单</option><option value="order_limited">限制下单</option><option value="coupon_limited">限制领券</option><option value="comment_limited">限制评论</option></select>
        <PermissionGate permission="user.view"><button type="button" onClick={handleExportCsv} className="touch-manipulation flex min-h-[44px] shrink-0 items-center gap-1.5 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm"><Download size={16} /> 导出</button></PermissionGate>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[
        { label: "匹配用户数", value: String(total) },
        { label: "今日新增", value: String(summary.todayNew || 0) },
        { label: "被邀请用户", value: String(summary.invitedUsers || 0) },
      ].map((s) => <div key={s.label} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-center theme-shadow"><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>)}</div>

      <PermissionGate permission="user.update">
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <div className="flex flex-wrap gap-2 items-end">
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="新标签名称" className="min-h-[40px] rounded-lg bg-secondary px-3 py-2 text-sm" />
            <select value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="min-h-[40px] rounded-lg bg-secondary px-3 py-2 text-sm"><option>红色</option><option>绿色</option><option>蓝色</option><option>金色</option></select>
            <LoadingButton type="button" variant="gold" state={tagSaving ? "loading" : "normal"} onClick={async () => { if (!newTagName.trim()) return; setTagSaving(true); try { await userService.createUserTag({ name: newTagName.trim(), color: newTagColor }); setNewTagName(""); await reloadTags(); toast.success("标签已创建"); } catch (e) { toast.error(toastErrorMessage(e, "创建标签失败")); } finally { setTagSaving(false); } }} className="min-h-[40px] rounded-lg px-3 py-2 text-sm font-semibold">添加</LoadingButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${productTagBadgeClass(tag.color)}`}>{tag.name}<span className="opacity-70">({tag.count ?? 0})</span><button type="button" onClick={() => setTagDeleteId(tag.id)} className="ml-1 rounded-full p-0.5 hover:bg-black/10" aria-label={`删除${tag.name}`}><Trash2 size={12} /></button></span>)}</div>
        </div>
      </PermissionGate>

      <div className="hidden md:block">
        <AnimatedTable loading={loading} rows={users} rowKey={(u) => u.id} skeletonRows={8} skeletonCols={9} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto" tableClassName="min-w-[920px] w-full text-sm" theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70" thead={(<tr>{["用户", "手机号", "会员等级", "标签", "邀请码", "上级邀请码", "积分", "注册时间", "操作"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>)} footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={(nextPage) => { setPage(nextPage); loadUsers({ page: nextPage }).catch((e) => toast.error(toastErrorMessage(e, "加载失败"))); }} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); loadUsers({ page: 1, pageSize: nextPageSize }).catch((e) => toast.error(toastErrorMessage(e, "加载失败"))); }} />} emptyIcon={Users} emptyTitle="暂无用户" renderRow={(u) => (<><td className="px-4 py-3"><span className="font-medium text-foreground">{u.nickname || u.phone}</span></td><td className="px-4 py-3 text-foreground whitespace-nowrap">{u.phone}</td><td className="px-4 py-3 whitespace-nowrap">{u.member_level_name || "普通会员"}</td><td className="px-4 py-3"><UserTagBadges tags={u.tags} /></td><td className="px-4 py-3 font-mono text-xs text-foreground">{u.invite_code || "-"}</td><td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.parent_invite_code || "-"}</td><td className="px-4 py-3 text-foreground">{u.points_balance ?? 0}</td><td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleString("zh-CN") : "-"}</td><td className="px-4 py-3"><button type="button" onClick={() => navigate(`/admin/users/${u.id}`)} className="text-xs text-[var(--theme-price)] hover:underline">详情</button></td></>)} />
      </div>
      <AnimatedConfirmDialog open={!!tagDeleteId} onOpenChange={(open) => !open && setTagDeleteId(null)} danger title="删除标签" description="删除标签会移除所有用户上的该标签，确认删除？" confirmText="删除" onConfirm={async () => { if (!tagDeleteId) return; try { await userService.deleteUserTag(tagDeleteId); await reloadTags(); await loadUsers(); setTagDeleteId(null); toast.success("标签已删除"); } catch (e) { toast.error(toastErrorMessage(e, "删除失败")); } }} />
    </div>
  );
}
