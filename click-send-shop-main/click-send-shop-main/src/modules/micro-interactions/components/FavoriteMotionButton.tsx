import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";

type FavoriteMotionButtonProps = {
  active: boolean;
  onClick: () => void;
  className?: string;
  size?: number;
  disabled?: boolean;
};

export function FavoriteMotionButton({
  active,
  onClick,
  className,
  size = 22,
  disabled,
}: FavoriteMotionButtonProps) {
  const { level, enabled } = useMotionConfig();

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "取消收藏" : "收藏"}
      whileTap={enabled ? { scale: 0.9 } : undefined}
      animate={
        enabled && active && level === "rich"
          ? { scale: [1, 1.25, 1] }
          : enabled && active
            ? { scale: [1, 1.12, 1] }
            : { scale: 1 }
      }
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] transition-colors",
        active && "border-[var(--theme-danger)]/40 bg-[var(--theme-danger)]/10",
        className,
      )}
    >
      <Heart
        size={size}
        className={cn(
          "transition-colors",
          active
            ? "fill-[var(--theme-danger)] text-[var(--theme-danger)]"
            : "text-[var(--theme-muted)]",
        )}
      />
    </motion.button>
  );
}

export default FavoriteMotionButton;
