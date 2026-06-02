import { useState } from "react";
import { Download, Plus, Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import {
  AdminFilterButton,
  AdminFilterSelect,
} from "@/components/admin/AdminFilterControls";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import UserTagManageDialog from "@/modules/admin/components/user/UserTagManageDialog";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useAdminUsers } from "@/modules/admin/pages/user/useAdminUsers";
import { UserStatusBadges, UserTagBadges } from "@/modules/admin/pages/user/userListDisplay";
import type { UserProfile } from "@/types/user";
import { formatDateTime } from "@/utils/formatDateTime";
import { productTagBadgeClass } from "@/utils/productTagBadge";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import {
  adminTableAlignClass,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import AdminUserDetailDrawer from "@/modules/admin/pages/user/AdminUserDetailDrawer";

const USER_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left",
  "left",
  "center",
  "left",
  "left",
  "left",
  "left",
  "right",
  "left",
  "right",
];

export default function AdminUsers() {
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const {
    tText,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    selectedTagId,
    setSelectedTagId,
    wechatBoundFilter,
    setWechatBoundFilter,
    phoneBoundFilter,
    setPhoneBoundFilter,
    memberLevelIdFilter,
    setMemberLevelIdFilter,
    accountStatusFilter,
    setAccountStatusFilter,
    orderRestrictedFilter,
    setOrderRestrictedFilter,
    couponRestrictedFilter,
    setCouponRestrictedFilter,
    commentRestrictedFilter,
    setCommentRestrictedFilter,
    dateFromFilter,
    setDateFromFilter,
    dateToFilter,
    setDateToFilter,
    totalSpentMinFilter,
    setTotalSpentMinFilter,
    totalSpentMaxFilter,
    setTotalSpentMaxFilter,
    orderCountMinFilter,
    setOrderCountMinFilter,
    orderCountMaxFilter,
    setOrderCountMaxFilter,
    pointsMinFilter,
    setPointsMinFilter,
    pointsMaxFilter,
    setPointsMaxFilter,
    refundRateMinFilter,
    setRefundRateMinFilter,
    refundRateMaxFilter,
    setRefundRateMaxFilter,
    sortByFilter,
    setSortByFilter,
    sortDirFilter,
    setSortDirFilter,
    userSortOptions,
    selectedUserIds,
    batchTagId,
    setBatchTagId,
    advancedFiltersOpen,
    setAdvancedFiltersOpen,
    tagDialogOpen,
    setTagDialogOpen,
    deletingTagId,
    usersQuery,
    createTagMutation,
    batchTagMutation,
    users,
    total,
    tags,
    memberLevels,
    filtersActive,
    filterChips,
    clearFilters,
    removeFilterChip,
    tableHeaders,
    usersEmptyGuide,
    handleExportCsv,
    handleDeleteTag,
    toggleTagFilter,
    statCards,
    isUserSelected,
    toggleUserSelection,
    allUsersOnPageSelected,
    toggleAllUsersOnPage,
    applyBatchTag,
  } = useAdminUsers();

  const openUserDetail = (userId: string) => {
    setDetailUserId(userId);
  };

  const renderMobileCard = (user: UserProfile) => {
    const checked = isUserSelected(user.id);
    return (
      <AdminTableMobileCard>
        <div className="mb-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => toggleUserSelection(user.id, e.target.checked)}
            className="mt-1"
            aria-label={L(`选择用户 ${user.nickname || user.phone || user.id}`, `Select user ${user.nickname || user.phone || user.id}`)}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.nickname || user.phone || user.id}</p>
                <p className="text-xs text-muted-foreground">{user.phone || "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => openUserDetail(user.id)}
                className="shrink-0 text-xs text-[var(--theme-price)] hover:underline"
              >
                {L("详情", "Details")}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {user.member_level_name || user.memberLevel?.name || L("普通会员", "Regular member")} · {L("积分", "Points")} {user.points_balance ?? user.pointsBalance ?? 0}
            </p>
          </div>
        </div>
        <div className="mb-3">
          <UserStatusBadges user={user} />
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label={L("标签", "Tags")}>
            <UserTagBadges tags={user.tags} />
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("邀请码", "Invite code")}>
            <span className="font-mono text-xs">{user.invite_code || user.inviteCode || "-"}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("注册", "Registered at")}>
            <span className="text-xs text-muted-foreground">{user.created_at ? formatDateTime(user.created_at) : "-"}</span>
          </AdminTableMobileCardField>
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <PermissionGate permission="user.view" mode="page">
      <AdminPageShell
        className="min-w-0"
        hint={<Tx>管理注册用户、标签与风控限制，支持高级筛选与导出。</Tx>}
        toolbar={(
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
        )}
      filters={(
        <>
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3">
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
            {advancedFiltersOpen ? L("收起高级筛选", "Collapse advanced filters") : L("展开高级筛选", "Expand advanced filters")}
          </button>
          {advancedFiltersOpen ? (
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 border-t border-[var(--theme-border)] pt-3 sm:grid-cols-2 lg:grid-cols-3">
              <AdminFilterSelect
                value={selectedTagId}
                onChange={(e) => {
                  setSelectedTagId(e.target.value);
                  setPage(1);
                }}
                variant="theme"
                className="w-full min-w-0"
              >
                <option value="">{L("全部标签", "All tags")}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </AdminFilterSelect>
              <AdminFilterSelect
                value={wechatBoundFilter}
                onChange={(e) => {
                  setWechatBoundFilter(e.target.value);
                  setPage(1);
                }}
                variant="theme"
                className="w-full min-w-0"
              >
                <option value="">{L("微信绑定（全部）", "WeChat bound (all)")}</option>
                <option value="1">{L("已绑定", "Bound")}</option>
                <option value="0">{L("未绑定", "Not bound")}</option>
              </AdminFilterSelect>
              <AdminFilterSelect
                value={phoneBoundFilter}
                onChange={(e) => {
                  setPhoneBoundFilter(e.target.value);
                  setPage(1);
                }}
                variant="theme"
                className="w-full min-w-0"
              >
                <option value="">{L("手机号（全部）", "Phone bound (all)")}</option>
                <option value="1">{L("已绑定", "Bound")}</option>
                <option value="0">{L("未绑定", "Not bound")}</option>
              </AdminFilterSelect>
              {memberLevels.length > 0 ? (
                <AdminFilterSelect
                  value={memberLevelIdFilter}
                  onChange={(e) => {
                    setMemberLevelIdFilter(e.target.value);
                    setPage(1);
                  }}
                  variant="theme"
                  className="w-full min-w-0"
                >
                  <option value="">{L("会员等级（全部）", "Member level (all)")}</option>
                  {memberLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                      {level.enabled === false ? L("（已禁用）", " (disabled)") : ""}
                    </option>
                  ))}
                </AdminFilterSelect>
              ) : null}
              <AdminFilterSelect
                value={accountStatusFilter}
                onChange={(e) => {
                  setAccountStatusFilter(e.target.value);
                  setPage(1);
                }}
                variant="theme"
                className="w-full min-w-0"
              >
                <option value="">{L("账号状态（全部）", "Account status (all)")}</option>
                <option value="normal">{L("正常", "Normal")}</option>
                <option value="disabled">{L("禁用登录", "Login disabled")}</option>
                <option value="blacklisted">{L("黑名单", "Blacklisted")}</option>
              </AdminFilterSelect>
              <AdminFilterSelect
                value={orderRestrictedFilter}
                onChange={(e) => {
                  setOrderRestrictedFilter(e.target.value);
                  setPage(1);
                }}
                variant="theme"
                className="w-full min-w-0"
              >
                <option value="">{L("下单限制（全部）", "Order restriction (all)")}</option>
                <option value="1">{L("已限制", "Restricted")}</option>
                <option value="0">{L("未限制", "Not restricted")}</option>
              </AdminFilterSelect>
              <AdminFilterSelect
                value={couponRestrictedFilter}
                onChange={(e) => {
                  setCouponRestrictedFilter(e.target.value);
                  setPage(1);
                }}
                variant="theme"
                className="w-full min-w-0"
              >
                <option value="">{L("领券限制（全部）", "Coupon restriction (all)")}</option>
                <option value="1">{L("已限制", "Restricted")}</option>
                <option value="0">{L("未限制", "Not restricted")}</option>
              </AdminFilterSelect>
              <AdminFilterSelect
                value={commentRestrictedFilter}
                onChange={(e) => {
                  setCommentRestrictedFilter(e.target.value);
                  setPage(1);
                }}
                variant="theme"
                className="w-full min-w-0"
              >
                <option value="">{L("评论限制（全部）", "Comment restriction (all)")}</option>
                <option value="1">{L("已限制", "Restricted")}</option>
                <option value="0">{L("未限制", "Not restricted")}</option>
              </AdminFilterSelect>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{L("注册开始", "Registered from")}</p>
                <SegmentedDateInput
                  value={dateFromFilter}
                  onChange={(v) => { setDateFromFilter(v); setPage(1); }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{L("注册结束", "Registered to")}</p>
                <SegmentedDateInput
                  value={dateToFilter}
                  onChange={(v) => { setDateToFilter(v); setPage(1); }}
                />
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalSpentMinFilter}
                onChange={(e) => { setTotalSpentMinFilter(e.target.value); setPage(1); }}
                placeholder={L("累计消费 ≥", "Total spent ≥")}
                className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalSpentMaxFilter}
                onChange={(e) => { setTotalSpentMaxFilter(e.target.value); setPage(1); }}
                placeholder={L("累计消费 ≤", "Total spent ≤")}
                className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="1"
                value={orderCountMinFilter}
                onChange={(e) => { setOrderCountMinFilter(e.target.value); setPage(1); }}
                placeholder={L("有效订单 ≥", "Valid orders ≥")}
                className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="1"
                value={orderCountMaxFilter}
                onChange={(e) => { setOrderCountMaxFilter(e.target.value); setPage(1); }}
                placeholder={L("有效订单 ≤", "Valid orders ≤")}
                className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="1"
                value={pointsMinFilter}
                onChange={(e) => { setPointsMinFilter(e.target.value); setPage(1); }}
                placeholder={L("积分 ≥", "Points ≥")}
                className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="1"
                value={pointsMaxFilter}
                onChange={(e) => { setPointsMaxFilter(e.target.value); setPage(1); }}
                placeholder={L("积分 ≤", "Points ≤")}
                className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={refundRateMinFilter}
                onChange={(e) => { setRefundRateMinFilter(e.target.value); setPage(1); }}
                placeholder={L("退款率 ≥ (0~1)", "Refund rate ≥ (0~1)")}
                className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={refundRateMaxFilter}
                onChange={(e) => { setRefundRateMaxFilter(e.target.value); setPage(1); }}
                placeholder={L("退款率 ≤ (0~1)", "Refund rate ≤ (0~1)")}
                className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              />
              <AdminFilterSelect
                value={sortByFilter}
                onChange={(e) => { setSortByFilter(e.target.value); setPage(1); }}
                variant="theme"
                className="w-full min-w-0"
              >
                {userSortOptions.map((option) => (
                  <option key={option.value || "default"} value={option.value}>{tText(option.label)}</option>
                ))}
              </AdminFilterSelect>
              {sortByFilter ? (
                <AdminFilterSelect
                  value={sortDirFilter}
                  onChange={(e) => { setSortDirFilter(e.target.value); setPage(1); }}
                  variant="theme"
                  className="w-full min-w-0"
                >
                  <option value="desc">{L("降序", "Descending")}</option>
                  <option value="asc">{L("升序", "Ascending")}</option>
                </AdminFilterSelect>
              ) : null}
              <PermissionGate permission="user.view">
                <AdminFilterButton
                  onClick={handleExportCsv}
                  variant="theme"
                  className="shrink-0 gap-1.5"
                >
                  <Download size={16} /> {L("导出", "Export")}
                </AdminFilterButton>
              </PermissionGate>
            </div>
          ) : null}
        </div>
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={removeFilterChip} />
      </div>
        </>
      )}
    >
      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 theme-shadow">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PermissionGate permission="user.update">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className={`text-xs ${selectedUserIds.length ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {L(`已选 ${selectedUserIds.length} 人`, `${selectedUserIds.length} selected`)}
              </span>
              <select
                value={batchTagId}
                onChange={(e) => setBatchTagId(e.target.value)}
                className="min-h-[40px] w-full min-w-0 rounded-lg bg-secondary px-3 py-2 text-sm sm:w-auto sm:max-w-xs"
              >
                <option value="">{L("选择要批量打的标签", "Choose a tag for batch tagging")}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={batchTagMutation.isPending}
                onClick={applyBatchTag}
                className="min-h-[40px] rounded-lg bg-[var(--theme-price)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {L("批量打标", "Batch tag")}
              </button>
            </div>
          </PermissionGate>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:max-w-xl lg:justify-end">
            <div className="min-w-0 flex-1 basis-[12rem]">
              <SearchBar
                placeholder={L("搜索昵称 / 手机号 / 微信 / 邀请码", "Search nickname / phone / WeChat / invite code")}
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

      <AnimatedTable
        loading={usersQuery.isLoading && !usersQuery.data}
        error={usersQuery.isError && !usersQuery.data}
        errorTitle={L("用户加载失败", "Failed to load users")}
        errorDescription={L("用户接口暂时没有返回数据，请检查网络或稍后重试。", "The user API did not return data. Please check the network and try again.")}
        onRetry={() => { void usersQuery.refetch(); }}
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
            <th className={`px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap ${adminTableAlignClass("center")}`}>
              <input
                type="checkbox"
                checked={allUsersOnPageSelected}
                onChange={(e) => toggleAllUsersOnPage(e.target.checked)}
              />
            </th>
            {tableHeaders.map((head, index) => (
              <th
                key={head}
                className={`px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap ${adminTableAlignClass(USER_COLUMN_ALIGNS[index] ?? "left")}`}
              >
                {head}
              </th>
            ))}
          </tr>
        }
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        renderMobileCard={renderMobileCard}
        renderRow={(user) => (
          <>
            <td className={`px-4 py-3 ${adminTableAlignClass("center")}`}>
              <input
                type="checkbox"
                checked={isUserSelected(user.id)}
                onChange={(e) => toggleUserSelection(user.id, e.target.checked)}
              />
            </td>
            <td className={`max-w-[11rem] px-4 py-3 align-middle ${adminTableAlignClass("left")}`}>
              <AdminTableCell
                value={user.nickname || user.phone || user.id}
                fullText={[user.nickname, user.phone, user.id].filter(Boolean).join("\n")}
                maxWidth="10.5rem"
              />
            </td>
            <td className={`px-4 py-3 text-foreground whitespace-nowrap ${adminTableAlignClass("left")}`}>{user.phone || "-"}</td>
            <td className={`px-4 py-3 ${adminTableAlignClass("center")}`}>
              <UserStatusBadges user={user} />
            </td>
            <td className={`px-4 py-3 whitespace-nowrap ${adminTableAlignClass("left")}`}>{user.member_level_name || user.memberLevel?.name || L("普通会员", "Regular member")}</td>
            <td className={`px-4 py-3 ${adminTableAlignClass("left")}`}>
              <UserTagBadges tags={user.tags} />
            </td>
            <td className={`px-4 py-3 font-mono text-xs text-foreground ${adminTableAlignClass("left")}`}>{user.invite_code || user.inviteCode || "-"}</td>
            <td className={`px-4 py-3 font-mono text-xs text-muted-foreground ${adminTableAlignClass("left")}`}>{user.parent_invite_code || user.parentInviteCode || "-"}</td>
            <td className={`px-4 py-3 tabular-nums text-foreground ${adminTableAlignClass("right")}`}>{user.points_balance ?? user.pointsBalance ?? 0}</td>
            <td className={`px-4 py-3 text-xs text-muted-foreground whitespace-nowrap ${adminTableAlignClass("left")}`}>
              {user.created_at ? formatDateTime(user.created_at) : "-"}
            </td>
            <td className={`px-4 py-3 ${adminTableAlignClass("right")}`}>
              <button type="button" onClick={() => openUserDetail(user.id)} className="text-xs text-[var(--theme-price)] hover:underline">
                {L("详情", "Details")}
              </button>
            </td>
          </>
        )}
      />
      <AdminUserDetailDrawer
        open={Boolean(detailUserId)}
        userId={detailUserId}
        onOpenChange={(open) => {
          if (!open) setDetailUserId(null);
        }}
        onUpdated={async () => {
          await usersQuery.refetch();
        }}
      />
      </AdminPageShell>
    </PermissionGate>
  );
}
