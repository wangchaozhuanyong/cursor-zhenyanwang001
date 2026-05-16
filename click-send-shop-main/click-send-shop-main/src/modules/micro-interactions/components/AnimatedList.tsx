import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { listItemTransition } from "../motionConfig";

export type AnimatedListItem<T> = {
  key: string;
  item: T;
};

type AnimatedListProps<T> = {
  items: AnimatedListItem<T>[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
  mode?: "sync" | "wait" | "popLayout";
};

export function AnimatedList<T>({
  items,
  renderItem,
  className,
  itemClassName,
  mode = "popLayout",
}: AnimatedListProps<T>) {
  const { level, enabled } = useMotionConfig();

  if (!enabled) {
    return (
      <div className={className}>
        {items.map(({ key, item }, index) => (
          <div key={key} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div className={cn(className)} layout={false}>
      <AnimatePresence mode={mode} initial={false}>
        {items.map(({ key, item }, index) => {
          const motionProps = listItemTransition(level, index);
          return (
            <motion.div
              key={key}
              layout={false}
              className={itemClassName}
              initial={motionProps.initial}
              animate={motionProps.animate}
              exit={motionProps.exit}
              transition={motionProps.transition}
            >
              {renderItem(item, index)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

export default AnimatedList;
