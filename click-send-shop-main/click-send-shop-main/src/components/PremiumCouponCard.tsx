import { CheckCircle2, ChevronRight, Clock, Gift, Loader2, ShoppingCart } from "lucide-react";

interface PremiumCouponCardProps {
  eyebrow?: string;
  title: string;
  amountPrefix?: string;
  amount: string;
  conditionText: string;
  expireText: string;
  scopeText?: string;
  badge?: string;
  actionLabel?: string;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  statusLabel?: string;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
  onAction?: () => void;
}

/** 票券边缘半圆缺口：露底色，需与列表页背景一致（通常 bg-background） */
function TicketEdgeNotch({ className }: { className: string }) {
  return <div className={`absolute z-[2] rounded-full bg-background shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] ${className}`} />;
}

export default function PremiumCouponCard({
  eyebrow = "活动优惠券",
  title,
  amountPrefix = "RM",
  amount,
  conditionText,
  expireText,
  scopeText = "适用范围：全场商品",
  badge,
  actionLabel,
  actionLoading = false,
  actionDisabled = false,
  disabled = false,
  selected = false,
  statusLabel,
  compact = false,
  className = "",
  onClick,
  onAction,
}: PremiumCouponCardProps) {
  const amountLen = amount.length + amountPrefix.length;
  const amountMainClass = compact
    ? amountLen > 5
      ? "text-2xl"
      : "text-[1.65rem] leading-none"
    : amountLen > 5
      ? "text-4xl"
      : "text-5xl";
  const amountPrefixClass = compact ? (amountLen > 5 ? "text-sm" : "text-lg") : amountLen > 5 ? "text-xl" : "text-2xl";

  const leftW = compact ? "w-[31%] min-w-[96px] max-w-[140px]" : "w-[32%] min-w-[118px] max-w-[200px]";
  const stubW = compact ? "w-[68px] min-w-[68px]" : "w-[88px] min-w-[88px]";

  const facetedBg = [
    "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 42%)",
    "linear-gradient(225deg, rgba(0,0,0,0.12) 0%, transparent 45%)",
    "repeating-linear-gradient(-19deg, transparent, transparent 11px, rgba(255,255,255,0.03) 11px, rgba(255,255,255,0.03) 12px)",
  ].join(",");

  const inner = (
    <div
      className={`relative flex h-full min-h-0 w-full overflow-hidden rounded-xl border border-[#D6B36A]/42 bg-gradient-to-br from-[#7B1126] via-[#5C0D1C] to-[#3A0610] text-[#FFF2CF] shadow-[0_14px_32px_rgba(45,6,14,0.28)] ${
        compact ? "min-h-[118px]" : "min-h-[152px]"
      } ${disabled ? "opacity-[0.52] grayscale-[0.35]" : ""} ${selected ? "ring-2 ring-[#E2C382] ring-offset-2 ring-offset-background" : ""} ${className}`}
    >
      {/* 低多边形感叠加 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{ backgroundImage: facetedBg, backgroundBlendMode: "soft-light" }}
      />
      {/* 左侧金属光泽 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[34%] bg-[radial-gradient(circle_at_35%_28%,rgba(226,195,130,0.22),transparent_55%)]" />

      {/* 左：面额区 */}
      <div className={`relative z-[1] flex shrink-0 flex-col items-center justify-center border-r border-[#A02B3F]/35 px-2 py-3 text-center ${leftW}`}>
        {/* 与中间区分界的弧形金线 */}
        <svg
          className="pointer-events-none absolute -right-px top-0 z-[3] h-full w-[14px] text-[#E2C382]/90"
          viewBox="0 0 14 200"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M 1 0 C 10 48 10 152 1 200" fill="none" stroke="currentColor" strokeWidth="1.15" vectorEffect="non-scaling-stroke" />
        </svg>

        <TicketEdgeNotch className="-right-[11px] -top-2 h-[18px] w-[18px]" />
        <TicketEdgeNotch className="-right-[11px] -bottom-2 h-[18px] w-[18px]" />

        <Gift className={`shrink-0 text-[#E2C382] drop-shadow ${compact ? "mb-1 h-7 w-7" : "mb-1.5 h-9 w-9"}`} />
        <div className="flex min-w-0 max-w-full items-baseline justify-center gap-0.5 text-[#E2C382] drop-shadow-sm">
          {amountPrefix ? (
            <span className={`shrink-0 font-bold leading-none ${amountPrefixClass}`}>{amountPrefix}</span>
          ) : null}
          <span className={`min-w-0 break-all font-black tracking-tight ${amountMainClass}`}>{amount}</span>
        </div>
        <p
          className={`mt-1 max-w-[100%] px-0.5 leading-snug text-[#F7E8C1]/88 ${
            compact ? "text-[9px]" : "text-[11px]"
          }`}
        >
          {conditionText}
        </p>
      </div>

      {/* 中：文案（min-w-0 防止与右侧挤压重叠） */}
      <div
        className={`relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden ${
          compact ? "px-3 py-2.5 pr-2" : "px-4 py-4 pr-3"
        }`}
      >
        {/* 齿孔竖线 + 上下圆缺口（正文区与存根之间） */}
        <div className="pointer-events-none absolute right-0 top-0 z-[2] h-full w-3">
          <div className="absolute left-1/2 top-2.5 bottom-2.5 w-px -translate-x-1/2 border-l border-dashed border-[#E2C382]/55" />
          <TicketEdgeNotch className="left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2" />
          <TicketEdgeNotch className="bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2" />
        </div>

        {badge ? (
          <span className="mb-1 inline-flex max-w-full items-center rounded-full border border-[#E2C382]/32 bg-[#E2C382]/12 px-2 py-0.5 text-[10px] font-semibold leading-tight text-[#E2C382]">
            <span className="truncate">{badge}</span>
          </span>
        ) : null}
        <div className={`text-[#F7E8C1]/68 ${compact ? "text-[10px]" : "text-xs"}`}>{eyebrow}</div>
        <div
          className={`line-clamp-2 min-h-0 max-w-full break-words font-extrabold leading-snug tracking-wide text-[#FFF5D6] ${
            compact ? "mt-0.5 text-sm" : "mt-1 text-lg sm:text-xl"
          }`}
        >
          {title}
        </div>

        <div className={`mt-2 flex min-w-0 flex-col gap-1 text-[#F7E8C1]/85 ${compact ? "text-[10px]" : "text-xs"}`}>
          <div className="flex min-w-0 items-start gap-1.5">
            <Clock className={`mt-0.5 shrink-0 text-[#E2C382] ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
            <span className="min-w-0 leading-snug">
              有效期至 <span className="break-all">{expireText}</span>
            </span>
          </div>
          <div className="flex min-w-0 items-start gap-1.5">
            <ShoppingCart className={`mt-0.5 shrink-0 text-[#E2C382] ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
            <span className="min-w-0 leading-snug break-words">{scopeText}</span>
          </div>
        </div>
      </div>

      {/* 右：存根 + 撕边 */}
      <div
        className={`relative z-[1] flex shrink-0 flex-col items-center justify-center bg-[#4A0A17]/95 py-2 pl-1 ${stubW}`}
      >
        <div
          className="pointer-events-none absolute bottom-0 right-0 top-0 w-2.5 translate-x-px"
          style={{
            backgroundImage: "radial-gradient(circle at 9px 8px, transparent 4px, #3A0610 5px)",
            backgroundSize: "17px 15px",
            backgroundPosition: "100% 0",
          }}
        />

        {actionLabel ? (
          <button
            type="button"
            disabled={actionDisabled || actionLoading || disabled}
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
            className={`relative z-10 flex flex-col items-center justify-center rounded-full border border-[#D6B36A]/55 bg-gradient-to-b from-[#8C142B] to-[#4B0713] text-[#E2C382] shadow-[inset_0_2px_4px_rgba(255,255,255,0.12),0_6px_14px_rgba(0,0,0,0.22)] transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
              compact ? "w-10 py-3" : "w-12 py-5"
            }`}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <>
                <ChevronRight className={`mb-0.5 shrink-0 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                <span
                  className={`max-h-[5.5rem] overflow-hidden text-center font-black leading-tight tracking-[0.14em] ${
                    compact ? "text-xs" : "text-sm"
                  }`}
                  style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
                >
                  {actionLabel}
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="relative z-10 flex max-h-full flex-col items-center justify-center gap-1 overflow-hidden text-[#E2C382]">
            {selected ? <CheckCircle2 className={`shrink-0 ${compact ? "h-4 w-4" : "h-5 w-5"}`} /> : null}
            <span
              className={`max-h-[5.5rem] overflow-hidden text-center font-black leading-tight tracking-[0.14em] ${
                compact ? "text-[11px]" : "text-xs"
              }`}
              style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
            >
              {statusLabel || (selected ? "已选择" : "可使用")}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (!onClick) return inner;

  return (
    <button type="button" onClick={onClick} disabled={disabled} className="block h-full w-full min-h-0 text-left disabled:cursor-not-allowed">
      {inner}
    </button>
  );
}
