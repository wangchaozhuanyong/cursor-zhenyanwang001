import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import UserTagManageDialog from "@/modules/admin/components/user/UserTagManageDialog";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import * as userService from "@/services/admin/userService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { productTagBadgeClass } from "@/utils/productTagBadge";
import type { MemberLevel, UserProfile, UserTag } from "@/types/user";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

const PAGE_SIZE = 20;

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  normal: "正常",
  disabled: "禁用登录",
  blacklisted: "黑名单",
};

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

function UserStatusBadges({ user }: { user: UserProfile }) {
  const { tText } = useAdminT();
  const accountStatus = String(user.account_status || "normal");
  const items = [
    accountStatus === "disabled" ? tText("禁用登录") : null,
    accountStatus === "blacklisted" ? tText("黑名单") : null,
    Number(user.order_restricted || 0) ? tText("限制下单") : null,
    Number(user.coupon_restricted || 0) ? tText("限制领券") : null,
    Number(user.comment_restricted || 0) ? tText("限制评论") : null,
  ].filter(Boolean) as string[];
  if (!items.length) return <span className="text-xs text-emerald-700"><Tx>正常</Tx></span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
          {item}
        </span>
      ))}
    </div>
  );
}

function filterBoundLabel(tText: (zh: string) => string, prefix: string, value: string) {
  if (value === "1") return tText(`${prefix}：已绑定`);
  if (value === "0") return tText(`${prefix}：未绑定`);
  return "";
}

function restrictionLabel(tText: (zh: string) => string, prefix: string, value: string) {
  if (value === "1") return tText(`${prefix}：已限制`);
  if (value === "0") return tText(`${prefix}：未限制`);
  return "";
}

export default function AdminUsers() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [wechatBoundFilter, setWechatBoundFilter] = useState("");
  const [phoneBoundFilter, setPhoneBoundFilter] = useState("");
  const [memberLevelIdFilter, setMemberLevelIdFilter] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState("");
  const [orderRestrictedFilter, setOrderRestrictedFilter] = useState("");
  const [couponRestrictedFilter, setCouponRestrictedFilter] = useState("");
  const [commentRestrictedFilter, setCommentRestrictedFilter] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [batchTagId, setBatchTagId] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const { confirm } = useAdminConfirm();

  const queryParams = useMemo<userService.UserListQuery>(
    () => ({
      page,
      pageSize,
      keyword: search.trim() || undefined,
      tagId: selectedTagId || undefined,
      wechatBound: wechatBoundFilter || undefined,
      phoneBound: phoneBoundFilter || undefined,
      memberLevelId: memberLevelIdFilter || undefined,
      accountStatus: accountStatusFilter || undefined,
      orderRestricted: orderRestrictedFilter || undefined,
      couponRestricted: couponRestrictedFilter || undefined,
      commentRestricted: commentRestrictedFilter || undefined,
    }),
    [
      accountStatusFilter,
      commentRestrictedFilter,
      couponRestrictedFilter,
      memberLevelIdFilter,
      orderRestrictedFilter,
      page,
      pageSize,
      phoneBoundFilter,
      search,
      selectedTagId,
      wechatBoundFilter,
    ],
  );

  const usersQuery = useQuery({
    queryKey: [...adminQueryKeys.usersRoot(), "list", queryParams],
    queryFn: () => userService.fetchUsers(queryParams),
    staleTime: 60_000,
    refetchInterval: 90_000,
  });
  const tagsQuery = useQuery({
    queryKey: [...adminQueryKeys.usersRoot(), "tags"],
    queryFn: userService.fetchUserTags,
    staleTime: 60_000,
  });
  const memberLevelsQuery = useQuery({
    queryKey: [...adminQueryKeys.usersRoot(), "member-levels"],
    queryFn: userService.fetchMemberLevels,
    staleTime: 60_000,
  });

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.usersRoot() });
  };

  const createTagMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) => userService.createUserTag(payload),
    onSuccess: async () => {
      toast.success(tText("标签已创建"));
      await invalidateUsers();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("创建标签失败"))),
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUserTag(id),
    onSuccess: async () => {
      toast.success(tText("标签已删除"));
      setDeletingTagId(null);
      await invalidateUsers();
    },
    onError: (error) => {
      setDeletingTagId(null);
      toast.error(toastErrorMessage(error, tText("删除标签失败")));
    },
  });

  const batchTagMutation = useMutation({
    mutationFn: async () => {
      if (!batchTagId) throw new Error(tText("请先选择标签"));
      if (!selectedUserIds.length) throw new Error(tText("请先勾选用户"));
      return userService.batchSetUserTag(batchTagId, selectedUserIds);
    },
    onSuccess: async (affected) => {
      toast.success(tText(`批量打标完成：${affected}/${selectedUserIds.length}`));
      setSelectedUserIds([]);
      await invalidateUsers();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("批量打标失败"))),
  });

  const users = usersQuery.data?.list || [];
  const total = usersQuery.data?.total || 0;
  const summary = usersQuery.data?.summary || {};
  const tags = tagsQuery.data || [];
  const memberLevels = memberLevelsQuery.data || [];

  const selectedTagName = tags.find((tag) => tag.id === selectedTagId)?.name;
  const selectedMemberLevelName = memberLevels.find((level: MemberLevel) => level.id === memberLevelIdFilter)?.name;
  const filtersActive = Boolean(
    search.trim()
      || selectedTagId
      || wechatBoundFilter
      || phoneBoundFilter
      || memberLevelIdFilter
      || accountStatusFilter
      || orderRestrictedFilter
      || couponRestrictedFilter
      || commentRestrictedFilter,
  );

  const filterChips = useMemo(() => {
    const chips: AdminFilterChip[] = [];
    if (search.trim()) chips.push({ key: "search", label: tText(`关键词：${search.trim()}`) });
    if (selectedTagId) chips.push({ key: "tag", label: tText(`标签：${selectedTagName || selectedTagId}`) });
    const wechat = filterBoundLabel(tText, tText("微信"), wechatBoundFilter);
    if (wechat) chips.push({ key: "wechat", label: wechat });
    const phone = filterBoundLabel(tText, tText("手机号"), phoneBoundFilter);
    if (phone) chips.push({ key: "phone", label: phone });
    if (memberLevelIdFilter) chips.push({ key: "memberLevel", label: tText(`会员：${selectedMemberLevelName || memberLevelIdFilter}`) });
    if (accountStatusFilter) {
      chips.push({
        key: "accountStatus",
        label: tText(`账号：${ACCOUNT_STATUS_LABELS[accountStatusFilter] || accountStatusFilter}`),
      });
    }
    const order = restrictionLabel(tText, tText("下单"), orderRestrictedFilter);
    if (order) chips.push({ key: "orderRestricted", label: order });
    const coupon = restrictionLabel(tText, tText("领券"), couponRestrictedFilter);
    if (coupon) chips.push({ key: "couponRestricted", label: coupon });
    const comment = restrictionLabel(tText, tText("评论"), commentRestrictedFilter);
    if (comment) chips.push({ key: "commentRestricted", label: comment });
    return chips;
  }, [
    accountStatusFilter,
    commentRestrictedFilter,
    couponRestrictedFilter,
    memberLevelIdFilter,
    orderRestrictedFilter,
    phoneBoundFilter,
    search,
    selectedMemberLevelName,
    selectedTagId,
    selectedTagName,
    wechatBoundFilter,
    tText,
  ]);

  const tableHeaders = useMemo(
    () => ["用户", "手机号", "状态", "会员等级", "标签", "邀请码", "上级邀请码", "积分", "注册时间", "操作"].map((h) => tText(h)),
    [tText],
  );

  const usersEmptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.usersFiltered : ADMIN_EMPTY_GUIDES.users;

  const clearFilters = () => {
    setSearch("");
    setSelectedTagId("");
    setWechatBoundFilter("");
    setPhoneBoundFilter("");
    setMemberLevelIdFilter("");
    setAccountStatusFilter("");
    setOrderRestrictedFilter("");
    setCouponRestrictedFilter("");
    setCommentRestrictedFilter("");
    setPage(1);
  };

  const removeFilterChip = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "tag") setSelectedTagId("");
    if (key === "wechat") setWechatBoundFilter("");
    if (key === "phone") setPhoneBoundFilter("");
    if (key === "memberLevel") setMemberLevelIdFilter("");
    if (key === "accountStatus") setAccountStatusFilter("");
    if (key === "orderRestricted") setOrderRestrictedFilter("");
    if (key === "couponRestricted") setCouponRestrictedFilter("");
    if (key === "commentRestricted") setCommentRestrictedFilter("");
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      await userService.exportUsersCsv(queryParams);
      toast.success(tText("已开始导出 CSV"));
    } catch (error) {
      toast.error(toastErrorMessage(error, tText("导出失败")));
    }
  };

  const handleDeleteTag = async (tag: UserTag) => {
    const impact = await userService.fetchUserTagImpact(tag.id).catch(() => tag.count || 0);
    confirm({ title: tText("确认删除标签"),
      description: tText(`该标签当前影响 ${impact} 位用户，确认删除？`),
      confirmText: tText("删除"),
      danger: true,
      onConfirm: async () => {
        setDeletingTagId(tag.id);
        await deleteTagMutation.mutateAsync(tag.id);
      },
    });
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagId((prev) => (prev === tagId ? "" : tagId));
    setPage(1);
  };

  const statCards = [
    { label: tText("匹配用户数"), value: String(total), highlight: filtersActive },
    { label: tText("今日新增"), value: String(summary.todayNew || 0), highlight: false },
    { label: tText("被邀请用户"), value: String(summary.invitedUsers || 0), highlight: false },
  ] as const;

  const renderMobileCard = (user: UserProfile) => {
    const checked = selectedUserIds.includes(user.id);
    return (
      <AdminTableMobileCard>
        <div className="mb-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) =>
              setSelectedUserIds((prev) => (e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id)))
            }
            className="mt-1"
            aria-label={`选择用户 ${user.nickname || user.phone || user.id}`}
          />
          <div className="min-w-0 flex-1">
            <motion.div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.nickname || user.phone || user.id}</p>
                <p className="text-xs text-muted-foreground">{user.phone || "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/admin/users/${user.id}`)}
                className="shrink-0 text-xs text-[var(--theme-price)] hover:underline"
              >
                详情
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {user.member_level_name || user.memberLevel?.name || "普通会员"} · 积分 {user.points_balance ?? user.pointsBalance ?? 0}
            </p>
          </div>
        </div>
        <div className="mb-3">
          <UserStatusBadges user={user} />
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label="标签">
            <UserTagBadges tags={user.tags} />
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label="邀请码">
            <span className="font-mono text-xs">{user.invite_code || user.inviteCode || "-"}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label="注册">
            <span className="text-xs text-muted-foreground">{user.created_at ? formatDateTime(user.created_at) : "-"}</span>
          </AdminTableMobileCardField>
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {statCards.map((item) => (
          <div
            key={item.label}
            className={`theme-rounded border bg-[var(--theme-surface)] p-4 text-center theme-shadow ${
              item.highlight ? "border-[var(--theme-price)]" : "border-[var(--theme-border)]"
            }`}
          >
            <p className="text-lg font-bold text-foreground">{item.value}</p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
          <button
            type="button"
            onClick={() => setAdvancedFiltersOpen((v) => !v)}
            className="w-full text-left text-sm font-medium text-foreground"
            aria-expanded={advancedFiltersOpen}
          >
            {advancedFiltersOpen ? tText("收起高级筛选") : tText("展开高级筛选")}
          </button>
          {advancedFiltersOpen ? (
            <div className="mt-3 flex flex-col gap-3 border-t border-[var(--theme-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center">
              <select
                value={selectedTagId}
                onChange={(e) => {
                  setSelectedTagId(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>全部标签</Tx></option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <select
                value={wechatBoundFilter}
                onChange={(e) => {
                  setWechatBoundFilter(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>微信绑定（全部）</Tx></option>
                <option value="1"><Tx>已绑定</Tx></option>
                <option value="0"><Tx>未绑定</Tx></option>
              </select>
              <select
                value={phoneBoundFilter}
                onChange={(e) => {
                  setPhoneBoundFilter(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>手机号（全部）</Tx></option>
                <option value="1"><Tx>已绑定</Tx></option>
                <option value="0"><Tx>未绑定</Tx></option>
              </select>
              {memberLevels.length > 0 ? (
                <select
                  value={memberLevelIdFilter}
                  onChange={(e) => {
                    setMemberLevelIdFilter(e.target.value);
                    setPage(1);
                  }}
                  className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
                >
                  <option value=""><Tx>会员等级（全部）</Tx></option>
                  {memberLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                      {level.enabled === false ? tText("（已禁用）") : ""}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                value={accountStatusFilter}
                onChange={(e) => {
                  setAccountStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>账号状态（全部）</Tx></option>
                <option value="normal"><Tx>正常</Tx></option>
                <option value="disabled"><Tx>禁用登录</Tx></option>
                <option value="blacklisted"><Tx>黑名单</Tx></option>
              </select>
              <select
                value={orderRestrictedFilter}
                onChange={(e) => {
                  setOrderRestrictedFilter(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>下单限制（全部）</Tx></option>
                <option value="1"><Tx>已限制</Tx></option>
                <option value="0"><Tx>未限制</Tx></option>
              </select>
              <select
                value={couponRestrictedFilter}
                onChange={(e) => {
                  setCouponRestrictedFilter(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>领券限制（全部）</Tx></option>
                <option value="1"><Tx>已限制</Tx></option>
                <option value="0"><Tx>未限制</Tx></option>
              </select>
              <select
                value={commentRestrictedFilter}
                onChange={(e) => {
                  setCommentRestrictedFilter(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>评论限制（全部）</Tx></option>
                <option value="1"><Tx>已限制</Tx></option>
                <option value="0"><Tx>未限制</Tx></option>
              </select>
              <PermissionGate permission="user.view">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="touch-manipulation flex min-h-[44px] shrink-0 items-center gap-1.5 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm"
                >
                  <Download size={16} /> <Tx>导出</Tx>
                </button>
              </PermissionGate>
            </div>
          ) : null}
        </div>
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={removeFilterChip} />
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 theme-shadow">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PermissionGate permission="user.update">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs ${selectedUserIds.length ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {tText(`已选 ${selectedUserIds.length} 人`)}
              </span>
              <select
                value={batchTagId}
                onChange={(e) => setBatchTagId(e.target.value)}
                className="min-h-[40px] rounded-lg bg-secondary px-3 py-2 text-sm"
              >
                <option value=""><Tx>选择要批量打的标签</Tx></option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={batchTagMutation.isPending}
                onClick={() => batchTagMutation.mutate()}
                className="min-h-[40px] rounded-lg bg-[var(--theme-price)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Tx>批量打标</Tx>
              </button>
            </div>
          </PermissionGate>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:max-w-xl lg:justify-end">
            <PermissionGate permission="user.update">
              <button
                type="button"
                onClick={() => setTagDialogOpen(true)}
                className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-[var(--theme-border)] px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                <Plus size={16} />
                <Tx>添加标签</Tx>
              </button>
            </PermissionGate>
            <div className="min-w-0 flex-1 basis-[12rem]">
              <SearchBar
                placeholder={tText("搜索昵称 / 手机号 / 微信 / 邀请码")}
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTagId === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTagFilter(tag.id)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "ring-2 ring-[var(--theme-price)] ring-offset-1"
                    : ""
                } ${productTagBadgeClass(tag.color)}`}
              >
                {tag.name}
                <span className="opacity-70">({tag.count ?? 0})</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <PermissionGate permission="user.update">
        <UserTagManageDialog
          open={tagDialogOpen}
          onOpenChange={setTagDialogOpen}
          tags={tags}
          creating={createTagMutation.isPending}
          deletingId={deletingTagId}
          onCreate={(payload) => createTagMutation.mutate(payload)}
          onDelete={handleDeleteTag}
          onFilterByTag={(tagId) => {
            setSelectedTagId(tagId);
            setPage(1);
          }}
        />
      </PermissionGate>

      const renderMobileCard = (user: UserProfile) => {
        const checked = selectedUserIds.includes(user.id);
        return (
          <AdminTableMobileCard>
            <motion.div className="mb-3 flex items-start gap-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                  setSelectedUserIds((prev) => (e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id)))
                }
                className="mt-1"
                aria-label={`选择用户 ${user.nickname || user.phone || user.id}`}
              />
              <div className="min-w-0 flex-1">
                <motion.div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.nickname || user.phone || user.id}</p>
                    <p className="text-xs text-muted-foreground">{user.phone || "-"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    className="shrink-0 text-xs text-[var(--theme-price)] hover:underline"
                  >
                    详情
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.member_level_name || user.memberLevel?.name || "普通会员"} · 积分 {user.points_balance ?? user.pointsBalance ?? 0}
                </p>
              </div>
            </div>
            <div className="mb-3">
              <UserStatusBadges user={user} />
            </div>
            <div className="space-y-2">
              <AdminTableMobileCardField label="标签">
                <UserTagBadges tags={user.tags} />
              </AdminTableMobileCardField>
              <AdminTableMobileCardField label="邀请码">
                <span className="font-mono text-xs">{user.invite_code || user.inviteCode || "-"}</span>
              </AdminTableMobileCardField>
              <AdminTableMobileCardField label="注册">
                <span className="text-xs text-muted-foreground">{user.created_at ? formatDateTime(user.created_at) : "-"}</span>
              </AdminTableMobileCardField>
            </div>
          </AdminTableMobileCard>
        );
      };

      <AnimatedTable
        loading={usersQuery.isLoading}
        rows={users}
        rowKey={(user) => user.id}
        skeletonRows={8}
        skeletonCols={10}
        className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
        tableClassName="min-w-[1080px] w-full text-sm"
        theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
        emptyIcon={Users}
        emptyTitle={usersEmptyGuide.title}
        emptyDescription={usersEmptyGuide.description}
        emptyAction={<AdminEmptyGuideActions guide={usersEmptyGuide} showClearFilters={filtersActive} onClearFilters={clearFilters} />}
        thead={
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
              <input
                type="checkbox"
                checked={users.length > 0 && selectedUserIds.length === users.length}
                onChange={(e) => setSelectedUserIds(e.target.checked ? users.map((user) => user.id) : [])}
              />
            </th>
            {tableHeaders.map((head) => (
              <th key={head} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                {head}
              </th>
            ))}
          </tr>
        }
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        renderRow={(user) => (
          <>
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                onChange={(e) =>
                  setSelectedUserIds((prev) => (e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id)))
                }
              />
            </td>
            <td className="max-w-[11rem] px-4 py-3 align-middle">
              <AdminTableCell
                value={user.nickname || user.phone || user.id}
                fullText={[user.nickname, user.phone, user.id].filter(Boolean).join("\n")}
                maxWidth="10.5rem"
              />
            </td>
            <td className="px-4 py-3 text-foreground whitespace-nowrap">{user.phone || "-"}</td>
            <td className="px-4 py-3">
              <UserStatusBadges user={user} />
            </td>
            <td className="px-4 py-3 whitespace-nowrap">{user.member_level_name || user.memberLevel?.name || tText("普通会员")}</td>
            <td className="px-4 py-3">
              <UserTagBadges tags={user.tags} />
            </td>
            <td className="px-4 py-3 font-mono text-xs text-foreground">{user.invite_code || user.inviteCode || "-"}</td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.parent_invite_code || user.parentInviteCode || "-"}</td>
            <td className="px-4 py-3 text-foreground">{user.points_balance ?? user.pointsBalance ?? 0}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
              {user.created_at ? formatDateTime(user.created_at) : "-"}
            </td>
            <td className="px-4 py-3">
              <button type="button" onClick={() => navigate(`/admin/users/${user.id}`)} className="text-xs text-[var(--theme-price)] hover:underline">
                <Tx>详情</Tx>
              </button>
            </td>
          </>
        )}
      />
    </div>
  );
}
