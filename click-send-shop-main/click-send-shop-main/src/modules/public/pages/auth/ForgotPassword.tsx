import { useMemo, useState } from "react";
import { ArrowLeft, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";

import { toast } from "sonner";
import CountryPhoneInput from "@/components/auth/CountryPhoneInput";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { STORE_AUTH_MAIN_CLASS, STORE_AUTH_SHELL_CLASS } from "@/constants/storeLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePublicLocale } from "@/i18n/publicLocale";
import * as authService from "@/services/authService";
import { authErrorMessage, validatePhoneForCountry, validateStrongPassword, type SupportedCountryCode } from "@/utils/authValidation";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

export default function ForgotPassword() {
  const navigate = useStorefrontNavigate();
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

  const hasResetToken = Boolean(resetToken.trim());

  return (
    <div className={`${STORE_AUTH_SHELL_CLASS} auth-forgot-page auth-next-page`}>
      <main className={`${STORE_AUTH_MAIN_CLASS} auth-forgot-main auth-next-main`}>
        <div className="auth-login-topbar">
          <button type="button" onClick={handleBack} aria-label="返回登录" className="auth-login-back-btn">
            <ArrowLeft size={19} aria-hidden />
          </button>
          <section className="auth-login-heading shrink-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-[22px]">找回密码</h1>
          </section>
        </div>

        <ol className="auth-next-progress" aria-label="找回密码进度">
          <li data-state="complete">
            <span>1</span>
            <strong>验证手机号</strong>
          </li>
          <li data-state={hasResetToken ? "current" : "upcoming"}>
            <span>2</span>
            <strong>设置新密码</strong>
          </li>
        </ol>

        <div className="auth-login-form-wrap auth-next-stack">
          <section className="sf-next-form-sheet auth-next-sheet">
            <div className="auth-next-sheet-head">
              <span aria-hidden><ShieldCheck size={18} /></span>
              <div>
                <h3>验证手机号</h3>
                <p>使用当前账号手机号获取重置口令。</p>
              </div>
            </div>

            <div className="sf-next-form-stack">
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
                className="sf-next-button sf-next-button--primary auth-login-submit auth-next-submit"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" aria-hidden /> 请求中...</> : "获取重置口令"}
              </UnifiedButton>
            </div>
          </section>

          {devResetToken ? (
            <div className="auth-next-token">
              <span>开发重置口令</span>
              <code>{devResetToken}</code>
            </div>
          ) : null}

          <section className="sf-next-form-sheet auth-next-sheet">
            <div className="auth-next-sheet-head">
              <span aria-hidden><Lock size={18} /></span>
              <div>
                <h3>设置新密码</h3>
                <p>填写重置口令后即可完成修改。</p>
              </div>
            </div>

            <div className="sf-next-form-stack">
              <label className="sf-next-field">
                <span className="sf-next-field__label">重置令牌</span>
                <span className="auth-next-input-wrap">
                  <KeyRound size={18} aria-hidden />
                  <input
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    placeholder="输入重置令牌"
                    aria-label="重置令牌"
                    className="sf-next-field__control"
                  />
                </span>
              </label>

              <label className="sf-next-field">
                <span className="sf-next-field__label">新密码</span>
                <span className="auth-next-input-wrap">
                  <Lock size={18} aria-hidden />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="输入新密码"
                    aria-label="新密码"
                    autoComplete="new-password"
                    className="sf-next-field__control"
                  />
                </span>
              </label>

              <label className="sf-next-field">
                <span className="sf-next-field__label">确认新密码</span>
                <span className="auth-next-input-wrap">
                  <Lock size={18} aria-hidden />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再次输入新密码"
                    aria-label="确认新密码"
                    autoComplete="new-password"
                    className="sf-next-field__control"
                  />
                </span>
              </label>

              <UnifiedButton
                type="button"
                onClick={confirmReset}
                disabled={!canReset || resetting}
                className="sf-next-button sf-next-button--secondary auth-next-submit"
              >
                {resetting ? <><Loader2 size={16} className="animate-spin" aria-hidden /> 重置中...</> : "确认重置"}
              </UnifiedButton>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
