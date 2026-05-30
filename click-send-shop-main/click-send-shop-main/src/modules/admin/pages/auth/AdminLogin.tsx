import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Fingerprint, KeyRound, Lock, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { adminLogin, verifyAdminMfa, verifyAdminPasskeyLogin } from "@/services/admin/accountService";
import { adminLoginErrorMessage } from "@/utils/storefrontError";
import { FormFieldShake } from "@/modules/micro-interactions";
import { useAdminT } from "@/hooks/useAdminT";
import AdminSiteLogo from "@/components/admin/AdminSiteLogo";

function normalizeMfaCode(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\D/g, "")
    .slice(0, 6);
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const { t, tText, locale } = useAdminT();
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
    toast.success(t("login.loginSuccess"));
    navigate("/admin");
  };

  const handleLogin = async () => {
    const normalizedAccount = account.trim();
    const nextErrors: { account?: string; password?: string } = {};
    if (!normalizedAccount) nextErrors.account = tText("请输入管理员账号");
    if (!password.trim()) nextErrors.password = tText("请输入密码");
    if (nextErrors.account || nextErrors.password) {
      setFieldErrors(nextErrors);
      setShakeKey((k) => k + 1);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
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
      toast.error(adminLoginErrorMessage(e, t("login.loginFailed")));
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
      toast.error(tText("请输入完整的 6 位验证码"));
      return;
    }
    mfaSubmittingRef.current = true;
    setLoading(true);
    try {
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
      toast.error(adminLoginErrorMessage(e, tText("多因素验证失败，请检查验证码是否正确或是否已过期")));
    } finally {
      mfaSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleVerifyPasskey = async () => {
    if (!mfaState?.ticket) return;
    setPasskeyLoading(true);
    try {
      await verifyAdminPasskeyLogin({
        mfaTicket: mfaState.ticket,
        username: account.trim(),
        trustDevice,
        trustDays,
      });
      finishLogin();
    } catch (e) {
      setShakeKey((k) => k + 1);
      toast.error(adminLoginErrorMessage(e, tText("Passkey 验证失败")));
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
              <AdminSiteLogo size="lg" />
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
                          <QRCodeSVG value={mfaState.otpAuthUrl} size={168} />
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
                    <button
                      type="button"
                      onClick={handleVerifyPasskey}
                      disabled={loading || passkeyLoading}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-50"
                    >
                      <Fingerprint size={16} />
                      {passkeyLoading ? tText("正在验证 Passkey...") : tText("使用 Passkey 登录")}
                    </button>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      <span>{tText("或输入验证码")}</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  </>
                ) : null}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.mfaCodeLabel")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/20">
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
                    <span>{tText("信任此设备")}</span>
                  </label>
                  {trustDevice ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {([7, 14, 30] as const).map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setTrustDays(days)}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                            trustDays === days
                              ? "border-gold/60 bg-gold/10 text-foreground"
                              : "border-border text-muted-foreground hover:bg-background"
                          }`}
                        >
                          {locale === "en" ? `${days} days` : `${days} 天`}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyMfa}
                  disabled={loading || passkeyLoading || mfaCode.length !== 6}
                  className="touch-manipulation mt-2 min-h-[48px] w-full rounded-xl btn-theme-price py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-95 disabled:opacity-50 sm:text-sm"
                >
                  {loading ? t("login.mfaVerifying") : t("login.mfaVerifySubmit")}
                </button>
                <button
                  type="button"
                  onClick={() => setMfaState(null)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("login.mfaBackToPassword")}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.accountLabel")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/20">
                    <User size={16} className="text-muted-foreground" />
                    <input
                      type="text"
                      value={account}
                      onChange={(e) => {
                        setAccount(e.target.value);
                        if (fieldErrors.account) setFieldErrors((s) => ({ ...s, account: undefined }));
                      }}
                      placeholder={t("login.accountPlaceholder")}
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                  </div>
                  {fieldErrors.account ? <p className="mt-1 text-xs text-destructive">{fieldErrors.account}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.passwordLabel")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/20">
                    <Lock size={16} className="text-muted-foreground" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((s) => ({ ...s, password: undefined }));
                      }}
                      placeholder={t("login.passwordPlaceholder")}
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password ? <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p> : null}
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="touch-manipulation mt-2 min-h-[48px] w-full rounded-xl btn-theme-price py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-95 disabled:opacity-50 sm:text-sm"
                >
                  {loading ? t("login.submitting") : t("login.submit")}
                </button>
              </>
            )}
          </FormFieldShake>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-foreground">
              {t("login.backToStore")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
