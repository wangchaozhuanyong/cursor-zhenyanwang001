import { lazy, Suspense, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Fingerprint, KeyRound, Lock, User } from "lucide-react";
import { adminLoginErrorMessage } from "@/utils/storefrontError";
import { FormFieldShake } from "@/modules/micro-interactions/components/FormFieldShake";
import { useAdminLoginT, type AdminLoginLocale } from "@/i18n/adminLogin";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";

const QRCodeSVG = lazy(() => import("qrcode.react").then((module) => ({ default: module.QRCodeSVG })));

function normalizeMfaCode(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\D/g, "")
    .slice(0, 6);
}

const loadAccountService = () => import("@/services/admin/accountService");
const loadToast = () => import("sonner").then((module) => module.toast);
const adminLoginPrimaryButtonClass =
  "touch-manipulation mt-2 min-h-[48px] w-full rounded-xl bg-[var(--theme-primary)] py-3 text-base font-semibold text-[var(--theme-primary-foreground)] shadow-sm transition hover:brightness-[1.04] active:brightness-95 disabled:opacity-50 sm:text-sm";

function showLoginToast(type: "success" | "error", message: string) {
  void loadToast()
    .then((toast) => {
      toast[type](message);
    })
    .catch(() => void 0);
}

function AdminLoginLogo({ locale }: { locale: AdminLoginLocale }) {
  const siteInfo = useSiteInfo();
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const siteName = siteInfo.siteName?.trim() || "";
  const isEnglish = locale === "en";
  const hasCjkSiteName = /[\u4e00-\u9fff]/.test(siteName);
  const alt = siteName && !(isEnglish && hasCjkSiteName)
    ? siteName
    : "站点标志";
  const fallbackText = isEnglish && hasCjkSiteName ? "A" : alt.slice(0, 1);
  const logoClass = "admin-site-logo admin-site-logo--lg rounded-2xl";

  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={alt}
        className={cn(
          logoClass,
          "shrink-0 bg-[var(--theme-surface)] object-contain ring-1 ring-[color-mix(in_srgb,var(--theme-border)_80%,transparent)]",
        )}
        decoding="async"
      />
    );
  }

  return (
    <div
      className={cn(
        logoClass,
        "flex shrink-0 items-center justify-center bg-[var(--theme-surface)] text-sm font-bold text-[var(--theme-text-on-surface)] ring-1 ring-[color-mix(in_srgb,var(--theme-border)_80%,transparent)]",
      )}
      aria-label={alt}
    >
      {fallbackText}
    </div>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const { t, tText, locale } = useAdminLoginT();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [trustDays, setTrustDays] = useState<7 | 14 | 30>(14);
  const [mfaState, setMfaState] = useState<{
    ticket: string;
    setupRequired: boolean;
    secret?: string;
    otpAuthUrl?: string;
    methods?: string[];
  } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ account?: string; password?: string }>({});
  const mfaSubmittingRef = useRef(false);

  const finishLogin = () => {
    showLoginToast("success", t("login.loginSuccess"));
    navigate("/admin", { replace: true });
  };

  const handleLogin = async () => {
    const normalizedAccount = account.trim();
    const nextErrors: { account?: string; password?: string } = {};
    if (!normalizedAccount) nextErrors.account = tText("\u8bf7\u8f93\u5165\u7ba1\u7406\u5458\u8d26\u53f7");
    if (!password.trim()) nextErrors.password = tText("\u8bf7\u8f93\u5165\u5bc6\u7801");
    if (nextErrors.account || nextErrors.password) {
      setFieldErrors(nextErrors);
      setShakeKey((k) => k + 1);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const { adminLogin } = await loadAccountService();
      const result = await adminLogin({ username: normalizedAccount, phone: normalizedAccount, password });
      if (result.mfaRequired || result.mfaSetupRequired) {
        setMfaState({
          ticket: result.mfaTicket || "",
          setupRequired: Boolean(result.mfaSetupRequired),
          secret: result.secret,
          otpAuthUrl: result.otpAuthUrl,
          methods: result.methods,
        });
        setMfaCode("");
        return;
      }
      finishLogin();
    } catch (e) {
      setShakeKey((k) => k + 1);
      showLoginToast("error", adminLoginErrorMessage(e, t("login.loginFailed")));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (mfaSubmittingRef.current || loading || passkeyLoading) return;
    if (!mfaState?.ticket) {
      setShakeKey((k) => k + 1);
      return;
    }
    const code = normalizeMfaCode(mfaCode);
    if (!/^\d{6}$/.test(code)) {
      setShakeKey((k) => k + 1);
      showLoginToast("error", tText("\u8bf7\u8f93\u5165\u5b8c\u6574\u7684 6 \u4f4d\u9a8c\u8bc1\u7801"));
      return;
    }
    mfaSubmittingRef.current = true;
    setLoading(true);
    try {
      const { verifyAdminMfa } = await loadAccountService();
      await verifyAdminMfa({
        mfaTicket: mfaState.ticket,
        code,
        username: account.trim(),
        trustDevice,
        trustDays,
      });
      finishLogin();
    } catch (e) {
      setShakeKey((k) => k + 1);
      showLoginToast(
        "error",
        adminLoginErrorMessage(e, tText("\u591a\u56e0\u7d20\u9a8c\u8bc1\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u9a8c\u8bc1\u7801\u662f\u5426\u6b63\u786e\u6216\u662f\u5426\u5df2\u8fc7\u671f")),
      );
    } finally {
      mfaSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleVerifyPasskey = async () => {
    if (!mfaState?.ticket) return;
    setPasskeyLoading(true);
    try {
      const { verifyAdminPasskeyLogin } = await loadAccountService();
      await verifyAdminPasskeyLogin({
        mfaTicket: mfaState.ticket,
        username: account.trim(),
        trustDevice,
        trustDays,
      });
      finishLogin();
    } catch (e) {
      setShakeKey((k) => k + 1);
      showLoginToast("error", adminLoginErrorMessage(e, tText("Passkey \u9a8c\u8bc1\u5931\u8d25")));
    } finally {
      setPasskeyLoading(false);
    }
  };

  const passkeyAvailable = Boolean(mfaState?.methods?.includes("passkey"));

  return (
    <div className="safe-area-pt safe-area-pb flex min-h-[100dvh] items-center justify-center bg-background px-4 py-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto w-fit shadow-md">
              <AdminLoginLogo locale={locale} />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{t("login.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <FormFieldShake shake={shakeKey} className="space-y-4">
            {mfaState ? (
              <>
                <div className="rounded-xl border border-border bg-secondary p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <KeyRound size={16} />
                    {mfaState.setupRequired ? t("login.mfaSetupTitle") : t("login.mfaVerifyTitle")}
                  </div>
                  {mfaState.setupRequired ? (
                    <div className="mt-4 space-y-3">
                      {mfaState.otpAuthUrl ? (
                        <div className="mx-auto flex w-fit rounded-lg bg-white p-3">
                          <Suspense fallback={<div className="h-[168px] w-[168px] rounded-lg bg-white" />}>
                            <QRCodeSVG value={mfaState.otpAuthUrl} size={168} />
                          </Suspense>
                        </div>
                      ) : null}
                      {mfaState.secret ? (
                        <div>
                          <p className="text-xs text-muted-foreground">{t("login.mfaManualKey")}</p>
                          <code className="mt-1 block break-all rounded-lg border border-border bg-background p-2 text-xs text-foreground">
                            {mfaState.secret}
                          </code>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("login.mfaInstruction")}</p>
                </div>

                {passkeyAvailable ? (
                  <>
                    <UnifiedButton
                      type="button"
                      onClick={handleVerifyPasskey}
                      disabled={loading || passkeyLoading}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-50"
                    >
                      <Fingerprint size={16} />
                      {passkeyLoading ? tText("\u6b63\u5728\u9a8c\u8bc1 Passkey...") : tText("\u4f7f\u7528 Passkey \u767b\u5f55")}
                    </UnifiedButton>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      <span>{tText("\u6216\u8f93\u5165\u9a8c\u8bc1\u7801")}</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  </>
                ) : null}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.mfaCodeLabel")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] focus-within:ring-1 focus-within:ring-[color-mix(in_srgb,var(--theme-primary)_20%,transparent)]">
                    <KeyRound size={16} className="text-muted-foreground" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(normalizeMfaCode(e.target.value))}
                      placeholder={t("login.mfaCodePlaceholder")}
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !loading && !passkeyLoading && mfaCode.length === 6) {
                          void handleVerifyMfa();
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/60 p-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span>{tText("\u4fe1\u4efb\u6b64\u8bbe\u5907")}</span>
                  </label>
                  {trustDevice ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {([7, 14, 30] as const).map((days) => (
                        <UnifiedButton
                          key={days}
                          type="button"
                          onClick={() => setTrustDays(days)}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                            trustDays === days
                              ? "border-[color-mix(in_srgb,var(--theme-price)_60%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] text-foreground"
                              : "border-border text-muted-foreground hover:bg-background"
                          }`}
                        >
                          {locale === "en" ? `${days} days` : `${days} \u5929`}
                        </UnifiedButton>
                      ))}
                    </div>
                  ) : null}
                </div>

                <UnifiedButton
                  type="button"
                  onClick={handleVerifyMfa}
                  disabled={loading || passkeyLoading || mfaCode.length !== 6}
                  className={adminLoginPrimaryButtonClass}
                >
                  {loading ? t("login.mfaVerifying") : t("login.mfaVerifySubmit")}
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={() => setMfaState(null)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("login.mfaBackToPassword")}
                </UnifiedButton>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="admin-login-account" className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.accountLabel")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] focus-within:ring-1 focus-within:ring-[color-mix(in_srgb,var(--theme-primary)_20%,transparent)]">
                    <User size={16} className="text-muted-foreground" />
                    <input
                      id="admin-login-account"
                      type="text"
                      value={account}
                      onChange={(e) => {
                        setAccount(e.target.value);
                        if (fieldErrors.account) setFieldErrors((s) => ({ ...s, account: undefined }));
                      }}
                      placeholder={t("login.accountPlaceholder")}
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleLogin();
                      }}
                    />
                  </div>
                  {fieldErrors.account ? <p className="mt-1 text-xs text-destructive">{fieldErrors.account}</p> : null}
                </div>

                <div>
                  <label htmlFor="admin-login-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.passwordLabel")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] focus-within:ring-1 focus-within:ring-[color-mix(in_srgb,var(--theme-primary)_20%,transparent)]">
                    <Lock size={16} className="text-muted-foreground" />
                    <input
                      id="admin-login-password"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((s) => ({ ...s, password: undefined }));
                      }}
                      placeholder={t("login.passwordPlaceholder")}
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleLogin();
                      }}
                    />
                    <UnifiedButton
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      aria-label={showPwd ? tText("\u9690\u85cf\u5bc6\u7801") : tText("\u663e\u793a\u5bc6\u7801")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2"
                    >
                      {showPwd ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                    </UnifiedButton>
                  </div>
                  {fieldErrors.password ? <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p> : null}
                </div>

                <UnifiedButton
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className={adminLoginPrimaryButtonClass}
                >
                  {loading ? t("login.submitting") : t("login.submit")}
                </UnifiedButton>
              </>
            )}
          </FormFieldShake>

          <div className="mt-6 text-center">
            <UnifiedButton
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {t("login.backToStore")}
            </UnifiedButton>
          </div>
        </div>
      </div>
    </div>
  );
}
