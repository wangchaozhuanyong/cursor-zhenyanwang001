let pendingResolve: (() => void) | null = null;
let pendingReject: ((reason?: unknown) => void) | null = null;
let pendingPromise: Promise<void> | null = null;
let openDialog: (() => void) | null = null;
let pendingActionClass = "admin_sensitive";

function clearPending(): void {
  pendingResolve = null;
  pendingReject = null;
  pendingPromise = null;
  pendingActionClass = "admin_sensitive";
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

export function requestAdminMfaStepUp(actionClass = "admin_sensitive"): Promise<void> {
  if (!openDialog) {
    return Promise.reject(new Error("MFA_STEP_UP_UI_MISSING"));
  }
  pendingActionClass = actionClass;

  if (pendingPromise) {
    openDialog();
    return pendingPromise;
  }

  pendingPromise = new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    try {
      openDialog?.();
    } catch (err) {
      clearPending();
      reject(err);
    }
  });

  return pendingPromise;
}

export function completeAdminMfaStepUp(): void {
  pendingResolve?.();
  clearPending();
}

export function cancelAdminMfaStepUp(): void {
  pendingReject?.(new Error("MFA_STEP_UP_CANCELLED"));
  clearPending();
}
