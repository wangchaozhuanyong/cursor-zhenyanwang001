import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

const springTap = { scale: 0.97 } as const;

const tapTransition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
} as const;

export type SquishButtonVariant = "solid" | "outline" | "ghost" | "gold";

export type SquishButtonProps = Omit<
  HTMLMotionProps<"button">,
  // `whileTap` / `transition` are owned by the micro-interaction layer
  "whileTap" | "transition"
> & {
  className?: string;
  /**
   * solid — 主色填充（对比度由 `.squish-solid-cta` 锁定，避免外层 `text-*` 覆盖）
   * outline — 线框主按钮（如「加入购物车」）
   * gold — 价格色 CTA（如「立即购买」「去结算」）
   * ghost — 透明底图标/辅助按钮
   */
  variant?: SquishButtonVariant;
};

/** CTA-grade press: collapse on tap + subtle spring rebound (inherits theme via CSS vars or className). */
export function SquishButton({
  className,
  children,
  type = "button",
  variant = "solid",
  style,
  ...rest
}: SquishButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={springTap}
      transition={tapTransition}
      className={cn(
        "inline-flex select-none touch-manipulation items-center justify-center rounded-[var(--theme-radius)] px-5 py-3 text-[15px] font-semibold",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg)]",
        variant === "solid" && "squish-solid-cta shadow-[var(--theme-shadow)]",
        variant === "outline" && "squish-outline-cta",
        variant === "gold" && "squish-gold-cta",
        variant === "ghost" && "squish-ghost",
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
