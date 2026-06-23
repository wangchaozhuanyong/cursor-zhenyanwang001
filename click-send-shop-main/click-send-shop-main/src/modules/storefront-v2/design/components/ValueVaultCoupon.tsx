import { Check, Copy, LoaderCircle, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ValueVaultKind = "fixed" | "percentage" | "shipping";
export type ValueVaultStatus =
  | "claimable"
  | "available"
  | "claimed"
  | "locked"
  | "used"
  | "expired"
  | "invalid";

export type ValueVaultCouponProps = {
  kind: ValueVaultKind;
  status: ValueVaultStatus;
  title: ReactNode;
  value?: string | number;
  currencyLabel?: string;
  meta?: ReactNode;
  validText?: ReactNode;
  code?: string | null;
  unavailableReason?: ReactNode;
  actionLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onAction?: () => void;
  onCopyCode?: (code: string) => void;
  className?: string;
};

const statusLabel: Record<ValueVaultStatus, string> = {
  claimable: "可领取",
  available: "可使用",
  claimed: "已领取",
  locked: "已锁定",
  used: "已使用",
  expired: "已过期",
  invalid: "不可用",
};

const isMutedStatus = (status: ValueVaultStatus) =>
  status === "used" ||
  status === "expired" ||
  status === "invalid";

export default function ValueVaultCoupon({
  kind,
  status,
  title,
  value,
  currencyLabel = "RM",
  meta,
  validText,
  code,
  unavailableReason,
  actionLabel,
  loading = false,
  disabled = false,
  onAction,
  onCopyCode,
  className,
}: ValueVaultCouponProps) {
  const muted = isMutedStatus(status);
  const canAct = Boolean(onAction) && !disabled && !loading;

  const resolvedActionLabel =
    actionLabel ??
    (status === "claimable"
      ? "领取"
      : status === "available"
        ? "使用"
        : statusLabel[status]);

  return (
    <article
      className={cn("sf-next-value-vault", className)}
      data-muted={muted ? "true" : "false"}
      data-status={status}
    >
      <div className="sf-next-value-vault__value">
        {kind === "fixed" ? (
          <>
            <span className="sf-next-value-vault__currency">
              {currencyLabel}
            </span>
            <strong className="sf-next-value-vault__amount">
              {value}
            </strong>
          </>
        ) : null}

        {kind === "percentage" ? (
          <strong className="sf-next-value-vault__amount">
            {value}%
          </strong>
        ) : null}

        {kind === "shipping" ? (
          <strong className="sf-next-value-vault__amount">
            免运
          </strong>
        ) : null}

        <span className="sf-next-value-vault__kind">
          权益凭证
        </span>
      </div>

      <div className="sf-next-value-vault__content">
        <div className="sf-next-value-vault__topline">
          <span>{statusLabel[status]}</span>

          {canAct ? (
            <button
              type="button"
              className="sf-next-button sf-next-button--quiet"
              onClick={onAction}
            >
              {resolvedActionLabel}
            </button>
          ) : (
            <span>{resolvedActionLabel}</span>
          )}
        </div>

        <h3 className="sf-next-value-vault__title">
          {title}
        </h3>

        {meta ? (
          <p className="sf-next-value-vault__meta">{meta}</p>
        ) : null}

        {unavailableReason ? (
          <p className="sf-next-value-vault__meta">
            <LockKeyhole aria-hidden="true" size={14} />
            {unavailableReason}
          </p>
        ) : null}

        {validText ? (
          <p className="sf-next-value-vault__date">
            {validText}
          </p>
        ) : null}

        {code ? (
          <div className="sf-next-value-vault__code">
            <span className="sf-next-value-vault__code-label">
              CODE
            </span>
            <span className="sf-next-value-vault__code-value">
              {code}
            </span>
            <button
              type="button"
              className="sf-next-button sf-next-icon-button sf-next-button--quiet"
              aria-label="复制优惠码"
              disabled={!onCopyCode}
              onClick={() => onCopyCode?.(code)}
            >
              <Copy aria-hidden="true" size={17} />
            </button>
          </div>
        ) : null}

        {loading ? (
          <span role="status" aria-label="处理中">
            <LoaderCircle aria-hidden="true" size={17} />
          </span>
        ) : status === "claimed" ? (
          <Check aria-hidden="true" size={17} />
        ) : null}
      </div>
    </article>
  );
}
