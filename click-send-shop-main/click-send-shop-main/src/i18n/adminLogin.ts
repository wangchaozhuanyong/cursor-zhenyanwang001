import { useEffect, useMemo, useState } from "react";

export type AdminLoginLocale = "zh" | "en";

export const ADMIN_LOCALE_STORAGE_KEY = "admin-locale";

const loginMessages = {
  zh: {
    "login.title": "\u7ba1\u7406\u540e\u53f0",
    "login.subtitle": "\u8bf7\u4f7f\u7528\u7ba1\u7406\u5458\u8d26\u53f7\u767b\u5f55",
    "login.accountLabel": "\u7ba1\u7406\u5458\u8d26\u53f7",
    "login.accountPlaceholder": "\u8f93\u5165\u8d26\u53f7",
    "login.passwordLabel": "\u5bc6\u7801",
    "login.passwordPlaceholder": "\u8f93\u5165\u5bc6\u7801",
    "login.submit": "\u767b\u5f55",
    "login.submitting": "\u767b\u5f55\u4e2d...",
    "login.backToStore": "\u8fd4\u56de\u524d\u53f0",
    "login.loginSuccess": "\u767b\u5f55\u6210\u529f",
    "login.loginFailed": "\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u8d26\u53f7\u5bc6\u7801",
    "login.mfaSetupTitle": "\u8bbe\u7f6e\u591a\u56e0\u7d20\u8eab\u4efd\u9a8c\u8bc1 (MFA)",
    "login.mfaVerifyTitle": "\u591a\u56e0\u7d20\u8eab\u4efd\u9a8c\u8bc1",
    "login.mfaManualKey": "\u624b\u52a8\u8bbe\u7f6e\u5bc6\u94a5",
    "login.mfaInstruction": "\u6253\u5f00\u60a8\u7684\u8eab\u4efd\u9a8c\u8bc1\u5668\u5e94\u7528\u5e76\u8f93\u5165\u5f53\u524d\u7684 6 \u4f4d\u9a8c\u8bc1\u7801\u3002",
    "login.mfaCodeLabel": "\u591a\u56e0\u7d20\u8eab\u4efd\u9a8c\u8bc1\u4ee3\u7801",
    "login.mfaCodePlaceholder": "000000",
    "login.mfaVerifySubmit": "\u6838\u5b9e\u5e76\u8fdb\u5165",
    "login.mfaVerifying": "\u6838\u5b9e\u4e2d...",
    "login.mfaBackToPassword": "\u8fd4\u56de\u5bc6\u7801\u767b\u5f55",
  },
  en: {
    "login.title": "Admin Console",
    "login.subtitle": "Sign in with an administrator account",
    "login.accountLabel": "Administrator account",
    "login.accountPlaceholder": "Enter account",
    "login.passwordLabel": "Password",
    "login.passwordPlaceholder": "Enter password",
    "login.submit": "Sign in",
    "login.submitting": "Signing in...",
    "login.backToStore": "Back to storefront",
    "login.loginSuccess": "Signed in successfully",
    "login.loginFailed": "Sign-in failed. Check your account and password.",
    "login.mfaSetupTitle": "Set up MFA",
    "login.mfaVerifyTitle": "MFA verification",
    "login.mfaManualKey": "Manual setup key",
    "login.mfaInstruction": "Open your authenticator app and enter the current 6-digit code.",
    "login.mfaCodeLabel": "MFA code",
    "login.mfaCodePlaceholder": "000000",
    "login.mfaVerifySubmit": "Verify and enter",
    "login.mfaVerifying": "Verifying...",
    "login.mfaBackToPassword": "Back to password login",
  },
} satisfies Record<AdminLoginLocale, Record<string, string>>;

const textMessagesEn: Record<string, string> = {
  "\u8bf7\u8f93\u5165\u7ba1\u7406\u5458\u8d26\u53f7": "Enter an administrator account",
  "\u8bf7\u8f93\u5165\u5bc6\u7801": "Enter a password",
  "\u8bf7\u8f93\u5165\u5b8c\u6574\u7684 6 \u4f4d\u9a8c\u8bc1\u7801": "Enter the full 6-digit code",
  "\u591a\u56e0\u7d20\u9a8c\u8bc1\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u9a8c\u8bc1\u7801\u662f\u5426\u6b63\u786e\u6216\u662f\u5426\u5df2\u8fc7\u671f": "MFA verification failed. Check the code or sign in again.",
  "Passkey \u9a8c\u8bc1\u5931\u8d25": "Passkey verification failed",
  "\u6b63\u5728\u9a8c\u8bc1 Passkey...": "Verifying Passkey...",
  "\u4f7f\u7528 Passkey \u767b\u5f55": "Sign in with Passkey",
  "\u6216\u8f93\u5165\u9a8c\u8bc1\u7801": "Or enter a verification code",
  "\u4fe1\u4efb\u6b64\u8bbe\u5907": "Trust this device",
  "\u9690\u85cf\u5bc6\u7801": "Hide password",
  "\u663e\u793a\u5bc6\u7801": "Show password",
};

export function readAdminLoginLocale(): AdminLoginLocale {
  try {
    const stored = localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "zh") return stored;
  } catch {
    // ignore
  }
  return "zh";
}

export function useAdminLoginT() {
  const [locale] = useState<AdminLoginLocale>(() => readAdminLoginLocale());

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  }, [locale]);

  return useMemo(() => ({
    locale,
    t: (key: string) => loginMessages[locale][key] ?? key,
    tText: (zh: string) => (locale === "en" ? textMessagesEn[zh] ?? zh : zh),
  }), [locale]);
}
