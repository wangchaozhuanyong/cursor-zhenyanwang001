import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
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
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-[border-color,box-shadow]";

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

  useEffect(() => {
    if (!pendingToken) {
      toast.error("绑定凭证无效，请重新使用微信登录");
      navigate("/login", { replace: true });
    }
  }, [pendingToken, navigate]);

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
    if (!pendingToken) return;
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
    <main className="auth-page-shell flex min-h-screen flex-col bg-background px-5 py-8">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="font-display text-2xl font-bold text-foreground">绑定手机号</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          手机号用于订单通知、售后联系和账号安全。绑定后，你可以使用手机号或微信登录。
        </p>

        <FormFieldShake shake={shakeKey} className="mt-8 space-y-3.5">
          <CountryPhoneInput
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            phone={phone}
            onPhoneChange={setPhone}
            phoneInputId="bind-wechat-phone"
            phoneAutoComplete="tel"
          />

          <div className="relative">
            <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6 位验证码"
              value={otpCode}
              maxLength={6}
              aria-label="6 位验证码"
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={cn(INPUT_CLASS, "pl-12 pr-4 tracking-widest")}
            />
          </div>

          <UnifiedButton
            type="button"
            onClick={handleSendOtp}
            disabled={otpSending || otpCooldown > 0}
            className="w-full rounded-2xl border border-gold/40 bg-gold/10 py-3 text-xs font-semibold text-theme-price disabled:opacity-50"
          >
            {otpCooldown > 0 ? `${otpCooldown}s 后可重发` : otpSending ? "发送中…" : "获取验证码"}
          </UnifiedButton>

          <UnifiedButton
            type="button"
            onClick={handleSubmit}
            disabled={authStore.loading}
            className="w-full rounded-2xl btn-theme-price py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {authStore.loading ? "处理中…" : "绑定并登录"}
          </UnifiedButton>
        </FormFieldShake>
      </div>
    </main>
  );
}
