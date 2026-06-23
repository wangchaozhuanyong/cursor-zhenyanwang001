import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import * as authService from "@/services/authService";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { FormFieldShake } from "@/modules/micro-interactions";
import CountryPhoneInput from "@/components/auth/CountryPhoneInput";
import { validatePhoneForCountry } from "@/utils/authValidation";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const INPUT_CLASS =
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)] transition-[border-color,box-shadow]";

export default function BindWechatPhone() {
  useDocumentTitle("绑定手机号");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingToken = searchParams.get("pendingWechatToken") || "";
  const authStore = useAuthStore();

  const [countryCode, setCountryCode] = useState("+60");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const credentialInvalid = !pendingToken;

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = window.setInterval(() => {
      setOtpCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [otpCooldown]);

  const failValidation = (message: string) => {
    setShakeKey((k) => k + 1);
    toast.error(message);
  };

  const handleSendOtp = async () => {
    if (credentialInvalid) {
      failValidation("绑定凭证无效，请重新使用微信登录");
      return;
    }
    const phoneError = validatePhoneForCountry(phone, countryCode);
    if (phoneError) {
      failValidation(phoneError);
      return;
    }
    if (otpCooldown > 0 || otpSending) return;
    setOtpSending(true);
    try {
      const data = await authService.sendWechatBindOtp({ phone, countryCode });
      if (data?.devOtp) {
        toast.message(`开发环境验证码：${data.devOtp}`, { duration: 12_000 });
      }
      toast.success("验证码已发送", { ...toastPresetQuickSuccess, position: "top-center" });
      setOtpCooldown(60);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败");
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async () => {
    if (credentialInvalid) {
      failValidation("绑定凭证无效，请重新使用微信登录");
      return;
    }
    const phoneError = validatePhoneForCountry(phone, countryCode);
    if (phoneError) {
      failValidation(phoneError);
      return;
    }
    if (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim())) {
      failValidation("请填写 6 位验证码");
      return;
    }
    try {
      await authStore.bindWechatPhone({
        phone,
        countryCode,
        smsCode: otpCode.trim(),
        pendingWechatToken: pendingToken,
      });
      toast.success("绑定成功", { duration: 900, position: "top-center" });
      navigate("/", { replace: true });
    } catch (e) {
      const fallback = useAuthStore.getState().error;
      toast.error(e instanceof Error ? e.message : (fallback ?? "绑定失败"));
    }
  };

  return (
    <div className="auth-page-shell sf-next-page store-v12-page auth-v12-page auth-next-page auth-bind-phone-page">
      <main className="auth-page-main auth-v12-main auth-next-main">
        <div className="auth-login-topbar">
          <button type="button" onClick={() => navigate("/login", { replace: true })} aria-label="返回登录" className="auth-login-back-btn">
            <ArrowLeft size={19} aria-hidden />
          </button>
          <section className="auth-login-heading shrink-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-[22px]">绑定手机号</h1>
          </section>
        </div>

        <section className="auth-next-status" aria-label="绑定状态">
          <span aria-hidden><ShieldCheck size={20} /></span>
          <div>
            <strong>{credentialInvalid ? "绑定凭证已失效" : "完成账号绑定"}</strong>
            <p>{credentialInvalid ? "请重新使用微信登录后继续绑定手机号。" : "手机号用于订单通知、售后联系和账号安全。"}</p>
          </div>
        </section>

        {credentialInvalid ? (
          <section className="auth-login-form-wrap auth-next-stack">
            <div className="sf-next-form-sheet auth-next-sheet" role="alert">
              <div className="auth-next-sheet-head">
                <span aria-hidden><KeyRound size={18} /></span>
                <div>
                  <h3>需要重新授权</h3>
                  <p>当前页面缺少有效的第三方绑定凭证，无法发送验证码或完成绑定。</p>
                </div>
              </div>
              <UnifiedButton
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="sf-next-button sf-next-button--primary"
              >
                返回登录
              </UnifiedButton>
            </div>
          </section>
        ) : (
          <FormFieldShake shake={shakeKey} className="auth-login-form-wrap auth-next-stack">
            <section className="sf-next-form-sheet auth-next-sheet">
              <div className="auth-next-sheet-head">
                <span aria-hidden><KeyRound size={18} /></span>
                <div>
                  <h3>验证手机号</h3>
                  <p>输入短信验证码后完成绑定并登录。</p>
                </div>
              </div>

              <div className="sf-next-form-stack">
                <CountryPhoneInput
                  countryCode={countryCode}
                  onCountryCodeChange={setCountryCode}
                  phone={phone}
                  onPhoneChange={setPhone}
                  phoneInputId="bind-wechat-phone"
                  phoneAutoComplete="tel"
                  autoDetectCountryCode
                />

                <label className="sf-next-field">
                  <span className="sf-next-field__label">验证码</span>
                  <span className="auth-next-input-wrap">
                    <KeyRound size={18} aria-hidden />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6 位验证码"
                      value={otpCode}
                      maxLength={6}
                      aria-label="6 位验证码"
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={cn(INPUT_CLASS, "sf-next-field__control tracking-widest")}
                    />
                  </span>
                </label>

                <div className="auth-next-actions">
                  <UnifiedButton
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending || otpCooldown > 0}
                    className="sf-next-button sf-next-button--secondary"
                  >
                    {otpCooldown > 0 ? `${otpCooldown}s 后可重发` : otpSending ? "发送中..." : "获取验证码"}
                  </UnifiedButton>

                  <UnifiedButton
                    type="button"
                    onClick={handleSubmit}
                    disabled={authStore.loading}
                    className="sf-next-button sf-next-button--primary"
                  >
                    {authStore.loading ? "处理中..." : "绑定并登录"}
                  </UnifiedButton>
                </div>
              </div>
            </section>
          </FormFieldShake>
        )}
      </main>
    </div>
  );
}
