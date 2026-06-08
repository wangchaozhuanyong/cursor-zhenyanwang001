import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { useGoBack } from "@/hooks/useGoBack";
import * as memberBenefitsService from "@/services/memberBenefitsService";
import type { MemberBenefitsLevel, MemberBenefitsOverview } from "@/services/memberBenefitsService";
import type { MemberLevel } from "@/types/user";
import { computeUpgradeProgress, formatLevelRequirement } from "@/utils/memberBenefitPresentation";
import "./MemberBenefits.css";

type BenefitCard = {
  key: "service" | "discount" | "points" | "shipping";
  title: string;
  lines: string[];
};

const BENEFIT_CARDS: BenefitCard[] = [
  { key: "service", title: "专属服务", lines: ["专属客服", "优先响应"] },
  { key: "discount", title: "专属折扣", lines: ["会员专享", "超值优惠"] },
  { key: "points", title: "积分加速", lines: ["下单积分", "加速累积"] },
  { key: "shipping", title: "免邮权益", lines: ["满额免邮", "轻松购物"] },
];

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

function formatCompactMoney(value?: number | null): string {
  const amount = Number(value ?? 0);
  return `RM ${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;
}

function hasUsefulText(value?: string | null): value is string {
  return Boolean(value && value.trim() && !/^\?+$/.test(value.trim()));
}

function buildUpgradeIntro(currentLevel?: MemberLevel | null, nextLevel?: MemberLevel | null): string {
  if (!nextLevel) return "你已达到当前最高会员等级";

  const spent = Number(currentLevel?.min_spent ?? 0);
  const orders = Number(currentLevel?.min_orders ?? 0);
  const parts: string[] = [];
  if (spent > 0) parts.push(`累计消费 ${formatCompactMoney(spent)}`);
  if (orders > 0) parts.push(`完成 ${orders} 笔订单后`);

  if (!parts.length) return "满足升级条件后";
  return parts.join(" 或 ");
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
      距离 <b>{nextLevel.name}</b> 还差 {formatMoney(spent)} 消费或 {orders} 笔有效订单
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

function tierKind(level: MemberLevel, current: boolean): "basic" | "silver" | "gold" | "purple" {
  const label = `${level.id || ""} ${level.name || ""}`.toLowerCase();
  if (current || label.includes("gold") || label.includes("黄金") || label.includes("金卡")) return "gold";
  if (label.includes("diamond") || label.includes("钻石")) return "purple";
  if (label.includes("silver") || label.includes("白银") || label.includes("银")) return "silver";
  return "basic";
}

function buildTierDescription(level: MemberBenefitsLevel, isLast: boolean): string {
  if (hasUsefulText(level.description)) return level.description.trim();
  if (level.is_default || (Number(level.min_spent ?? 0) <= 0 && Number(level.min_orders ?? 0) <= 0)) {
    return "注册后默认为普通会员等级";
  }
  if (isLast) return "符合条件可享受全部权益";

  const parts: string[] = [];
  const spent = Number(level.min_spent ?? 0);
  const orders = Number(level.min_orders ?? 0);
  if (spent > 0) parts.push(`累计消费 ${formatCompactMoney(spent)}`);
  if (orders > 0) parts.push(`完成 ${orders} 笔订单后`);
  return parts.length ? `${parts.join(" 或 ")}可升级` : "享受平台基础会员服务与活动权益";
}

function CrownEmblem() {
  return (
    <div className="rank-emblem" aria-hidden="true">
      <div className="emblem-core">
        <span className="emblem-shine" />
        <svg viewBox="0 0 64 64" fill="none">
          <path
            d="M15 40h34l4-22-11 9-10-15-10 15-11-9 4 22Z"
            fill="url(#memberBenefitsCrownGold)"
            stroke="#fff0bc"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M18 45h28" stroke="#fff0bc" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M32 48l9-9H23l9 9Z"
            fill="#f2c76f"
            stroke="#fff0bc"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="memberBenefitsCrownGold" x1="14" y1="12" x2="52" y2="45">
              <stop stopColor="#FFF0B7" />
              <stop offset="0.42" stopColor="#E2A337" />
              <stop offset="1" stopColor="#FFF1BA" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function CurrentLevelBadge() {
  return (
    <span className="current-pill">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 1.5l6.2 4.2L8 14.5 1.8 5.7 8 1.5Z" />
      </svg>
      当前等级
    </span>
  );
}

function BenefitIcon({ type }: { type: BenefitCard["key"] }) {
  if (type === "service") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M4 13a8 8 0 0 1 16 0" strokeLinecap="round" />
        <path d="M5 13v4a2 2 0 0 0 2 2h1v-8H7a2 2 0 0 0-2 2Z" />
        <path d="M19 13v4a2 2 0 0 1-2 2h-1v-8h1a2 2 0 0 1 2 2Z" />
        <path d="M12 19h3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "discount") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M4 5h8l8 8-8 8-8-8V5Z" strokeLinejoin="round" />
        <path d="M8.5 8.5h.01" />
        <path d="M9 16l6-6" strokeLinecap="round" />
        <path d="M10 10.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        <path d="M14 15.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      </svg>
    );
  }

  if (type === "points") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M4 18h16" strokeLinecap="round" />
        <path d="M6 16l4-5 4 3 5-8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 6h3v3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 18v-3M12 18v-5M17 18v-7" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M3 7h11v10H3V7Z" strokeLinejoin="round" />
      <path d="M14 11h3l4 4v2h-7v-6Z" strokeLinejoin="round" />
      <path d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M8.5 11.2l1.6 1.6 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TierIcon({ kind }: { kind: "basic" | "silver" | "gold" | "purple" }) {
  if (kind === "basic") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "silver") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 3Z" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M12 3l8 5-8 13L4 8l8-5Z" strokeLinejoin="round" />
      <path d="M4 8h16M8 8l4 13 4-13M9 3l-1 5M15 3l1 5" strokeLinejoin="round" />
    </svg>
  );
}

function LoadingContent() {
  return (
    <>
      <section className="hero-card member-skeleton-card" aria-busy="true">
        <div className="hero-top">
          <div className="member-skeleton-circle" />
          <div className="hero-main">
            <div className="member-skeleton-line member-skeleton-line-lg" />
            <div className="member-skeleton-line member-skeleton-line-sm" />
            <div className="member-skeleton-line member-skeleton-line-md" />
          </div>
          <div className="hero-stats">
            <div className="member-skeleton-line member-skeleton-line-sm" />
            <div className="member-skeleton-line member-skeleton-line-md" />
          </div>
        </div>
        <div className="hero-divider" />
        <div className="member-skeleton-line member-skeleton-line-full" />
        <div className="progress-bar">
          <div className="progress-fill member-skeleton-fill" />
        </div>
      </section>

      <section className="benefit-grid" aria-busy="true">
        {BENEFIT_CARDS.map((card) => (
          <article className="benefit-card" key={card.key}>
            <div className="benefit-icon member-skeleton-icon" />
            <div>
              <div className="member-skeleton-line member-skeleton-line-md" />
              <div className="member-skeleton-line member-skeleton-line-sm" />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function ErrorState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <section className="member-error-card">
      <p className="member-error-title">会员权益暂时加载失败</p>
      <p className="member-error-copy">网络或登录状态可能刚好不稳定，请重新加载一次。</p>
      <button type="button" className="member-retry-btn" onClick={onRetry} disabled={retrying}>
        <RefreshCw size={16} className={retrying ? "member-retry-spin" : undefined} />
        <span>{retrying ? "加载中" : "重新加载"}</span>
      </button>
    </section>
  );
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
  const currentName = currentLevel?.name || "普通会员";
  const upgradeIntro = buildUpgradeIntro(currentLevel, nextLevel);

  return (
    <StoreAccountLayout
      title="会员权益"
      onBack={goBack}
      className="member-account-shell"
      mainClassName="member-account-main"
    >
      <div className="member-page-shell">
      <main className="member-page">
        <div className="page-inner">
          <header className="nav">
            <button type="button" className="back-btn" aria-label="返回" onClick={goBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M15 5L8 12l7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="page-title">会员权益</h1>
          </header>

          {failed ? (
            <ErrorState onRetry={() => void benefitsQuery.refetch()} retrying={benefitsQuery.isFetching} />
          ) : null}

          {!failed && loading ? <LoadingContent /> : null}

          {!failed && !loading ? (
            <>
              <section className="hero-card">
                <div className="hero-top">
                  <CrownEmblem />

                  <div className="hero-main">
                    <div className="level-row">
                      <h2 className="level-name">{currentName}</h2>
                      <CurrentLevelBadge />
                    </div>
                  </div>

                  <div className="hero-stats">
                    <p className="stat-label">当前有效消费</p>
                    <p className="stat-money">{formatMoney(data?.stats?.total_spent)}</p>

                    <p className="stat-label">有效订单</p>
                    <p className="stat-order">{Number(data?.stats?.order_count ?? 0)} 笔</p>
                  </div>

                  <p className="hero-copy">
                    <span className="upgrade-line upgrade-line--intro">{upgradeIntro}</span>
                    {nextLevel ? (
                      <span className="upgrade-line upgrade-line--next">
                        可升级至 <span className="next-level">{nextLevel.name}</span>
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="hero-divider" />

                <div className="progress-header">
                  <div className="progress-title">升级进度</div>
                  <div className="progress-percent">{progressPercent}%</div>
                </div>

                <p className="progress-desc">{buildProgressDesc(data)}</p>

                <div className="progress-bar" aria-label={`升级进度 ${progressPercent}%`}>
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </section>

              <section className="benefit-grid">
                {BENEFIT_CARDS.map((card) => (
                  <article className="benefit-card" key={card.key}>
                    <div className="benefit-icon">
                      <BenefitIcon type={card.key} />
                    </div>
                    <div>
                      <h3 className="benefit-title">{card.title}</h3>
                      <p className="benefit-sub">
                        {card.lines[0]}
                        <br />
                        {card.lines[1]}
                      </p>
                    </div>
                    <span className="chevron" aria-hidden="true" />
                  </article>
                ))}
              </section>

              <section>
                <div className="section-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 18h16l2-11-6 4-4-7-4 7-6-4 2 11Zm1 3h14v-2H5v2Z" />
                  </svg>
                  等级权益对比
                  <span className="sparkles" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                </div>

                <div className="tier-list">
                  {displayLevels.map((level, index) => {
                    const current = isCurrentLevel(level, currentLevel);
                    const kind = tierKind(level, current);
                    return (
                      <article className={`tier-card${current ? " current" : ""}`} key={level.id || level.name}>
                        <div className={`tier-icon ${kind}`}>
                          <TierIcon kind={kind} />
                        </div>

                        <div className="tier-content">
                          <div className="tier-heading">
                            <h3 className="tier-name">{level.name}</h3>
                            {current ? <span className="tier-badge">当前等级</span> : null}
                          </div>
                          <p className="tier-desc">
                            升级条件：{formatLevelRequirement(level)}
                            <br />
                            权益：{buildTierDescription(level, index === displayLevels.length - 1)}
                          </p>
                        </div>

                        <span className="tier-arrow" aria-hidden="true" />
                      </article>
                    );
                  })}
                </div>

                <div className="footer-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3Z" />
                    <path d="M9 12l2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  有效消费与有效订单将于完成后自动统计
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
      </div>
    </StoreAccountLayout>
  );
}
