import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

export type UserFilterState = {
  search: string;
  selectedTagId: string;
  wechatBoundFilter: string;
  phoneBoundFilter: string;
  memberLevelIdFilter: string;
  accountStatusFilter: string;
  orderRestrictedFilter: string;
  couponRestrictedFilter: string;
  commentRestrictedFilter: string;
};

type UserFilterContext = {
  tagName?: string;
  memberLevelName?: string;
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  normal: "正常",
  disabled: "禁用登录",
  blacklisted: "黑名单",
};

function boundLabel(prefix: string, value: string) {
  if (value === "1") return `${prefix}：已绑定`;
  if (value === "0") return `${prefix}：未绑定`;
  return "";
}

function restrictedLabel(prefix: string, value: string) {
  if (value === "1") return `${prefix}：已限制`;
  if (value === "0") return `${prefix}：未限制`;
  return "";
}

export function hasActiveUserFilters(state: UserFilterState): boolean {
  return Boolean(
    state.search.trim()
    || state.selectedTagId
    || state.wechatBoundFilter
    || state.phoneBoundFilter
    || state.memberLevelIdFilter
    || state.accountStatusFilter
    || state.orderRestrictedFilter
    || state.couponRestrictedFilter
    || state.commentRestrictedFilter,
  );
}

export function buildUserFilterChips(
  state: UserFilterState,
  ctx: UserFilterContext = {},
): AdminFilterChip[] {
  const chips: AdminFilterChip[] = [];
  if (state.search.trim()) chips.push({ key: "search", label: `关键词：${state.search.trim()}` });
  if (state.selectedTagId) {
    chips.push({ key: "tag", label: `标签：${ctx.tagName || state.selectedTagId}` });
  }
  const wechat = boundLabel("微信", state.wechatBoundFilter);
  if (wechat) chips.push({ key: "wechat", label: wechat });
  const phone = boundLabel("手机号", state.phoneBoundFilter);
  if (phone) chips.push({ key: "phone", label: phone });
  if (state.memberLevelIdFilter) {
    chips.push({ key: "memberLevel", label: `会员：${ctx.memberLevelName || state.memberLevelIdFilter}` });
  }
  if (state.accountStatusFilter) {
    chips.push({
      key: "accountStatus",
      label: `账号：${ACCOUNT_STATUS_LABELS[state.accountStatusFilter] || state.accountStatusFilter}`,
    });
  }
  const orderR = restrictedLabel("下单", state.orderRestrictedFilter);
  if (orderR) chips.push({ key: "orderRestricted", label: orderR });
  const couponR = restrictedLabel("领券", state.couponRestrictedFilter);
  if (couponR) chips.push({ key: "couponRestricted", label: couponR });
  const commentR = restrictedLabel("评论", state.commentRestrictedFilter);
  if (commentR) chips.push({ key: "commentRestricted", label: commentR });
  return chips;
}

export function removeUserFilterChip(
  state: UserFilterState,
  key: string,
): Partial<UserFilterState> {
  switch (key) {
    case "search":
      return { search: "" };
    case "tag":
      return { selectedTagId: "" };
    case "wechat":
      return { wechatBoundFilter: "" };
    case "phone":
      return { phoneBoundFilter: "" };
    case "memberLevel":
      return { memberLevelIdFilter: "" };
    case "accountStatus":
      return { accountStatusFilter: "" };
    case "orderRestricted":
      return { orderRestrictedFilter: "" };
    case "couponRestricted":
      return { couponRestrictedFilter: "" };
    case "commentRestricted":
      return { commentRestrictedFilter: "" };
    default:
      return {};
  }
}
