import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  ACCOUNT_STATUS_LABELS,
  filterBoundLabel,
  restrictionLabel,
} from "@/modules/admin/pages/user/userListDisplay";
import * as userService from "@/services/admin/userService";
import type { MemberLevel, UserTag } from "@/types/user";
import { toastErrorMessage } from "@/utils/errorMessage";

const PAGE_SIZE = 20;
const EMPTY_USERS: UserProfile[] = [];
const EMPTY_TAGS: UserTag[] = [];
const EMPTY_MEMBER_LEVELS: MemberLevel[] = [];

function trimOrUndef(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function useAdminUsers() {
  const { locale, tText } = useAdminTOptional();
  const isEn = locale === "en";
  const L = useCallback((zh: string, en: string) => (isEn ? en : zh), [isEn]);
  const capabilities = useSiteCapabilities();
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
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [totalSpentMinFilter, setTotalSpentMinFilter] = useState("");
  const [totalSpentMaxFilter, setTotalSpentMaxFilter] = useState("");
  const [orderCountMinFilter, setOrderCountMinFilter] = useState("");
  const [orderCountMaxFilter, setOrderCountMaxFilter] = useState("");
  const [pointsMinFilter, setPointsMinFilter] = useState("");
  const [pointsMaxFilter, setPointsMaxFilter] = useState("");
  const [refundRateMinFilter, setRefundRateMinFilter] = useState("");
  const [refundRateMaxFilter, setRefundRateMaxFilter] = useState("");
  const [sortByFilter, setSortByFilter] = useState("");
  const [sortDirFilter, setSortDirFilter] = useState("desc");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [batchTagId, setBatchTagId] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const { confirm } = useAdminConfirm();
  const userSortOptions = useMemo(() => [
    { value: "", label: L("注册时间（默认）", "Registration time (default)") },
    { value: "total_spent", label: L("累计消费", "Total spent") },
    { value: "valid_order_count", label: L("有效订单数", "Valid orders") },
    { value: "last_purchase_at", label: L("最近购买", "Last purchase") },
    { value: "refund_rate", label: L("退款率", "Refund rate") },
  ] as const, [L]);

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
      dateFrom: trimOrUndef(dateFromFilter),
      dateTo: trimOrUndef(dateToFilter),
      totalSpentMin: trimOrUndef(totalSpentMinFilter),
      totalSpentMax: trimOrUndef(totalSpentMaxFilter),
      orderCountMin: trimOrUndef(orderCountMinFilter),
      orderCountMax: trimOrUndef(orderCountMaxFilter),
      pointsMin: trimOrUndef(pointsMinFilter),
      pointsMax: trimOrUndef(pointsMaxFilter),
      refundRateMin: trimOrUndef(refundRateMinFilter),
      refundRateMax: trimOrUndef(refundRateMaxFilter),
      sortBy: sortByFilter || undefined,
      sortDir: sortByFilter ? (sortDirFilter || "desc") : undefined,
    }),
    [
      accountStatusFilter,
      commentRestrictedFilter,
      couponRestrictedFilter,
      dateFromFilter,
      dateToFilter,
      memberLevelIdFilter,
      orderCountMaxFilter,
      orderCountMinFilter,
      orderRestrictedFilter,
      page,
      pageSize,
      phoneBoundFilter,
      pointsMaxFilter,
      pointsMinFilter,
      refundRateMaxFilter,
      refundRateMinFilter,
      search,
      selectedTagId,
      sortByFilter,
      sortDirFilter,
      totalSpentMaxFilter,
      totalSpentMinFilter,
      wechatBoundFilter,
    ],
  );

  const usersQuery = useQuery({
    queryKey: [...adminQueryKeys.usersRoot(), "list", queryParams],
    queryFn: () => userService.fetchUsers(queryParams),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
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
    enabled: capabilities.memberLevelEnabled,
  });

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.usersRoot() });
  };

  const createTagMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) => userService.createUserTag(payload),
    onSuccess: async () => {
      toast.success(L("标签已创建", "Tag created"));
      await invalidateUsers();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("创建标签失败", "Failed to create tag"))),
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUserTag(id),
    onSuccess: async () => {
      toast.success(L("标签已删除", "Tag deleted"));
      setDeletingTagId(null);
      await invalidateUsers();
    },
    onError: (error) => {
      setDeletingTagId(null);
      toast.error(toastErrorMessage(error, L("删除标签失败", "Failed to delete tag")));
    },
  });

  const batchTagMutation = useMutation({
    mutationFn: async () => {
      if (!batchTagId) throw new Error(L("请先选择标签", "Please choose a tag first"));
      if (!selectedUserIds.length) throw new Error(L("请先勾选用户", "Please select users first"));
      return userService.batchSetUserTag(batchTagId, selectedUserIds);
    },
    onSuccess: async (affected) => {
      toast.success(L(`批量打标完成：${affected}/${selectedUserIds.length}`, `Batch tagging done: ${affected}/${selectedUserIds.length}`));
      setSelectedUserIds([]);
      await invalidateUsers();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("批量打标失败", "Failed to batch tag"))),
  });

  const users = usersQuery.data?.list || EMPTY_USERS;
  const total = usersQuery.data?.total || 0;
  const summary = usersQuery.data?.summary || {};
  const tags = tagsQuery.data || EMPTY_TAGS;
  const memberLevelsFromApi = memberLevelsQuery.data || EMPTY_MEMBER_LEVELS;
  const memberLevelsFromUsers = useMemo(() => {
    const map = new Map<string, MemberLevel>();
    for (const user of users) {
      const levelId = user.member_level_id;
      const levelName = user.member_level_name;
      if (!levelId || !levelName) continue;
      if (!map.has(levelId)) {
        map.set(levelId, { id: levelId, name: levelName });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }, [users]);
  const memberLevels = memberLevelsFromApi.length > 0 ? memberLevelsFromApi : memberLevelsFromUsers;

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
      || commentRestrictedFilter
      || dateFromFilter.trim()
      || dateToFilter.trim()
      || totalSpentMinFilter.trim()
      || totalSpentMaxFilter.trim()
      || orderCountMinFilter.trim()
      || orderCountMaxFilter.trim()
      || pointsMinFilter.trim()
      || pointsMaxFilter.trim()
      || refundRateMinFilter.trim()
      || refundRateMaxFilter.trim()
      || sortByFilter,
  );

  const filterChips = useMemo(() => {
    const chips: AdminFilterChip[] = [];
    if (search.trim()) chips.push({ key: "search", label: L(`关键词：${search.trim()}`, `Keyword: ${search.trim()}`) });
    if (selectedTagId) chips.push({ key: "tag", label: L(`标签：${selectedTagName || selectedTagId}`, `Tag: ${selectedTagName || selectedTagId}`) });
    const wechat = filterBoundLabel((zh) => L(zh, zh), L("微信", "WeChat"), wechatBoundFilter);
    if (wechat) chips.push({ key: "wechat", label: wechat });
    const phone = filterBoundLabel((zh) => L(zh, zh), L("手机号", "Phone"), phoneBoundFilter);
    if (phone) chips.push({ key: "phone", label: phone });
    if (memberLevelIdFilter) chips.push({ key: "memberLevel", label: L(`会员：${selectedMemberLevelName || memberLevelIdFilter}`, `Member: ${selectedMemberLevelName || memberLevelIdFilter}`) });
    if (accountStatusFilter) {
      chips.push({
        key: "accountStatus",
        label: L(`账号：${ACCOUNT_STATUS_LABELS[accountStatusFilter] || accountStatusFilter}`, `Account: ${ACCOUNT_STATUS_LABELS[accountStatusFilter] || accountStatusFilter}`),
      });
    }
    const order = restrictionLabel((zh) => L(zh, zh), L("下单", "Order"), orderRestrictedFilter);
    if (order) chips.push({ key: "orderRestricted", label: order });
    const coupon = restrictionLabel((zh) => L(zh, zh), L("领券", "Coupon"), couponRestrictedFilter);
    if (coupon) chips.push({ key: "couponRestricted", label: coupon });
    const comment = restrictionLabel((zh) => L(zh, zh), L("评论", "Comment"), commentRestrictedFilter);
    if (comment) chips.push({ key: "commentRestricted", label: comment });
    if (dateFromFilter.trim()) chips.push({ key: "dateFrom", label: L(`注册起：${dateFromFilter.trim()}`, `Registered from: ${dateFromFilter.trim()}`) });
    if (dateToFilter.trim()) chips.push({ key: "dateTo", label: L(`注册止：${dateToFilter.trim()}`, `Registered to: ${dateToFilter.trim()}`) });
    if (totalSpentMinFilter.trim()) chips.push({ key: "totalSpentMin", label: L(`消费≥${totalSpentMinFilter.trim()}`, `Spent ≥ ${totalSpentMinFilter.trim()}`) });
    if (totalSpentMaxFilter.trim()) chips.push({ key: "totalSpentMax", label: L(`消费≤${totalSpentMaxFilter.trim()}`, `Spent ≤ ${totalSpentMaxFilter.trim()}`) });
    if (orderCountMinFilter.trim()) chips.push({ key: "orderCountMin", label: L(`订单≥${orderCountMinFilter.trim()}`, `Orders ≥ ${orderCountMinFilter.trim()}`) });
    if (orderCountMaxFilter.trim()) chips.push({ key: "orderCountMax", label: L(`订单≤${orderCountMaxFilter.trim()}`, `Orders ≤ ${orderCountMaxFilter.trim()}`) });
    if (pointsMinFilter.trim()) chips.push({ key: "pointsMin", label: L(`积分≥${pointsMinFilter.trim()}`, `Points ≥ ${pointsMinFilter.trim()}`) });
    if (pointsMaxFilter.trim()) chips.push({ key: "pointsMax", label: L(`积分≤${pointsMaxFilter.trim()}`, `Points ≤ ${pointsMaxFilter.trim()}`) });
    if (refundRateMinFilter.trim()) chips.push({ key: "refundRateMin", label: L(`退款率≥${refundRateMinFilter.trim()}`, `Refund rate ≥ ${refundRateMinFilter.trim()}`) });
    if (refundRateMaxFilter.trim()) chips.push({ key: "refundRateMax", label: L(`退款率≤${refundRateMaxFilter.trim()}`, `Refund rate ≤ ${refundRateMaxFilter.trim()}`) });
    if (sortByFilter) {
      const sortLabel = userSortOptions.find((o) => o.value === sortByFilter)?.label || sortByFilter;
      chips.push({ key: "sortBy", label: L(`排序：${sortLabel}${sortDirFilter === "asc" ? " ↑" : " ↓"}`, `Sort: ${sortLabel}${sortDirFilter === "asc" ? " ↑" : " ↓"}`) });
    }
    return chips;
  }, [
    accountStatusFilter,
    commentRestrictedFilter,
    couponRestrictedFilter,
    dateFromFilter,
    dateToFilter,
    memberLevelIdFilter,
    orderCountMaxFilter,
    orderCountMinFilter,
    orderRestrictedFilter,
    phoneBoundFilter,
    pointsMaxFilter,
    pointsMinFilter,
    refundRateMaxFilter,
    refundRateMinFilter,
    search,
    selectedMemberLevelName,
    selectedTagId,
    selectedTagName,
    sortByFilter,
    sortDirFilter,
    L,
    userSortOptions,
    totalSpentMaxFilter,
    totalSpentMinFilter,
    wechatBoundFilter,
  ]);

  const tableHeaders = useMemo(
    () => [L("用户", "User"), L("手机号", "Phone"), L("状态", "Status"), L("会员等级", "Member level"), L("标签", "Tags"), L("邀请码", "Invite code"), L("上级邀请码", "Parent invite code"), L("积分", "Points"), L("注册时间", "Registered at"), L("操作", "Actions")],
    [L],
  );

  const usersEmptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.usersFiltered : ADMIN_EMPTY_GUIDES.users,
  );

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
    setDateFromFilter("");
    setDateToFilter("");
    setTotalSpentMinFilter("");
    setTotalSpentMaxFilter("");
    setOrderCountMinFilter("");
    setOrderCountMaxFilter("");
    setPointsMinFilter("");
    setPointsMaxFilter("");
    setRefundRateMinFilter("");
    setRefundRateMaxFilter("");
    setSortByFilter("");
    setSortDirFilter("desc");
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
    if (key === "dateFrom") setDateFromFilter("");
    if (key === "dateTo") setDateToFilter("");
    if (key === "totalSpentMin") setTotalSpentMinFilter("");
    if (key === "totalSpentMax") setTotalSpentMaxFilter("");
    if (key === "orderCountMin") setOrderCountMinFilter("");
    if (key === "orderCountMax") setOrderCountMaxFilter("");
    if (key === "pointsMin") setPointsMinFilter("");
    if (key === "pointsMax") setPointsMaxFilter("");
    if (key === "refundRateMin") setRefundRateMinFilter("");
    if (key === "refundRateMax") setRefundRateMaxFilter("");
    if (key === "sortBy") {
      setSortByFilter("");
      setSortDirFilter("desc");
    }
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      await userService.exportUsersCsv(queryParams);
      toast.success(L("已开始导出 CSV", "CSV export started"));
    } catch (error) {
      toast.error(toastErrorMessage(error, L("导出失败", "Export failed")));
    }
  };

  const handleDeleteTag = async (tag: UserTag) => {
    const impact = await userService.fetchUserTagImpact(tag.id).catch(() => tag.count || 0);
    confirm({
      title: L("确认删除标签", "Confirm tag deletion"),
      description: L(`该标签当前影响 ${impact} 位用户，确认删除？`, `This tag affects ${impact} users. Delete it?`),
      confirmText: L("删除", "Delete"),
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
    { label: L("匹配用户数", "Matched users"), value: String(total), highlight: filtersActive },
    { label: L("今日新增", "New today"), value: String(summary.todayNew || 0), highlight: false },
    { label: L("被邀请用户", "Invited users"), value: String(summary.invitedUsers || 0), highlight: false },
  ] as const;

  const isUserSelected = (userId: string) => selectedUserIds.includes(userId);

  const toggleUserSelection = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      if (!checked) return prev.filter((id) => id !== userId);
      return prev.includes(userId) ? prev : [...prev, userId];
    });
  };

  const allUsersOnPageSelected = users.length > 0 && users.every((user) => selectedUserIds.includes(user.id));

  const toggleAllUsersOnPage = (checked: boolean) => {
    const pageUserIds = users.map((user) => user.id);
    setSelectedUserIds((prev) => (
      checked
        ? [...new Set([...prev, ...pageUserIds])]
        : prev.filter((id) => !pageUserIds.includes(id))
    ));
  };

  const applyBatchTag = () => batchTagMutation.mutate();

  return {
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
    setSelectedUserIds,
    batchTagId,
    setBatchTagId,
    advancedFiltersOpen,
    setAdvancedFiltersOpen,
    tagDialogOpen,
    setTagDialogOpen,
    deletingTagId,
    usersQuery,
    tagsQuery,
    memberLevelsQuery,
    createTagMutation,
    deleteTagMutation,
    batchTagMutation,
    users,
    total,
    summary,
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
  };
}
