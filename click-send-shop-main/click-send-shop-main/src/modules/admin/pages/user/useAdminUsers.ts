import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { useAdminT } from "@/hooks/useAdminT";
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

export function useAdminUsers() {
  const { tText } = useAdminT();
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
    setSelectedUserIds((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  };

  const allUsersOnPageSelected = users.length > 0 && selectedUserIds.length === users.length;

  const toggleAllUsersOnPage = (checked: boolean) => {
    setSelectedUserIds(checked ? users.map((user) => user.id) : []);
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
