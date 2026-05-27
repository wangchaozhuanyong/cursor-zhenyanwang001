import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { useAdminT } from "@/hooks/useAdminT";
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

const USER_SORT_OPTIONS = [
  { value: "", label: "注册时间（默认）" },
  { value: "total_spent", label: "累计消费" },
  { value: "valid_order_count", label: "有效订单数" },
  { value: "last_purchase_at", label: "最近购买" },
  { value: "refund_rate", label: "退款率" },
] as const;

function trimOrUndef(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function useAdminUsers() {
  const { tText } = useAdminT();
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
    enabled: capabilities.memberLevelEnabled,
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
  const memberLevelsFromApi = memberLevelsQuery.data || [];
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
    if (dateFromFilter.trim()) chips.push({ key: "dateFrom", label: tText(`注册起：${dateFromFilter.trim()}`) });
    if (dateToFilter.trim()) chips.push({ key: "dateTo", label: tText(`注册止：${dateToFilter.trim()}`) });
    if (totalSpentMinFilter.trim()) chips.push({ key: "totalSpentMin", label: tText(`消费≥${totalSpentMinFilter.trim()}`) });
    if (totalSpentMaxFilter.trim()) chips.push({ key: "totalSpentMax", label: tText(`消费≤${totalSpentMaxFilter.trim()}`) });
    if (orderCountMinFilter.trim()) chips.push({ key: "orderCountMin", label: tText(`订单≥${orderCountMinFilter.trim()}`) });
    if (orderCountMaxFilter.trim()) chips.push({ key: "orderCountMax", label: tText(`订单≤${orderCountMaxFilter.trim()}`) });
    if (pointsMinFilter.trim()) chips.push({ key: "pointsMin", label: tText(`积分≥${pointsMinFilter.trim()}`) });
    if (pointsMaxFilter.trim()) chips.push({ key: "pointsMax", label: tText(`积分≤${pointsMaxFilter.trim()}`) });
    if (refundRateMinFilter.trim()) chips.push({ key: "refundRateMin", label: tText(`退款率≥${refundRateMinFilter.trim()}`) });
    if (refundRateMaxFilter.trim()) chips.push({ key: "refundRateMax", label: tText(`退款率≤${refundRateMaxFilter.trim()}`) });
    if (sortByFilter) {
      const sortLabel = USER_SORT_OPTIONS.find((o) => o.value === sortByFilter)?.label || sortByFilter;
      chips.push({ key: "sortBy", label: tText(`排序：${sortLabel}${sortDirFilter === "asc" ? " ↑" : " ↓"}`) });
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
    totalSpentMaxFilter,
    totalSpentMinFilter,
    wechatBoundFilter,
    tText,
  ]);

  const tableHeaders = useMemo(
    () => ["用户", "手机号", "状态", "会员等级", "标签", "邀请码", "上级邀请码", "积分", "注册时间", "操作"].map((h) => tText(h)),
    [tText],
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
      toast.success(tText("已开始导出 CSV"));
    } catch (error) {
      toast.error(toastErrorMessage(error, tText("导出失败")));
    }
  };

  const handleDeleteTag = async (tag: UserTag) => {
    const impact = await userService.fetchUserTagImpact(tag.id).catch(() => tag.count || 0);
    confirm({
      title: tText("确认删除标签"),
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
    userSortOptions: USER_SORT_OPTIONS,
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
