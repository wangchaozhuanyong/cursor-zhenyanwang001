import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Clock, Loader2, Package, Tag, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import StoreButton from "@/components/ui/StoreButton";
import {
  formatCouponActionLabel,
  getCouponCardPresentation,
  resolveCouponCardLayout,
  type CouponCardLayout,
} from "@/utils/couponCardTheme";

interface PremiumCouponCardProps {
  title: string;
  /** @deprecated 请使用 amount */
  amountPrefix?: string;
  amount: string;
  /** @deprecated 请使用 minSpendText */
  conditionText?: string;
  minSpendText?: string;
  expireText: string;
  scopeText?: string;
  /** @deprecated 未使用 */
  badge?: string;
  statusLabel?: string;
  actionLabel?: string;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  /** 展示密度；优先于 compact / homeCompact */
  layout?: CouponCardLayout;
  /** @deprecated 请使用 layout="compact" */
  compact?: boolean;
  /** @deprecated 请使用 layout="home" */
  homeCompact?: boolean;
  colorScheme?: "auto" | "invite";
  /** 右侧信息区字段顺序：默认名称在前；thresholdFirst 为门槛在前 */
  infoFieldOrder?: "titleFirst" | "thresholdFirst";
  className?: string;
  onClick?: () => void;
  onAction?: () => void;
}

type CouponTemplate = "cash" | "newcomer" | "threshold" | "timer" | "soft";

function resolveCouponTemplate(input: {
  title: string;
  amount: string;
  minSpendText: string;
  expireText: string;
  statusLabel?: string;
  actionLabel?: string;
}): CouponTemplate {
  const text = `${input.title} ${input.amount} ${input.minSpendText} ${input.expireText} ${input.statusLabel ?? ""} ${input.actionLabel ?? ""}`.toLowerCase();
  if (/限时|倒计时|秒杀|today|timer|expire|过期/.test(text)) return "timer";
  if (/免邮|shipping|运费/.test(text)) return "soft";
  if (/new|新人|注册|welcome|gift|礼/.test(text)) return "newcomer";
  if (/%|折|discount|off|满|spend/.test(text)) return "threshold";
  return "cash";
}

function VerticalActionLabel({ label }: { label: string }) {
  const chars = Array.from(label);
  return (
    <span className="inline-flex flex-col items-center justify-center gap-0 leading-none tracking-tight">
      {chars.map((ch, i) => (
        <span key={`${ch}-${i}`} className="block text-[11px] font-semibold leading-[1.15]">
          {ch}
        </span>
      ))}
    </span>
  );
}

function HorizontalActionLabel({ label }: { label: string }) {
  return (
    <span className="block max-w-full text-center text-[11px] font-bold leading-tight sm:text-xs">
      {label}
    </span>
  );
}

function RoundActionLabel({ label }: { label: string }) {
  const text = label.trim();
  const lines = text.length > 2 && text.length <= 4
    ? [text.slice(0, 2), text.slice(2)]
    : [text];

  return (
    <span className="store-coupon-card__round-action-label">
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>{line}</span>
      ))}
    </span>
  );
}

function CouponValueFace({
  leftValue,
  amountRmMatch,
  amountSize,
  layout,
}: {
  leftValue: string;
  amountRmMatch: RegExpMatchArray | null;
  amountSize: string;
  layout: CouponCardLayout;
}) {
  const percentMatch = leftValue.match(/^(\d+(?:\.\d+)?)%$/);
  const kicker = percentMatch ? "折扣券" : amountRmMatch ? "现金券" : "专属券";
  const note = layout === "home" ? (percentMatch ? "DISCOUNT" : "COUPON") : percentMatch ? "专属折扣" : "购物优惠";

  return (
    <div className="store-coupon-card__value-face" aria-label={leftValue}>
      <span className="store-coupon-card__value-kicker">{kicker}</span>
      <p className="store-coupon-card__value-main">
        {percentMatch ? (
          <>
            <span className={cn("store-coupon-card__value-number", amountSize)}>{percentMatch[1]}</span>
            <span className="store-coupon-card__value-unit">%</span>
          </>
        ) : amountRmMatch ? (
          <>
            <span className="store-coupon-card__value-currency">{amountRmMatch[1].toUpperCase()}</span>
            <span className={cn("store-coupon-card__value-number", amountSize)}>{amountRmMatch[2]}</span>
          </>
        ) : (
          <span className={cn("store-coupon-card__value-number", amountSize)}>{leftValue}</span>
        )}
      </p>
      <span className="store-coupon-card__value-note">{note}</span>
    </div>
  );
}

function CouponInfoRow({
  icon: Icon,
  children,
  prominent = false,
  mutedClass,
  iconClass,
  titleClass,
}: {
  icon: LucideIcon;
  children: ReactNode;
  prominent?: boolean;
  mutedClass: string;
  iconClass: string;
  titleClass?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-[var(--theme-border)] bg-[var(--theme-bg)]"
        aria-hidden
      >
        <Icon size={10} className={iconClass} strokeWidth={1.75} />
      </span>
      <p
        className={cn(
          "min-w-0 flex-1 leading-snug",
          prominent
            ? cn("store-card-title line-clamp-2 font-bold", titleClass)
            : cn("store-micro truncate", mutedClass),
        )}
      >
        {children}
      </p>
    </div>
  );
}

export default function PremiumCouponCard({
  title,
  amountPrefix = "",
  amount,
  conditionText,
  minSpendText: minSpendTextProp,
  expireText,
  scopeText = "适用范围：全场商品",
  statusLabel,
  actionLabel,
  actionLoading = false,
  actionDisabled = false,
  disabled = false,
  selected = false,
  layout: layoutProp,
  compact = false,
  homeCompact = false,
  colorScheme = "auto",
  infoFieldOrder = "titleFirst",
  className = "",
  onClick,
  onAction,
}: PremiumCouponCardProps) {
  const { themeConfig } = useThemeRuntime();
  const layout = resolveCouponCardLayout({ layout: layoutProp, compact, homeCompact });
  const skin = getCouponCardPresentation(themeConfig.couponStyle, layout, colorScheme === "invite");

  const minSpendText = minSpendTextProp ?? conditionText ?? "无门槛可用";
  const leftValue = `${amountPrefix}${amount}`.trim();
  const amountRmMatch = leftValue.match(/^(RM)\s*(.+)$/i);
  const expireLabel = expireText.includes("有效期") ? expireText : `有效期至：${expireText}`;
  const displayActionLabel = actionLabel ? formatCouponActionLabel(actionLabel, layout) : "";
  const normalizedActionLabel = displayActionLabel.replace(/\s+/g, "");
  const normalizedStatusLabel = (statusLabel ?? "").replace(/\s+/g, "");
  const isOwnedUseAction = normalizedStatusLabel === "已领取" && normalizedActionLabel === "使用";
  const actionHasStatus = layout === "home" && Boolean(statusLabel && displayActionLabel && !isOwnedUseAction);
  const couponTemplate = resolveCouponTemplate({
    title,
    amount: leftValue,
    minSpendText,
    expireText,
    statusLabel,
    actionLabel: displayActionLabel,
  });
  const couponState = disabled ? "disabled" : actionLoading ? "loading" : statusLabel ? "owned" : displayActionLabel ? "ready" : "idle";

  const infoRows: Array<{ icon: LucideIcon; prominent: boolean; text: string }> = infoFieldOrder === "thresholdFirst"
    ? [
        { icon: Wallet, prominent: false, text: minSpendText },
        { icon: Tag, prominent: true, text: title },
        { icon: Clock, prominent: false, text: expireLabel },
      ]
    : [
        { icon: Tag, prominent: true, text: title },
        { icon: Wallet, prominent: false, text: minSpendText },
        { icon: Clock, prominent: false, text: expireLabel },
      ];
  if (skin.showScope) {
    infoRows.push({ icon: Package, prominent: false, text: scopeText });
  }

  const actionButtonInner = actionLoading ? (
    <Loader2 size={layout === "home" ? 14 : 16} className="animate-spin shrink-0" />
  ) : layout === "home" ? (
    <RoundActionLabel label={displayActionLabel} />
  ) : skin.actionLayout === "vertical" ? (
    <VerticalActionLabel label={displayActionLabel} />
  ) : (
    <HorizontalActionLabel label={displayActionLabel} />
  );

  const actionButton = displayActionLabel ? (
    skin.useThemedMarketingShell ? (
      <button
        type="button"
        disabled={actionDisabled || actionLoading || disabled}
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        className={cn(
          "store-coupon-card__action-button",
          skin.actionButtonClass,
          actionHasStatus && "!h-auto !min-h-[2.45rem] flex-1 !rounded-md !py-1",
        )}
        style={{ background: "var(--theme-coupon-card-cta-bg)" }}
        data-coupon-action-button
      >
        {actionButtonInner}
      </button>
    ) : (
      <StoreButton
        size={layout === "default" ? "md" : "sm"}
        variant="primary"
        disabled={actionDisabled || actionLoading || disabled}
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        className={cn(
          "store-coupon-card__action-button",
          skin.actionButtonClass,
          actionHasStatus && "!h-auto !min-h-[2.45rem] flex-1 !rounded-md !py-1",
        )}
      >
        {actionButtonInner}
      </StoreButton>
    )
  ) : null;

  const wrapper = (
    <div
      data-theme-coupon-style={skin.couponStyle}
      data-coupon-card-layout={layout}
      data-coupon-template={couponTemplate}
      data-coupon-state={couponState}
      className={cn(
        "store-coupon-card store-coupon-card--template relative grid w-full min-w-0 items-stretch gap-0 overflow-hidden rounded-xl border",
        skin.useThemedMarketingShell ? "border-[var(--theme-coupon-card-shell-border)]" : "border-[var(--theme-border)]",
        skin.cardPadding,
        skin.gridClass,
        skin.shellClass,
        disabled && "opacity-60",
        selected && "ring-2 ring-[var(--theme-primary)]",
        className,
      )}
    >
      <span aria-hidden className="store-coupon-card__template-chrome store-coupon-card__template-sheen" />
      <span aria-hidden className="store-coupon-card__template-chrome store-coupon-card__template-fiber" />
      <span aria-hidden className="store-coupon-card__template-chrome store-coupon-card__template-edge store-coupon-card__template-edge--left" />
      <span aria-hidden className="store-coupon-card__template-chrome store-coupon-card__template-edge store-coupon-card__template-edge--right" />
      <span aria-hidden className="store-coupon-card__template-chrome store-coupon-card__state-rail" />
      <div className={cn("store-coupon-card__value-pane flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg px-1.5 py-1 text-center", skin.valuePaneClass)}>
        <CouponValueFace
          leftValue={leftValue}
          amountRmMatch={amountRmMatch}
          amountSize={skin.amountSize}
          layout={layout}
        />
      </div>

      <div
        className={cn(
          "relative flex min-w-0 flex-col justify-center",
          "store-coupon-card__info-pane",
          skin.infoGap,
          skin.infoPadding,
        )}
      >
        <span aria-hidden className={cn(skin.columnRuleClass, "absolute bottom-2 top-2 left-0")} />
        {actionButton ? (
          <span aria-hidden className={cn(skin.columnRuleClass, "absolute bottom-2 top-2 right-0")} />
        ) : null}
        {infoRows.map((row, index) => (
          <CouponInfoRow
            key={`info-${index}`}
            icon={row.icon}
            prominent={row.prominent}
            titleClass={skin.titleClass}
            mutedClass={skin.mutedClass}
            iconClass={skin.iconClass}
          >
            {row.text}
          </CouponInfoRow>
        ))}
      </div>

      {actionButton ? (
        <div
          className={cn(
            "store-coupon-card__action-pane flex w-full min-w-0 items-stretch justify-center",
            actionHasStatus && "flex-col items-center gap-1 py-0.5",
          )}
        >
          {actionHasStatus ? (
            <span className="inline-flex h-5 w-full max-w-[3.1rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_16%,var(--theme-surface))] px-1 text-[10px] font-semibold leading-none text-[var(--theme-primary)]">
              {statusLabel}
            </span>
          ) : null}
          {actionButton}
        </div>
      ) : null}
    </div>
  );

  if (!onClick) return wrapper;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full min-w-0 text-left">
      {wrapper}
    </button>
  );
}
