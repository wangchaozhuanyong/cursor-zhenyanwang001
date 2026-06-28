import type { CSSProperties, DragEvent, ReactNode } from "react";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";

type UploadDropZoneProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  style?: CSSProperties;
  onFiles: (files: FileList) => void;
  as?: "label" | "motion.div";
};

export function UploadDropZone({
  children,
  className,
  disabled,
  style,
  onFiles,
  as = "label",
}: UploadDropZoneProps) {
  const { enabled } = useMotionConfig();
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
    },
    [disabled, onFiles],
  );

  const activeClass =
    dragOver && !disabled
      ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] ring-2 ring-[var(--theme-primary)]/25"
      : "";

  const motionProps = enabled
    ? {
        animate: dragOver && !disabled ? { scale: 1.01 } : { scale: 1 },
        transition: { duration: 0.18 },
      }
    : {};

  const shared = {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    className: cn(className, activeClass, disabled && "pointer-events-none opacity-60"),
    style,
    ...motionProps,
  };

  if (as === "label") {
    return (
      <motion.label {...shared}>
        {children}
      </motion.label>
    );
  }

  return <motion.div {...shared}>{children}</motion.div>;
}

export default UploadDropZone;
