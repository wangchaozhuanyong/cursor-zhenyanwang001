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

export function pageTransition(level: MotionTier) {
  if (level === "none") return { initial: false as const, animate: {}, exit: {}, transition: { duration: 0 } };
  if (level === "rich") {
    return {
      initial: { opacity: 0, y: 10, scale: 0.992 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -4 },
      transition: silkTransition(0.26),
    };
  }
  return {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -2 },
    transition: silkTransition(0.18),
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
    initial: level === "rich" ? { opacity: 0, y, scale: 0.96, filter: "blur(8px)" } : { opacity: 0, y },
    animate: level === "rich" ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : { opacity: 1, y: 0 },
    exit: { opacity: 0, transition: silkTransition(0.14) },
    transition: silkTransition(level === "rich" ? 0.24 : 0.18, delay),
  };
}

export function modalTransition(level: MotionTier) {
  if (level === "none") return { overlay: {}, content: {}, transition: { duration: 0 } };
  const scale = level === "rich" ? 0.96 : 0.98;
  return {
    overlay: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    content: {
      initial: { opacity: 0, scale },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale },
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
