import type { MotionLevel, ThemeConfig } from "@/types/theme";
import type { Transition, Variants } from "framer-motion";

export const LIST_STAGGER_CAP = 12;
export const TABLE_STAGGER_ROW_CAP = 50;
export const SILK_EASE = [0.22, 1, 0.36, 1] as const;

export type MotionTier = MotionLevel;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getMotionEnabled(themeConfig: Pick<ThemeConfig, "motionLevel">): boolean {
  if (prefersReducedMotion()) return false;
  return themeConfig.motionLevel !== "none";
}

export function resolveMotionTier(themeConfig: Pick<ThemeConfig, "motionLevel">): MotionTier {
  if (prefersReducedMotion()) return "none";
  return themeConfig.motionLevel;
}

function easeOut(dur: number): Transition {
  return { duration: dur, ease: "easeOut" };
}

export function silkTransition(duration: number, delay = 0): Transition {
  return { duration, delay, ease: SILK_EASE };
}

/** 页面级过渡：轻微渐入和位移，不使用 exit/wait，避免切页空白。 */
export function pageTransition(level: MotionTier) {
  if (level === "none") {
    return { initial: false as const, animate: {}, transition: { duration: 0 } };
  }
  const duration = level === "rich" ? 0.26 : 0.18;
  const y = level === "rich" ? 10 : 5;
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: silkTransition(duration),
  };
}

export function sectionTransition(level: MotionTier, delay = 0) {
  if (level === "none") return { initial: false as const, animate: {}, transition: { duration: 0 } };
  const y = level === "rich" ? 12 : 6;
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { ...easeOut(level === "rich" ? 0.28 : 0.22), delay },
  };
}

export function listItemTransition(level: MotionTier, index: number) {
  if (level === "none" || index >= LIST_STAGGER_CAP) {
    return { initial: false as const, animate: {}, exit: {}, transition: { duration: 0 } };
  }
  const y = level === "rich" ? 18 : 8;
  const delay = Math.min(index, LIST_STAGGER_CAP - 1) * 0.035;
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, transition: silkTransition(0.14) },
    transition: silkTransition(level === "rich" ? 0.24 : 0.18, delay),
  };
}

export function modalTransition(level: MotionTier) {
  if (level === "none") return { overlay: {}, content: {}, transition: { duration: 0 } };
  const y = level === "rich" ? 10 : 6;
  return {
    overlay: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    content: {
      initial: { opacity: 0, y },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y },
    },
    transition: easeOut(0.18),
  };
}

export function drawerTransition(level: MotionTier) {
  if (level === "none") return { duration: 0 };
  return level === "rich"
    ? { type: "spring" as const, stiffness: 420, damping: 34 }
    : { type: "spring" as const, stiffness: 380, damping: 36 };
}

export const buttonTapTransition = {
  scale: 0.97,
  transition: { type: "spring" as const, stiffness: 400, damping: 25 },
};

export function tableRowTransition(level: MotionTier, index: number, total: number) {
  if (level === "none" || total > TABLE_STAGGER_ROW_CAP) {
    return { initial: false as const, animate: {}, exit: { opacity: 0 }, transition: easeOut(0.12) };
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: easeOut(0.14) },
    transition: { ...easeOut(0.14), delay: Math.min(index, 8) * 0.02 },
  };
}

export const listPresenceVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export function shakeKeyframes(level: MotionTier) {
  if (level === "none") return {};
  const x = level === "rich" ? 6 : 4;
  return { x: [-x, x, -x / 2, x / 2, 0] };
}
