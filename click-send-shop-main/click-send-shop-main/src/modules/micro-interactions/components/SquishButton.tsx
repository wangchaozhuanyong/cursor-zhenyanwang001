import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

const springTap = { scale: 0.97 } as const;

const tapTransition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
} as const;

export type SquishButtonProps = Omit<
  HTMLMotionProps<"button">,
  // `whileTap` / `transition` are owned by the micro-interaction layer
  "whileTap" | "transition"
> & {
  className?: string;
};

/** CTA-grade press: collapse on tap + subtle spring rebound (inherits theme via CSS vars or className). */
export function SquishButton({
  className,
  children,
  type = "button",
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
        // Sensible themed defaults — override anytime with className/style
        "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg)]",
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
