import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import {
  getStorefrontTransitionKind,
  type StorefrontTransitionKind,
} from "./getStorefrontTransitionKind";

export type StorefrontMotionPhase = "idle" | "pending" | "committing" | "settling" | "error";
export type StorefrontProgressState = "idle" | "pending" | "settling" | "error";

export type StorefrontMotionSnapshot = {
  phase: StorefrontMotionPhase;
  progress: StorefrontProgressState;
  currentPath: string;
  targetPath: string | null;
  pendingPath: string | null;
  transitionKind: StorefrontTransitionKind;
  errorMessage: string | null;
  sequence: number;
};

const listeners = new Set<() => void>();

let settleFrame: number | null = null;
let idleTimer: number | null = null;
let errorTimer: number | null = null;
const initialPath = typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}${window.location.hash}`;

let snapshot: StorefrontMotionSnapshot = {
  phase: "idle",
  progress: "idle",
  currentPath: initialPath,
  targetPath: null,
  pendingPath: null,
  transitionKind: getStorefrontTransitionKind(initialPath),
  errorMessage: null,
  sequence: 0,
};

function clearMotionTimers() {
  if (settleFrame !== null) {
    window.cancelAnimationFrame(settleFrame);
    settleFrame = null;
  }
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (errorTimer !== null) {
    window.clearTimeout(errorTimer);
    errorTimer = null;
  }
}

function emit(next: Partial<StorefrontMotionSnapshot>) {
  snapshot = {
    ...snapshot,
    ...next,
    sequence: snapshot.sequence + 1,
  };
  listeners.forEach((listener) => listener());
}

export function subscribeStorefrontMotion(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStorefrontMotionSnapshot() {
  return snapshot;
}

export function isStorefrontMotionNavigationLocked() {
  return snapshot.phase === "pending" || snapshot.phase === "committing";
}

export function useStorefrontMotionState() {
  return useSyncExternalStore(
    subscribeStorefrontMotion,
    getStorefrontMotionSnapshot,
    getStorefrontMotionSnapshot,
  );
}

export function initializeStorefrontMotionLocation(path: string) {
  const kind = getStorefrontTransitionKind(path);
  if (snapshot.currentPath === path && snapshot.phase === "idle" && snapshot.transitionKind === kind) return;
  clearMotionTimers();
  emit({
    phase: "idle",
    progress: "idle",
    currentPath: path,
    targetPath: null,
    pendingPath: null,
    transitionKind: kind,
    errorMessage: null,
  });
}

export function beginStorefrontRouteTransition(targetPath: string, kind = getStorefrontTransitionKind(targetPath)) {
  if (!targetPath || targetPath === snapshot.currentPath) return;
  clearMotionTimers();
  flushSync(() => {
    emit({
      phase: "pending",
      progress: "pending",
      targetPath,
      pendingPath: targetPath,
      transitionKind: kind,
      errorMessage: null,
    });
  });
}

export function commitStorefrontRouteTransition(path: string, kind = getStorefrontTransitionKind(path)) {
  clearMotionTimers();
  emit({
    phase: "committing",
    progress: "pending",
    currentPath: path,
    targetPath: path,
    pendingPath: null,
    transitionKind: kind,
    errorMessage: null,
  });

  settleFrame = window.requestAnimationFrame(() => {
    settleFrame = null;
    emit({
      phase: "settling",
      progress: "settling",
      currentPath: path,
      targetPath: path,
      transitionKind: kind,
    });

    idleTimer = window.setTimeout(() => {
      idleTimer = null;
      emit({
        phase: "idle",
        progress: "idle",
        currentPath: path,
        targetPath: null,
        pendingPath: null,
        transitionKind: kind,
        errorMessage: null,
      });
    }, 260);
  });
}

export function failStorefrontRouteTransition(message = "页面切换失败") {
  clearMotionTimers();
  emit({
    phase: "error",
    progress: "error",
    targetPath: null,
    pendingPath: null,
    errorMessage: message,
  });

  errorTimer = window.setTimeout(() => {
    errorTimer = null;
    emit({
      phase: "idle",
      progress: "idle",
      targetPath: null,
      pendingPath: null,
      errorMessage: null,
    });
  }, 900);
}
