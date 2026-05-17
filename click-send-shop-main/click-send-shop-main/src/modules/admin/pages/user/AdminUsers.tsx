import { useEffect, useLayoutEffect, useState } from "react";
import { Loader2, Download, Plus, Trash2, Users } from "lucide-react";
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
import { Tx } from "@/components/admin/AdminText";

function UserTagBadges({ tags }: { tags?: UserTag[] }) {
  if (!tags?.length) return <span className="text-xs text-muted-foreground"><Tx>无标签</Tx></span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag.id} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${productTagBadgeClass(tag.color)}`}>
          {tag.name}
        </span>
      ))}
    </div>
  );
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
  const setSearch = useAdminUsersStore((s) => s.setSearch);
  const setSelectedTagId = useAdminUsersStore((s) => s.setSelectedTagId);
  const setWechatBoundFilter = useAdminUsersStore((s) => s.setWechatBoundFilter);
  const setPhoneBoundFilter = useAdminUsersStore((s) => s.setPhoneBoundFilter);
  const setPage = useAdminUsersStore((s) => s.setPage);
  const setPageSize = useAdminUsersStore((s) => s.setPageSize);
  const loadUsers = useAdminUsersStore((s) => s.loadUsers);
  const resetUsersStore = useAdminUsersStore((s) => s.reset);
  const [tags, setTags] = useState<UserTag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("金色");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagDeleteId, setTagDeleteId] = useState<string | null>(null);

  useLayoutEffect(() => {
    useAdminUsersStore.setState({ loading: true });
  }, []);

  useEffect(() => {
    loadUsers().catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")));
  }, [loadUsers]);

  useEffect(() => {
    userService.fetchUserTags()
      .then(setTags)
      .catch((e) => toast.error(toastErrorMessage(e, "加载用户标签失败")));
  }, []);

  useEffect(() => () => resetUsersStore(), [resetUsersStore]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    loadUsers({ page: 1, keyword: value }).catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")));
  };

  const handleTagFilterChange = (value: string) => {
    setSelectedTagId(value);
    setPage(1);
    loadUsers({ page: 1, tagId: value }).catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")));
  };

  const handleWechatFilterChange = (value: string) => {
    setWechatBoundFilter(value);
    setPage(1);
    loadUsers({ page: 1, wechatBound: value }).catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")));
  };

  const handlePhoneFilterChange = (value: string) => {
    setPhoneBoundFilter(value);
    setPage(1);
    loadUsers({ page: 1, phoneBound: value }).catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")));
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    loadUsers({ page: nextPage }).catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")));
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
    loadUsers({ page: 1, pageSize: nextPageSize }).catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")));
  };

  const handleExportCsv = async () => {
    try {
      await userService.exportUsersCsv({ keyword: search || undefined, tagId: selectedTagId || undefined });
      toast.success("已开始下载 CSV");
    } catch (e) {
      toast.error(toastErrorMessage(e, "导出失败"));
    }
  };

  const reloadTags = async () => {
    const data = await userService.fetchUserTags();
    setTags(data);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) { toast.error("请输入标签名称"); return; }
    setTagSaving(true);
    try {
      await userService.createUserTag({ name: newTagName.trim(), color: newTagColor });
      setNewTagName("");
      setNewTagColor("金色");
      await reloadTags();
      toast.success("标签已创建");
    } catch (e) {
      toast.error(toastErrorMessage(e, "创建标签失败"));
    } finally {
      setTagSaving(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await userService.deleteUserTag(tagId);
      await reloadTags();
      if (selectedTagId === tagId) {
        setSelectedTagId("");
        await loadUsers({ page: 1, tagId: "" });
      } else {
        await loadUsers();
      }
      toast.success("标签已删除");
      setTagDeleteId(null);
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除标签失败"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBar placeholder="搜索用户昵称 / 手机号..." value={search} onChange={handleSearchChange} />
        </div>
        <select
          value={selectedTagId}
          onChange={(e) => handleTagFilterChange(e.target.value)}
          className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value=""><Tx>全部标签</Tx></option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>
        <select
          value={wechatBoundFilter}
          onChange={(e) => handleWechatFilterChange(e.target.value)}
          className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value=""><Tx>微信绑定（全部）</Tx></option>
          <option value="1"><Tx>已绑定微信</Tx></option>
          <option value="0"><Tx>未绑定微信</Tx></option>
        </select>
        <select
          value={phoneBoundFilter}
          onChange={(e) => handlePhoneFilterChange(e.target.value)}
          className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value=""><Tx>手机号（全部）</Tx></option>
          <option value="1"><Tx>已绑定手机号</Tx></option>
          <option value="0"><Tx>未绑定手机号</Tx></option>
        </select>
        <PermissionGate permission="user.view">
          <button type="button" onClick={handleExportCsv} className="touch-manipulation flex min-h-[44px] shrink-0 items-center gap-1.5 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm text-foreground hover:bg-[var(--theme-bg)] sm:self-center">
            <Download size={16} /><Tx> 导出
          </Tx></button>
        </PermissionGate>
      </div>

      <PermissionGate permission="user.update">
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground"><Tx>用户标签管理</Tx></h3>
              <p className="mt-1 text-xs text-muted-foreground"><Tx>可用于手动分群，后续营销优惠券可按标签定向发放。</Tx></p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="新标签名称"
                className="min-h-[40px] rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <select
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="min-h-[40px] rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
              >
                <option><Tx>红色</Tx></option>
                <option><Tx>绿色</Tx></option>
                <option><Tx>蓝色</Tx></option>
                <option><Tx>金色</Tx></option>
              </select>
              <LoadingButton
                type="button"
                variant="gold"
                state={tagSaving ? "loading" : "normal"}
                loadingText="添加中..."
                onClick={() => void handleCreateTag()}
                className="min-h-[40px] rounded-lg px-3 py-2 text-sm font-semibold"
              ><Tx>
                添加
              </Tx></LoadingButton>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${productTagBadgeClass(tag.color)}`}>
                {tag.name}
                <span className="opacity-70">({tag.count ?? 0})</span>
                <button type="button" onClick={() => setTagDeleteId(tag.id)} className="ml-1 rounded-full p-0.5 hover:bg-black/10" aria-label={`删除${tag.name}`}>
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
            {tags.length === 0 && <span className="text-xs text-muted-foreground"><Tx>暂无标签</Tx></span>}
          </div>
        </div>
      </PermissionGate>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "匹配用户数", value: String(total) },
          { label: "今日新增", value: String(users.filter((u) => { const today = new Date().toISOString().slice(0, 10); return u.created_at?.slice(0, 10) === today; }).length) },
          { label: "有邀请码", value: String(users.filter((u) => u.parent_invite_code).length) },
        ].map((s) => (
          <div key={s.label} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-center theme-shadow">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 移动端：卡片 */}
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
              <div className="flex gap-3">
                <div className="skeleton-base skeleton-shimmer h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton-base skeleton-shimmer h-4 w-32 rounded" />
                  <div className="skeleton-base skeleton-shimmer h-3 w-24 rounded" />
                  <div className="skeleton-base skeleton-shimmer h-8 w-full rounded" />
                </div>
              </div>
            </div>
          ))
          : null}
        {!loading && users.map((u) => (
          <div key={u.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="flex items-start gap-3">
              {u.avatar ? (
                <img src={u.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "var(--theme-gradient)" }}>{(u.nickname || u.phone || "?")[0]}</div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{u.nickname || u.phone || "—"}</p>
                  <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--theme-price)]">{u.member_level_name || "普通会员"}</span>
                </div>
                <p className="text-sm text-muted-foreground">{u.phone || "—"}</p>
                <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <span><Tx>邀请码 </Tx><span className="font-mono text-foreground">{u.invite_code || "—"}</span></span>
                  <span><Tx>上级 </Tx><span className="font-mono text-foreground">{u.parent_invite_code || "—"}</span></span>
                </div>
                <UserTagBadges tags={u.tags} />
                <p className="text-[11px] text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleString("zh-CN") : "—"}</p>
                <button type="button" onClick={() => navigate(`/admin/users/${u.id}`)} className="touch-manipulation min-h-[44px] w-full theme-rounded border border-[var(--theme-price)]/40 py-2.5 text-sm font-medium text-[var(--theme-price)] active:bg-[var(--theme-bg)]"><Tx>
                  查看详情
                </Tx></button>
              </div>
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground"><Tx>暂无用户</Tx></div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
      </div>

      <div className="hidden md:block">
        <AnimatedTable
          loading={loading}
          rows={users}
          rowKey={(u) => u.id}
          skeletonRows={8}
          skeletonCols={9}
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="min-w-[920px] w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              {["用户", "手机号", "会员等级", "标签", "邀请码", "上级邀请码", "积分", "注册时间", "操作"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />}
          emptyIcon={Users}
          emptyTitle="暂无用户"
          renderRow={(u) => (
            <>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--theme-gradient)" }}>{(u.nickname || u.phone || "?")[0]}</div>
                  )}
                  <span className="font-medium text-foreground">{u.nickname || u.phone}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-foreground whitespace-nowrap">{u.phone}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--theme-price)]">
                  {u.member_level_name || "普通会员"}
                </span>
              </td>
              <td className="px-4 py-3"><UserTagBadges tags={u.tags} /></td>
              <td className="px-4 py-3 font-mono text-xs text-foreground">{u.invite_code || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.parent_invite_code || "—"}</td>
              <td className="px-4 py-3 text-foreground">{u.points_balance ?? 0}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleString("zh-CN") : "—"}</td>
              <td className="px-4 py-3"><button type="button" onClick={() => navigate(`/admin/users/${u.id}`)} className="text-xs text-[var(--theme-price)] hover:underline"><Tx>详情</Tx></button></td>
            </>
          )}
        />
      </div>
      <AnimatedConfirmDialog
        open={!!tagDeleteId}
        onOpenChange={(open) => !open && setTagDeleteId(null)}
        danger
        title="删除标签"
        description="删除标签后会同步移除用户身上的该标签，确定删除？"
        confirmText="删除"
        onConfirm={() => tagDeleteId && handleDeleteTag(tagDeleteId)}
      />
    </div>
  );
}
