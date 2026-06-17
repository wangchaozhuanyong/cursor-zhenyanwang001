import { useMemo, useState } from "react";
import { ArrowLeft, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CountryPhoneInput from "@/components/auth/CountryPhoneInput";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { STORE_AUTH_MAIN_CLASS, STORE_AUTH_SHELL_CLASS } from "@/constants/storeLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePublicLocale } from "@/i18n/publicLocale";
import * as authService from "@/services/authService";
import { authErrorMessage, validatePhoneForCountry, validateStrongPassword, type SupportedCountryCode } from "@/utils/authValidation";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>("+60");
  const [phone, setPhone] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [devResetToken, setDevResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  useDocumentTitle("找回密码");

  const canReset = useMemo(() => resetToken.trim() && newPassword && confirmPassword, [confirmPassword, newPassword, resetToken]);

  const handleBack = () => {
    navigate(localizedPath("/login"), { replace: true });
  };

  const requestReset = async () => {
    const error = validatePhoneForCountry(phone, countryCode);
    if (error) {
      setPhoneError(error);
      return;
    }
    setPhoneError("");
    setLoading(true);
    setDevResetToken("");
    try {
      const data = await authService.requestPasswordReset({ phone, countryCode });
      if (data?.resetToken) {
        setResetToken(data.resetToken);
        setDevResetToken(data.resetToken);
      }
      toast.success(data?.resetToken ? "已生成重置口令" : "重置口令已发送（如已配置）", toastPresetQuickSuccess);
    } catch (error) {
      toast.error(authErrorMessage(error, "请求重置失败"));
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    if (!resetToken.trim()) {
      toast.error("请输入重置令牌");
      return;
    }
    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setResetting(true);
    try {
      await authService.resetPassword({ token: resetToken.trim(), newPassword });
      toast.success("密码已重置，请使用新密码登录", toastPresetQuickSuccess);
      navigate(localizedPath("/login"), { replace: true });
    } catch (error) {
      toast.error(authErrorMessage(error, "重置失败"));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className={`${STORE_AUTH_SHELL_CLASS} auth-forgot-page`}>
      <main className={`${STORE_AUTH_MAIN_CLASS} auth-forgot-main`}>
        <div className="auth-login-topbar">
          <button type="button" onClick={handleBack} aria-label="返回登录" className="auth-login-back-btn">
            <ArrowLeft size={19} aria-hidden />
          </button>
          <section className="auth-login-heading shrink-0">
            <h2 className="font-display text-xl font-bold text-foreground sm:text-[22px]">找回密码</h2>
          </section>
        </div>

        <section className="auth-v12-note">
          <span aria-hidden><ShieldCheck size={18} /></span>
          <div>
            <strong>通过手机号获取重置口令</strong>
            <p>如果短信或后台开发口令已配置，系统会返回可用于重置密码的令牌。</p>
          </div>
        </section>

        <div className="auth-login-form-wrap space-y-3.5">
          <CountryPhoneInput
            countryCode={countryCode}
            onCountryCodeChange={(value) => {
              setCountryCode(value);
              setPhoneError("");
            }}
            phone={phone}
            onPhoneChange={(value) => {
              setPhone(value);
              setPhoneError("");
            }}
            errorText={phoneError}
            hasError={Boolean(phoneError)}
            phoneInputId="forgot-phone"
            phoneInputName="tel"
            phoneAutoComplete="tel"
            autoDetectCountryCode
          />

          <UnifiedButton
            type="button"
            onClick={requestReset}
            disabled={loading}
            className="auth-login-submit min-h-12 w-full rounded-2xl btn-theme-price px-4 py-3.5 text-sm font-bold text-[var(--theme-price-foreground)]"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" aria-hidden /> 请求中...</> : "获取重置口令"}
          </UnifiedButton>

          {devResetToken ? (
            <div className="auth-v12-token">
              <span>开发重置口令</span>
              <code>{devResetToken}</code>
            </div>
          ) : null}

          <div className="relative">
            <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={resetToken}
              onChange={(event) => setResetToken(event.target.value)}
              placeholder="重置令牌"
              aria-label="重置令牌"
              className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)]"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="新密码"
              aria-label="新密码"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)]"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="确认新密码"
              aria-label="确认新密码"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)]"
            />
          </div>

          <UnifiedButton
            type="button"
            onClick={confirmReset}
            disabled={!canReset || resetting}
            className="min-h-12 w-full rounded-2xl border border-[color-mix(in_srgb,var(--theme-primary)_35%,var(--theme-border))] bg-[var(--theme-surface)] px-4 py-3.5 text-sm font-bold text-[var(--theme-primary)] disabled:opacity-55"
          >
            {resetting ? <><Loader2 size={16} className="animate-spin" aria-hidden /> 重置中...</> : "确认重置"}
          </UnifiedButton>
        </div>
      </main>
    </div>
  );
}
