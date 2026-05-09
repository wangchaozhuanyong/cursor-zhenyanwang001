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
  const content = (
    <div
      className={`relative flex w-full overflow-hidden rounded-2xl border border-[#D6B36A]/40 bg-gradient-to-br from-[#7B1126] via-[#651020] to-[#3F0712] text-[#FFF2CF] shadow-[0_16px_34px_rgba(63,7,18,0.24)] ${
        compact ? "min-h-[118px]" : "min-h-[150px]"
      } ${disabled ? "grayscale opacity-55" : ""} ${selected ? "ring-2 ring-[#E2C382]" : ""} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(135deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_20%_20%,rgba(226,195,130,0.18),transparent_34%)]" />

      <div className={`relative flex shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-[#D6B36A]/45 px-3 text-center ${compact ? "w-[34%] min-w-[106px]" : "w-[34%] min-w-[126px]"}`}>
        <div className="absolute -right-[13px] -top-3 h-6 w-6 rounded-full bg-background shadow-inner" />
        <div className="absolute -bottom-3 -right-[13px] h-6 w-6 rounded-full bg-background shadow-inner" />

        <Gift className={`${compact ? "mb-1 h-7 w-7" : "mb-2 h-9 w-9"} text-[#E2C382] drop-shadow`} />
        <div className="flex items-baseline justify-center text-[#E2C382] drop-shadow-sm">
          {amountPrefix && <span className={`${compact ? "text-lg" : "text-2xl"} mr-1 font-bold`}>{amountPrefix}</span>}
          <span className={`${compact ? "text-3xl" : "text-5xl"} font-black leading-none tracking-tight`}>
            {amount}
          </span>
        </div>
        <div className={`${compact ? "mt-1 text-[10px]" : "mt-1.5 text-xs"} text-[#F7E8C1]/85`}>
          {conditionText}
        </div>
      </div>

      <div className={`relative flex min-w-0 flex-1 flex-col justify-center ${compact ? "px-3 py-3" : "px-5 py-4"}`}>
        {badge && (
          <span className="mb-1 inline-flex w-fit rounded-full border border-[#E2C382]/30 bg-[#E2C382]/10 px-2 py-0.5 text-[10px] font-semibold text-[#E2C382]">
            {badge}
          </span>
        )}
        <div className={`${compact ? "text-[11px]" : "text-xs"} text-[#F7E8C1]/65`}>{eyebrow}</div>
        <div className={`${compact ? "mt-0.5 text-base" : "mt-1 text-xl"} truncate font-extrabold tracking-wide text-[#FFF5D6]`}>
          {title}
        </div>

        <div className={`${compact ? "mt-2 gap-1 text-[11px]" : "mt-3 gap-1.5 text-xs"} flex flex-col text-[#F7E8C1]/82`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#E2C382]" />
            <span className="truncate">有效期至 {expireText}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-[#E2C382]" />
            <span className="truncate">{scopeText}</span>
          </div>
        </div>
      </div>

      <div className={`relative flex shrink-0 items-center justify-center bg-[#5A0B19]/90 ${compact ? "w-[66px]" : "w-[82px]"}`}>
        <div
          className="absolute bottom-0 right-0 top-0 w-2 translate-x-1"
          style={{
            backgroundImage: "radial-gradient(circle at 8px 8px, transparent 4px, #5A0B19 5px)",
            backgroundSize: "16px 16px",
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
            className={`relative z-10 flex ${compact ? "w-10 py-3" : "w-12 py-5"} flex-col items-center justify-center rounded-full border border-[#D6B36A]/45 bg-gradient-to-b from-[#8C142B] to-[#4B0713] text-[#E2C382] shadow-[inset_0_2px_4px_rgba(255,255,255,0.13),0_8px_16px_rgba(0,0,0,0.18)] transition hover:brightness-110 active:scale-95 disabled:opacity-60`}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ChevronRight className="mb-1 h-4 w-4" />
                <span
                  className={`${compact ? "text-sm" : "text-base"} font-black tracking-[0.18em]`}
                  style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
                >
                  {actionLabel}
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-1 text-[#E2C382]">
            {selected ? <CheckCircle2 className="h-5 w-5" /> : null}
            <span
              className={`${compact ? "text-xs" : "text-sm"} font-black tracking-[0.18em]`}
              style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
            >
              {statusLabel || (selected ? "已选择" : "可使用")}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (!onClick) return content;

  return (
    <button type="button" onClick={onClick} disabled={disabled} className="block w-full text-left disabled:cursor-not-allowed">
      {content}
    </button>
  );
}
