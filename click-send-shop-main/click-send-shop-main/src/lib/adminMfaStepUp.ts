export type AdminMfaStepUpResult = {
  sensitiveActionToken?: string;
  actionClass?: string;
  expiresAt?: string;
  expiresIn?: number;
  csrfToken?: string;
};

let pendingResolve: ((result: AdminMfaStepUpResult) => void) | null = null;
let pendingReject: ((reason?: unknown) => void) | null = null;
let pendingPromise: Promise<AdminMfaStepUpResult> | null = null;
let openDialog: (() => void) | null = null;
let pendingActionClass = "admin_sensitive";

const stateListeners = new Set<() => void>();

function emitStateChange(): void {
  stateListeners.forEach((listener) => listener());
}

function clearPending(): void {
  pendingResolve = null;
  pendingReject = null;
  pendingPromise = null;
  pendingActionClass = "admin_sensitive";
  emitStateChange();
}

export function isAdminMfaRequiredResponse(
  status: number,
  payload: Record<string, unknown> | null | undefined,
): boolean {
  if (status !== 403) return false;
  const body = payload || {};
  const data = body.data as Record<string, unknown> | undefined;
  const message = String(body.message || body.error || body.msg || "");
  return Boolean(
    data?.mfaRequired
    || data?.stepUpRequired
    || body.mfaRequired
    || /MFA required|多因素身份验证|多因素验证已过期/i.test(message),
  );
}

export function getAdminMfaActionClassFromResponse(payload: Record<string, unknown> | null | undefined): string {
  const body = payload || {};
  const data = body.data as Record<string, unknown> | undefined;
  return String(data?.actionClass || body.actionClass || "admin_sensitive");
}

export function registerAdminMfaStepUpOpener(opener: (() => void) | null): void {
  openDialog = opener;
  if (!opener && pendingReject) {
    pendingReject(new Error("MFA_STEP_UP_UI_UNMOUNTED"));
    clearPending();
  }
}

export function getPendingAdminMfaActionClass(): string {
  return pendingActionClass || "admin_sensitive";
}

/** MFA 弹窗等待中（含用户输入验证码阶段） */
export function isAdminMfaStepUpPending(): boolean {
  return pendingPromise !== null;
}

export function subscribeAdminMfaStepUpState(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function requestAdminMfaStepUp(actionClass = "admin_sensitive"): Promise<AdminMfaStepUpResult> {
  if (!openDialog) {
    return Promise.reject(new Error("MFA_STEP_UP_UI_MISSING"));
  }

  if (pendingPromise) {
    if (pendingActionClass !== actionClass) {
      return Promise.reject(new Error("MFA_STEP_UP_BUSY"));
    }
    return pendingPromise;
  }

  pendingActionClass = actionClass;
  pendingPromise = new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    try {
      openDialog?.();
      emitStateChange();
    } catch (err) {
      clearPending();
      reject(err);
    }
  });

  return pendingPromise;
}

export function completeAdminMfaStepUp(): void {
  pendingResolve?.({});
  clearPending();
}

export function completeAdminMfaStepUpWithResult(result: AdminMfaStepUpResult): void {
  pendingResolve?.(result);
  clearPending();
}

export function cancelAdminMfaStepUp(): void {
  pendingReject?.(new Error("MFA_STEP_UP_CANCELLED"));
  clearPending();
}
