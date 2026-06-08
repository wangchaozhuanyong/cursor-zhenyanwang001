type IdleSchedulerOptions = {
  delayMs?: number;
  timeoutMs?: number;
  jitterMs?: number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

let lastInteractionAt = 0;
let listenersInstalled = false;

function markInteraction() {
  lastInteractionAt = Date.now();
}

function installInteractionListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  const opts = { passive: true } as AddEventListenerOptions;
  window.addEventListener("scroll", markInteraction, opts);
  window.addEventListener("pointerdown", markInteraction, opts);
  window.addEventListener("keydown", markInteraction);
  window.addEventListener("input", markInteraction, opts);
}

function isUserBusy() {
  return Date.now() - lastInteractionAt < 700;
}

function withJitter(delayMs: number, jitterMs: number) {
  if (jitterMs <= 0) return delayMs;
  return delayMs + Math.floor(Math.random() * jitterMs);
}

export function scheduleIdleTask(
  _name: string,
  callback: () => void,
  options: IdleSchedulerOptions = {},
) {
  if (typeof window === "undefined") return () => {};
  installInteractionListeners();

  const idleWindow = window as IdleWindow;
  const delayMs = withJitter(Math.max(0, options.delayMs ?? 0), Math.max(0, options.jitterMs ?? 1200));
  const timeoutMs = Math.max(500, options.timeoutMs ?? 4000);
  let cancelled = false;
  let idleId: number | undefined;
  let retryTimer: number | undefined;

  const runWhenCalm = () => {
    if (cancelled) return;
    if (isUserBusy()) {
      retryTimer = window.setTimeout(runWhenCalm, 350 + Math.floor(Math.random() * 350));
      return;
    }
    callback();
  };

  const timer = window.setTimeout(() => {
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(runWhenCalm, { timeout: timeoutMs });
      return;
    }
    runWhenCalm();
  }, delayMs);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
  };
}
