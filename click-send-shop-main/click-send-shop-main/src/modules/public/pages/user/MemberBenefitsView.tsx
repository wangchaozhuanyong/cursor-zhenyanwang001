import type { ReactNode } from "react";
import {
  BadgePercent,
  Gift,
  Info,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MemberBenefitsViewState = "ready" | "loading" | "empty" | "guest" | "error";

export type MemberBenefitViewItem = {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
};

export type MemberLevelViewItem = {
  id: string;
  name: string;
  state?: "current" | "next" | "future";
};

export type ClaimableBenefitViewItem = {
  id: string;
  title: string;
  description?: string;
  actionLabel?: string;
  disabled?: boolean;
};

export type MemberBenefitsViewProps = {
  state: MemberBenefitsViewState;
  currentLevelName: string;
  totalSpentLabel: string;
  validOrderCountLabel: string;
  progressPercent: number;
  progressDescription: ReactNode;
  benefits: MemberBenefitViewItem[];
  levels: MemberLevelViewItem[];
  nextLevelRequirement?: ReactNode;
  claimableBenefits?: ClaimableBenefitViewItem[];
  retrying?: boolean;
  className?: string;
  onRetry?: () => void;
  onLogin?: () => void;
  onClaimBenefit?: (benefitId: string) => void;
};

const FALLBACK_ICONS: LucideIcon[] = [ShieldCheck, BadgePercent, Sparkles, Truck];

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function MemberFolio({
  currentLevelName,
  totalSpentLabel,
  validOrderCountLabel,
  progressPercent,
  progressDescription,
}: Pick<
  MemberBenefitsViewProps,
  "currentLevelName" | "totalSpentLabel" | "validOrderCountLabel" | "progressPercent" | "progressDescription"
>) {
  const progress = clampProgress(progressPercent);

  return (
    <section className="sc-benefits__folio" aria-label="当前会员等级">
      <div className="sc-benefits__folio-top">
        <span className="sc-benefits__folio-kicker">MEMBER FOLIO</span>
        <span className="sc-benefits__level-chip">
          <span aria-hidden="true">◇</span>
          当前等级
        </span>
      </div>

      <h2 className="sc-benefits__level-name">{currentLevelName}</h2>

      <div className="sc-benefits__progress-heading">
        <span>升级进度</span>
        <strong>{progress}%</strong>
      </div>

      <div
        className="sc-benefits__progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <p className="sc-benefits__progress-description">{progressDescription}</p>

      <div className="sc-benefits__stats">
        <div className="sc-benefits__stat">
          <strong>{totalSpentLabel}</strong>
          <span>当前有效消费</span>
        </div>

        <div className="sc-benefits__stat">
          <strong>{validOrderCountLabel}</strong>
          <span>有效订单</span>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="sc-benefits__section-heading">
      <h2>{title}</h2>
      {meta ? <span>{meta}</span> : null}
    </div>
  );
}

function BenefitGrid({ items }: { items: MemberBenefitViewItem[] }) {
  if (!items.length) {
    return (
      <div className="sc-benefits__empty-benefits">
        <Gift aria-hidden="true" />
        <div>
          <strong>当前等级暂无配置权益</strong>
          <span>权益更新后会自动显示</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-benefits__benefit-grid">
      {items.slice(0, 4).map((item, index) => {
        const Icon = item.icon ?? FALLBACK_ICONS[index % 4];

        return (
          <article key={item.id} className="sc-benefits__benefit-item">
            <span className="sc-benefits__benefit-icon">
              <Icon aria-hidden="true" />
            </span>

            <div className="sc-benefits__benefit-copy">
              <strong>{item.title}</strong>
              {item.description ? <span>{item.description}</span> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function LevelPath({ levels, nextLevelRequirement }: Pick<MemberBenefitsViewProps, "levels" | "nextLevelRequirement">) {
  if (!levels.length) return null;

  return (
    <div className="sc-benefits__level-sheet">
      <div
        className="sc-benefits__level-track"
        style={{ gridTemplateColumns: `repeat(${Math.min(levels.length, 4)}, minmax(0, 1fr))` }}
      >
        {levels.slice(0, 4).map((level) => (
          <div key={level.id} className="sc-benefits__level-node" data-state={level.state ?? "future"}>
            <span className="sc-benefits__level-dot" />
            <strong>{level.name}</strong>
          </div>
        ))}
      </div>

      {nextLevelRequirement ? (
        <div className="sc-benefits__upgrade-rule">
          <span>下一等级</span>
          <strong>{nextLevelRequirement}</strong>
        </div>
      ) : null}
    </div>
  );
}

function ClaimableBenefits({
  items,
  onClaimBenefit,
}: {
  items: ClaimableBenefitViewItem[];
  onClaimBenefit?: (benefitId: string) => void;
}) {
  if (!items.length) {
    return (
      <div className="sc-benefits__claim-row">
        <span className="sc-benefits__claim-icon">
          <Gift aria-hidden="true" />
        </span>

        <div className="sc-benefits__claim-copy">
          <strong>当前没有待领取权益</strong>
          <span>有新权益时将在这里显示</span>
        </div>

        <span className="sc-benefits__claim-count">-</span>
      </div>
    );
  }

  return (
    <div className="sc-benefits__claim-list">
      {items.map((item) => (
        <article key={item.id} className="sc-benefits__claim-row">
          <span className="sc-benefits__claim-icon">
            <Gift aria-hidden="true" />
          </span>

          <div className="sc-benefits__claim-copy">
            <strong>{item.title}</strong>
            {item.description ? <span>{item.description}</span> : null}
          </div>

          {item.actionLabel ? (
            <button
              type="button"
              disabled={item.disabled}
              className="sc-benefits__claim-button"
              onClick={() => onClaimBenefit?.(item.id)}
            >
              {item.actionLabel}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="sc-benefits__loading" aria-label="会员权益加载中" aria-busy="true">
      <div className="sc-benefits__skeleton sc-benefits__skeleton--folio" />
      <div className="sc-benefits__skeleton sc-benefits__skeleton--title" />
      <div className="sc-benefits__skeleton sc-benefits__skeleton--grid" />
      <div className="sc-benefits__skeleton sc-benefits__skeleton--title" />
      <div className="sc-benefits__skeleton sc-benefits__skeleton--levels" />
      <div className="sc-benefits__skeleton sc-benefits__skeleton--title" />
      <div className="sc-benefits__skeleton sc-benefits__skeleton--claim" />
    </div>
  );
}

function MessageView({
  kind,
  retrying,
  onRetry,
  onLogin,
}: {
  kind: "guest" | "error";
  retrying?: boolean;
  onRetry?: () => void;
  onLogin?: () => void;
}) {
  const guest = kind === "guest";

  return (
    <section className="sc-benefits__message">
      <span className="sc-benefits__message-icon" data-kind={kind}>
        {guest ? <LockKeyhole aria-hidden="true" /> : <Info aria-hidden="true" />}
      </span>

      <h2>{guest ? "登录后查看会员权益" : "会员权益暂时加载失败"}</h2>

      <p>
        {guest
          ? "会员等级、升级进度和已配置权益会在登录后展示。"
          : "保留当前页面结构，重新加载不会改变路由或交易状态。"}
      </p>

      <button
        type="button"
        className="sc-benefits__message-button"
        disabled={!guest && retrying}
        onClick={guest ? onLogin : onRetry}
      >
        {!guest && retrying ? <RefreshCw className="sc-benefits__retry-icon" aria-hidden="true" /> : null}
        {guest ? "登录" : retrying ? "加载中" : "重新加载"}
      </button>
    </section>
  );
}

export default function MemberBenefitsView({
  state,
  currentLevelName,
  totalSpentLabel,
  validOrderCountLabel,
  progressPercent,
  progressDescription,
  benefits,
  levels,
  nextLevelRequirement,
  claimableBenefits = [],
  retrying,
  className,
  onRetry,
  onLogin,
  onClaimBenefit,
}: MemberBenefitsViewProps) {
  if (state === "loading") {
    return (
      <div className={cn("sc-benefits", className)}>
        <LoadingView />
      </div>
    );
  }

  if (state === "guest" || state === "error") {
    return (
      <div className={cn("sc-benefits", className)}>
        <MessageView kind={state} retrying={retrying} onRetry={onRetry} onLogin={onLogin} />
      </div>
    );
  }

  const visibleBenefits = state === "empty" ? [] : benefits;

  return (
    <div className={cn("sc-benefits", className)}>
      <MemberFolio
        currentLevelName={currentLevelName}
        totalSpentLabel={totalSpentLabel}
        validOrderCountLabel={validOrderCountLabel}
        progressPercent={progressPercent}
        progressDescription={progressDescription}
      />

      <section className="sc-benefits__section">
        <SectionHeading title="当前权益" meta={`${visibleBenefits.length} 项`} />
        <BenefitGrid items={visibleBenefits} />
      </section>

      {levels.length ? (
        <section className="sc-benefits__section">
          <SectionHeading title="等级路径" meta="升级条件" />
          <LevelPath levels={levels} nextLevelRequirement={nextLevelRequirement} />
        </section>
      ) : null}

      <section className="sc-benefits__section">
        <SectionHeading title="可领取权益" meta={`${claimableBenefits.length} 项`} />
        <ClaimableBenefits items={claimableBenefits} onClaimBenefit={onClaimBenefit} />
      </section>

      <p className="sc-benefits__note">
        <Info aria-hidden="true" />
        <span>有效消费与有效订单将在订单完成后自动统计，权益以当前会员配置为准。</span>
      </p>
    </div>
  );
}
