/** 供 `request` 在 401 时通知登出，避免 `request` ↔ `useAuthStore` 循环依赖 */

type AuthExpiredHandler = () => void;

let onAuthExpired: AuthExpiredHandler | null = null;

export function registerAuthExpiredHandler(handler: AuthExpiredHandler) {
  onAuthExpired = handler;
}

export function notifyAuthExpired() {
  onAuthExpired?.();
}
