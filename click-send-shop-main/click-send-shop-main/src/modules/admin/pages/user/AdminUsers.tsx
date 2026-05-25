import { useNavigate } from "react-router-dom";
import { Download, Plus, Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
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
import { useAdminUsers } from "@/modules/admin/pages/user/useAdminUsers";
import { UserStatusBadges, UserTagBadges } from "@/modules/admin/pages/user/userListDisplay";
import type { UserProfile } from "@/types/user";
import { formatDateTime } from "@/utils/formatDateTime";
import { productTagBadgeClass } from "@/utils/productTagBadge";

export default function AdminUsers() {
  const navigate = useNavigate();
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
            aria-label={`选择用户 ${user.nickname || user.phone || user.id}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
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
    <div className="min-w-0 space-y-4">
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
            {advancedFiltersOpen ? tText("收起高级筛选") : tText("展开高级筛选")}
          </button>
          {advancedFiltersOpen ? (
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 border-t border-[var(--theme-border)] pt-3 sm:grid-cols-2 lg:grid-cols-3">
              <select
                value={selectedTagId}
                onChange={(e) => {
                  setSelectedTagId(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] w-full min-w-0 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
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
                className="min-h-[44px] w-full min-w-0 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
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
                className="min-h-[44px] w-full min-w-0 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
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
                  className="min-h-[44px] w-full min-w-0 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
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
                className="min-h-[44px] w-full min-w-0 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
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
                className="min-h-[44px] w-full min-w-0 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
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
                className="min-h-[44px] w-full min-w-0 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
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
                className="min-h-[44px] w-full min-w-0 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
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
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PermissionGate permission="user.update">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className={`text-xs ${selectedUserIds.length ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {tText(`已选 ${selectedUserIds.length} 人`)}
              </span>
              <select
                value={batchTagId}
                onChange={(e) => setBatchTagId(e.target.value)}
                className="min-h-[40px] w-full min-w-0 rounded-lg bg-secondary px-3 py-2 text-sm sm:w-auto sm:max-w-xs"
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
                onClick={applyBatchTag}
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
                checked={allUsersOnPageSelected}
                onChange={(e) => toggleAllUsersOnPage(e.target.checked)}
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
        renderMobileCard={renderMobileCard}
        renderRow={(user) => (
          <>
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={isUserSelected(user.id)}
                onChange={(e) => toggleUserSelection(user.id, e.target.checked)}
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