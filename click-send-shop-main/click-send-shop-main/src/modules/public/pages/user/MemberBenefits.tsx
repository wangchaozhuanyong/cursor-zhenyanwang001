import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { useGoBack } from "@/hooks/useGoBack";
import * as memberBenefitsService from "@/services/memberBenefitsService";
import type { MemberBenefitsLevel, MemberBenefitsOverview } from "@/services/memberBenefitsService";
import type { MemberLevel } from "@/types/user";
import {
  benefitIcon,
  buildBenefitHighlightsFromLevel,
  computeUpgradeProgress,
  formatLevelRequirement,
} from "@/utils/memberBenefitPresentation";
import {
  isInternalStorefrontCopy,
  storefrontDisplayText,
  storefrontOptionalDisplayText,
} from "@/utils/storefrontCopySanitizer";
import MemberBenefitsView, {
  type MemberBenefitViewItem,
  type MemberBenefitsViewState,
  type MemberLevelViewItem,
} from "./MemberBenefitsView";
import "./member-benefits.next.css";

const FALLBACK_LEVELS: MemberBenefitsLevel[] = [
  {
    id: "normal",
    name: "普通会员",
    min_spent: 0,
    min_orders: 0,
    sort_order: 0,
    is_default: true,
    description: "注册后默认为普通会员等级",
    benefits: [],
  },
  {
    id: "silver",
    name: "白银会员",
    min_spent: 500,
    min_orders: 3,
    sort_order: 1,
    description: "累计消费 RM 500 或完成 3 笔订单后可升级",
    benefits: [],
  },
  {
    id: "gold",
    name: "黄金会员",
    min_spent: 5000,
    min_orders: 8,
    sort_order: 2,
    description: "累计消费 RM 5000 或完成 8 笔订单后可升级",
    benefits: [],
  },
  {
    id: "diamond",
    name: "钻石会员",
    min_spent: 10000,
    min_orders: 20,
    sort_order: 3,
    description: "符合条件可享受全部权益",
    benefits: [],
  },
];

function formatMoney(value?: number | null, digits = 2): string {
  return `RM ${Number(value ?? 0).toFixed(digits)}`;
}

function hasUsefulText(value?: string | null): value is string {
  return Boolean(value && value.trim() && !/^\?+$/.test(value.trim()) && !isInternalStorefrontCopy(value));
}

function displayLevelName(level?: MemberLevel | null, fallback = "会员等级"): string {
  return storefrontDisplayText(level?.name, fallback);
}

function buildProgressDesc(data: MemberBenefitsOverview | null): JSX.Element {
  const nextLevel = data?.next_level;
  if (!nextLevel) {
    return <>当前已经是最高会员等级，所有可用权益将自动保留</>;
  }

  const spent = Number(data?.growth_to_next_level ?? 0);
  const orders = Number(data?.orders_to_next_level ?? 0);
  return (
    <>
      距离 <b>{displayLevelName(nextLevel, "下一等级")}</b> 还差 {formatMoney(spent)} 消费或 {orders} 笔有效订单
    </>
  );
}

function orderedDisplayLevels(data: MemberBenefitsOverview | null): MemberBenefitsLevel[] {
  const levels = [...(data?.all_levels || [])].sort((a, b) => {
    const orderDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;

    const spentDiff = Number(a.min_spent ?? 0) - Number(b.min_spent ?? 0);
    if (spentDiff !== 0) return spentDiff;

    return Number(a.min_orders ?? 0) - Number(b.min_orders ?? 0);
  });

  if (!levels.length) return FALLBACK_LEVELS;
  return levels.slice(0, 4);
}

function isCurrentLevel(level: MemberLevel, currentLevel?: MemberLevel | null): boolean {
  if (!currentLevel) return false;
  if (level.id === currentLevel.id) return true;
  return Boolean(level.name && currentLevel.name && level.name === currentLevel.name);
}

function buildBenefitItems(level?: MemberBenefitsLevel | null): MemberBenefitViewItem[] {
  const configuredBenefits = (level?.benefits || [])
    .map((benefit) => {
      const title = storefrontOptionalDisplayText(benefit.name);
      const description = storefrontOptionalDisplayText(benefit.description);
      if (!hasUsefulText(title) && !hasUsefulText(description)) return null;
      return {
        id: `${benefit.type || "benefit"}-${title || description}`,
        title: hasUsefulText(title) ? title : "会员权益",
        description: hasUsefulText(description) ? description : undefined,
        icon: benefitIcon(benefit.type),
      };
    })
    .filter((item): item is MemberBenefitViewItem => Boolean(item));

  if (configuredBenefits.length) return configuredBenefits.slice(0, 4);

  return buildBenefitHighlightsFromLevel(level).map((item) => ({
    id: item.label,
    title: item.label,
    description: item.value,
    icon: item.icon,
  }));
}

function buildLevelItems(
  displayLevels: MemberBenefitsLevel[],
  currentLevel?: MemberBenefitsLevel | null,
  nextLevel?: MemberLevel | null,
): MemberLevelViewItem[] {
  return displayLevels.map((level, index) => ({
    id: String(level.id),
    name: displayLevelName(level, FALLBACK_LEVELS[index]?.name || `等级 ${index + 1}`),
    state: isCurrentLevel(level, currentLevel)
      ? "current"
      : level.id === nextLevel?.id
        ? "next"
        : "future",
  }));
}

export default function MemberBenefits() {
  const goBack = useGoBack("/profile");
  const benefitsQuery = useQuery<MemberBenefitsOverview>({
    queryKey: memberBenefitsService.memberBenefitsQueryKey,
    queryFn: memberBenefitsService.fetchMemberBenefits,
  });

  const data = benefitsQuery.data ?? null;
  const loading = benefitsQuery.isLoading && !data;
  const failed = benefitsQuery.isError && !data;
  const currentLevel = data?.current_level;
  const nextLevel = data?.next_level;
  const progressPercent = useMemo(() => computeUpgradeProgress(data), [data]);
  const displayLevels = useMemo(() => orderedDisplayLevels(data), [data]);
  const benefits = useMemo(() => buildBenefitItems(currentLevel), [currentLevel]);
  const levels = useMemo(() => buildLevelItems(displayLevels, currentLevel, nextLevel), [displayLevels, currentLevel, nextLevel]);
  const state: MemberBenefitsViewState = failed ? "error" : loading ? "loading" : currentLevel ? "ready" : "empty";

  return (
    <StoreAccountLayout
      title="会员权益"
      onBack={goBack}
      className="sf-next-page store-v12-page store-account-subpage-v12-page store-member-benefits-v12-page"
      mainClassName="sf-next-account-main store-member-benefits-v12-main"
    >
      <MemberBenefitsView
        state={state}
        currentLevelName={displayLevelName(currentLevel, "普通会员")}
        totalSpentLabel={formatMoney(data?.stats?.total_spent)}
        validOrderCountLabel={`${Number(data?.stats?.order_count ?? 0)} 笔`}
        progressPercent={progressPercent}
        progressDescription={buildProgressDesc(data)}
        benefits={benefits}
        levels={levels}
        nextLevelRequirement={nextLevel ? formatLevelRequirement(nextLevel) : undefined}
        claimableBenefits={[]}
        retrying={benefitsQuery.isFetching}
        onRetry={() => void benefitsQuery.refetch()}
      />
    </StoreAccountLayout>
  );
}
