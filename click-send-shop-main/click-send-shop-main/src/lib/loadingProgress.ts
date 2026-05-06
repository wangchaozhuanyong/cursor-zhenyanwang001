type LoadingListener = (state: { progress: number; visible: boolean; animatingOut: boolean }) => void;

const activeTokens = new Set<symbol>();
const listeners = new Set<LoadingListener>();

/** 网络请求类加载：短于该时间则不展示顶栏，避免「闪一下」 */
const DEFERRED_SHOW_MS = 120;

let progress = 0;
let visible = false;
let animatingOut = false;
let trickleTimer: number | null = null;
let fadeOutTimer: number | null = null;
let deferredShowTimer: number | null = null;

function emit() {
  listeners.forEach((listener) => listener({ progress, visible, animatingOut }));
}

function clearFadeTimers() {
  if (fadeOutTimer !== null) {
    window.clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
}

function cancelDeferredShow() {
  if (deferredShowTimer !== null) {
    window.clearTimeout(deferredShowTimer);
    deferredShowTimer = null;
  }
}

function stopTrickle() {
  if (trickleTimer !== null) {
    window.clearInterval(trickleTimer);
    trickleTimer = null;
  }
}

function startTrickle() {
  stopTrickle();
  trickleTimer = window.setInterval(() => {
    if (activeTokens.size === 0) return;
    const remaining = 0.92 - progress;
    if (remaining <= 0.002) return;
    progress += Math.max(remaining * 0.08, 0.004);
    emit();
  }, 180);
}

function begin() {
  clearFadeTimers();
  animatingOut = false;
  if (!visible) {
    visible = true;
    progress = 0.04;
    emit();
    requestAnimationFrame(() => {
      progress = 0.14;
      emit();
    });
  }
  startTrickle();
}

function finish() {
  stopTrickle();
  progress = 1;
  emit();

  fadeOutTimer = window.setTimeout(() => {
    animatingOut = true;
    emit();
    fadeOutTimer = window.setTimeout(() => {
      visible = false;
      animatingOut = false;
      progress = 0;
      emit();
      fadeOutTimer = null;
    }, 260);
  }, 180);
}

/**
 * 路由 / 全屏关键操作：立即显示进度条（无延迟）。
 */
export function startGlobalLoadingImmediate() {
  cancelDeferredShow();
  const token = Symbol("global-loading-immediate");
  activeTokens.add(token);
  begin();
  return token;
}

/**
 * API / 一般请求：延迟显示；若在延迟内结束则不出现顶栏。
 */
export function startGlobalLoadingDeferred(delayMs: number = DEFERRED_SHOW_MS) {
  const token = Symbol("global-loading-deferred");
  activeTokens.add(token);
  if (!visible && deferredShowTimer === null) {
    deferredShowTimer = window.setTimeout(() => {
      deferredShowTimer = null;
      if (activeTokens.size > 0) begin();
    }, delayMs);
  }
  return token;
}

/** @deprecated 语义上等价于 startGlobalLoadingDeferred，请在新代码中二选一显式调用 */
export const startGlobalLoading = startGlobalLoadingDeferred;

export function stopGlobalLoading(token: symbol | null | undefined) {
  if (!token) return;
  activeTokens.delete(token);
  if (activeTokens.size === 0) {
    cancelDeferredShow();
    if (visible) finish();
  }
}

export function withGlobalLoading<T>(promise: Promise<T>) {
  const token = startGlobalLoadingDeferred();
  return promise.finally(() => stopGlobalLoading(token));
}

export function subscribeGlobalLoading(listener: LoadingListener) {
  listeners.add(listener);
  listener({ progress, visible, animatingOut });
  return () => {
    listeners.delete(listener);
  };
}
