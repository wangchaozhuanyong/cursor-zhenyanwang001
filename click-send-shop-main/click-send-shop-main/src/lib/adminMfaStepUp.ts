let pendingResolve: (() => void) | null = null;
let pendingReject: ((reason?: unknown) => void) | null = null;
let openDialog: (() => void) | null = null;

export function registerAdminMfaStepUpOpener(opener: () => void): void {
  openDialog = opener;
}

export function requestAdminMfaStepUp(): Promise<void> {
  if (!openDialog) {
    return Promise.reject(new Error("MFA_STEP_UP_UI_MISSING"));
  }
  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    openDialog?.();
  });
}

export function completeAdminMfaStepUp(): void {
  pendingResolve?.();
  pendingResolve = null;
  pendingReject = null;
}

export function cancelAdminMfaStepUp(): void {
  pendingReject?.(new Error("MFA_STEP_UP_CANCELLED"));
  pendingResolve = null;
  pendingReject = null;
}
