import { useState, useEffect, useMemo, useCallback, type KeyboardEvent } from "react";
import { AlertCircle, Eye, EyeOff, Lock, User, KeyRound } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import * as authService from "@/services/authService";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import LoginBannerCarousel from "@/components/LoginBannerCarousel";
import { LoginAgreementFooter } from "@/components/auth/LoginAgreementFooter";
import { LoginPasswordResetSheet } from "@/components/auth/LoginPasswordResetSheet";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { renderBrandTitle } from "@/utils/brand";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import {
  clearLockedInviteCode,
  getLockedInviteCode,
  syncLockedInviteCodeBySearch,
} from "@/utils/inviteReferral";
import { SMS_OTP_LOGIN_BUILD_HINT, THIRD_PARTY_LOGIN_ENABLED } from "@/constants/authLogin";
import { readCachedAuthFeatures, writeCachedAuthFeatures } from "@/utils/authFeaturesCache";
import { STORE_AUTH_MAIN_CLASS, STORE_AUTH_SHELL_CLASS } from "@/constants/storeLayout";
import { cn } from "@/lib/utils";
import { FormFieldShake } from "@/modules/micro-interactions";
import CountryPhoneInput from "@/components/auth/CountryPhoneInput";
import {
  authErrorMessage,
  validatePhoneForCountry,
  validateStrongPassword,
} from "@/utils/authValidation";
import { useFormFieldFocus } from "@/hooks/useFormFieldFocus";
import { useSupportRuntime } from "@/hooks/useSupportRuntime";

const REMEMBER_KEY = "login_remembered_phone";
/** text-base(16px) 避免 iOS 聚焦时自动缩放视口导致整页闪动 */
const INPUT_CLASS =
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-[border-color,box-shadow]";
const INPUT_ERROR_CLASS =
  "border-destructive focus:border-destructive focus:ring-destructive/20";
const REMEMBER_COUNTRY_CODE_KEY = "login_remembered_country_code";
type AuthMode = "login" | "register";
type CredentialMode = "password" | "otp";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const authStore = useAuthStore();
  const { banners } = useHomeBanners();
  const siteInfo = useSiteInfo();
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const siteName = siteInfo.siteName || "官方商城";
  const slogan = siteInfo.siteSlogan || "Premium Lifestyle";
  const { channels } = useSupportRuntime();
  const supportContact = useMemo(() => {
    const wa = channels.find((channel) => channel.type === "whatsapp");
    return wa?.account?.trim() || siteInfo.contactPhone || siteInfo.contactEmail || "客服";
  }, [channels, siteInfo.contactEmail, siteInfo.contactPhone]);
  const loginState = location.state as { from?: string; fromState?: unknown } | null;
  const rawFrom = loginState?.from;
  const fromState = loginState?.fromState;
  const from =
    rawFrom && rawFrom !== "/login" && rawFrom !== "/register" && !rawFrom.startsWith("/admin")
      ? rawFrom
      : "/";
  const [mode, setMode] = useState<AuthMode>(() =>
    location.pathname === "/register" ? "register" : "login",
  );
  useDocumentTitle(mode === "register" ? "注册" : "登录");
  const [credentialMode, setCredentialMode] = useState<CredentialMode>("password");
  const [countryCode, setCountryCode] = useState("+60");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [lockedInviteCode, setLockedInviteCode] = useState(getLockedInviteCode());
  const [inviteCode, setInviteCode] = useState(lockedInviteCode);
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [devResetToken, setDevResetToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [authFeatures, setAuthFeatures] = useState(() => {
    const cached = readCachedAuthFeatures();
    if (cached) return cached;
    if (SMS_OTP_LOGIN_BUILD_HINT !== null) {
      return { smsOtpLoginEnabled: SMS_OTP_LOGIN_BUILD_HINT };
    }
    return null;
  });
  const authFeaturesReady = authFeatures !== null;
  const smsOtpLoginEnabled = authFeatures?.smsOtpLoginEnabled === true;
  const effectiveCredentialMode: CredentialMode =
    authFeaturesReady && smsOtpLoginEnabled ? credentialMode : "password";
  const { formCompact } = useFormFieldFocus();
  const hasLockedInviteCode = !!lockedInviteCode;
  const [shakeKey, setShakeKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; password?: string; otp?: string; nickname?: string }>({});
  const [formError, setFormError] = useState("");
  const focusField = (field: keyof typeof fieldErrors) => {
    const idByField: Record<keyof typeof fieldErrors, string> = {
      phone: "auth-phone",
      password: "auth-password",
      otp: "auth-otp",
      nickname: "auth-nickname",
    };
    window.requestAnimationFrame(() => document.getElementById(idByField[field])?.focus());
  };
  const clearFieldError = (field: keyof typeof fieldErrors) => {
    if (!fieldErrors[field] && !formError) return;
    setFieldErrors((s) => ({ ...s, [field]: undefined }));
    setFormError("");
  };
  const failValidation = (message: string, field?: keyof typeof fieldErrors) => {
    setShakeKey((k) => k + 1);
    setFormError(message);
    if (field) {
      setFieldErrors({ [field]: message } as typeof fieldErrors);
      focusField(field);
      return;
    }
    toast.error(message);
  };

  const focusNextAuthField = useCallback(() => {
    if (mode === "login" && effectiveCredentialMode === "otp") {
      document.getElementById("auth-otp")?.focus();
      return;
    }
    document.getElementById("auth-password")?.focus();
  }, [mode, effectiveCredentialMode]);

  const handlePhoneKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      focusNextAuthField();
    },
    [focusNextAuthField],
  );

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setPhone(saved);
      setRemember(true);
    }
    const savedCc = localStorage.getItem(REMEMBER_COUNTRY_CODE_KEY);
    if (savedCc === "+60" || savedCc === "+86") setCountryCode(savedCc);
    else setCountryCode("+60");
  }, []);

  useEffect(() => {
    if (location.pathname === "/register") {
      setMode("register");
      setCredentialMode("password");
    } else if (location.pathname === "/login" && !syncLockedInviteCodeBySearch(location.search)) {
      setMode("login");
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const normalized = syncLockedInviteCodeBySearch(location.search);
    if (!normalized) return;
    setMode("register");
    setLockedInviteCode(normalized);
    setInviteCode(normalized);
  }, [location.search]);

  const switchAuthMode = (m: AuthMode) => {
    setMode(m);
    setShowReset(false);
    setFieldErrors({});
    setFormError("");
    if (m === "register") setCredentialMode("password");
    const target = m === "register" ? "/register" : "/login";
    if (location.pathname !== target) {
      navigate(target, { replace: true, state: location.state });
    }
  };

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = window.setInterval(() => {
      setOtpCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [otpCooldown]);

  useEffect(() => {
    let cancelled = false;
    authService
      .getAuthFeatures()
      .then((features) => {
        if (cancelled) return;
        const enabled = features.smsOtpLoginEnabled !== false;
        const snapshot = { smsOtpLoginEnabled: enabled };
        setAuthFeatures(snapshot);
        writeCachedAuthFeatures(snapshot);
        if (!enabled) setCredentialMode("password");
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = readCachedAuthFeatures() ?? { smsOtpLoginEnabled: false };
        setAuthFeatures(fallback);
        if (!fallback.smsOtpLoginEnabled) setCredentialMode("password");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!THIRD_PARTY_LOGIN_ENABLED) return;
    const params = new URLSearchParams(location.search);
    const oauthErr = params.get("oauthError");
    const wechatErr = params.get("wechatError");
    const wechatLogin = params.get("wechatLogin");
    const oauthCode = params.get("oauthCode");
    const oauthProvider = params.get("oauthProvider");
    if (oauthErr || wechatErr) {
      const msg = decodeURIComponent((oauthErr || wechatErr || "").replace(/\+/g, " "));
      toast.error(authErrorMessage(new Error(msg), msg || "第三方登录失败"));
      navigate("/login", { replace: true });
      return;
    }
    if (wechatLogin === "1") {
      let cancelled = false;
      (async () => {
        try {
          await authService.establishSessionFromExistingCookies();
          if (cancelled) return;
          useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
          const { useCartStore } = await import("@/stores/useCartStore");
          const { useFavoritesStore } = await import("@/stores/useFavoritesStore");
          const { useHistoryStore } = await import("@/stores/useHistoryStore");
          const localCartSnapshot = [...useCartStore.getState().items];
          const localFavoriteIds = [...useFavoritesStore.getState().favoriteIds];
          const localFavoriteProducts = [...useFavoritesStore.getState().favoriteProducts];
          const localHistorySnapshot = [...useHistoryStore.getState().history];
          await Promise.allSettled([
            useCartStore.getState().mergeLocalThenSync(localCartSnapshot),
            useFavoritesStore.getState().mergeLocalThenSync(localFavoriteIds, localFavoriteProducts),
            useHistoryStore.getState().mergeLocalThenSync(localHistorySnapshot),
            useUserStore.getState().loadProfile(),
          ]);
          if (cancelled) return;
          toast.success("登录成功", { duration: 900, position: "top-center" });
          navigate(from, { replace: true, state: fromState });
        } catch (e) {
          if (!cancelled) {
            toast.error(e instanceof Error ? e.message : "登录失败");
          }
          navigate("/login", { replace: true });
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (!oauthCode || oauthProvider !== "google") return;

    let cancelled = false;
    (async () => {
      try {
        await useAuthStore.getState().completeOAuthLogin({
          code: oauthCode,
          provider: oauthProvider,
        });
        if (cancelled) return;
        toast.success("登录成功", { duration: 900, position: "top-center" });
        navigate(from, { replace: true, state: fromState });
      } catch (e) {
        if (!cancelled) {
          const fallback = useAuthStore.getState().error;
          toast.error(e instanceof Error ? e.message : (fallback ?? "登录失败"));
        }
        navigate("/login", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, from, fromState]);

  const loading = authStore.loading;

  const handleSendOtp = async () => {
    if (!smsOtpLoginEnabled) {
      failValidation("当前未开启短信验证码登录");
      return;
    }
    const phoneError = validatePhoneForCountry(phone, countryCode);
    if (phoneError) {
      failValidation(phoneError, "phone");
      return;
    }
    if (otpCooldown > 0 || otpSending) return;
    setOtpSending(true);
    try {
      const data = await authService.sendOtp({ phone, countryCode });
      if (data?.devOtp) {
        toast.message("开发验证码：" + data.devOtp, { duration: 12_000 });
      }
      toast.success("验证码已发送", { ...toastPresetQuickSuccess, position: "top-center" });
      setOtpCooldown(60);
    } catch (e) {
      toast.error(authErrorMessage(e, "发送验证码失败"));
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    setFormError("");
    if (mode === "register" && !hasLockedInviteCode && !nickname.trim()) {
      failValidation("请输入昵称", "nickname");
      return;
    }

    const phoneError = validatePhoneForCountry(phone, countryCode);
    if (phoneError) {
      failValidation(phoneError, "phone");
      return;
    }

    if (mode === "login" && effectiveCredentialMode === "otp") {
      if (!smsOtpLoginEnabled) {
        failValidation("当前未开启短信验证码登录");
        return;
      }
      if (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim())) {
        failValidation("请输入 6 位验证码", "otp");
        return;
      }
    } else if (!password) {
      failValidation("请输入密码", "password");
      return;
    }

    if (mode === "register") {
      const passwordError = validateStrongPassword(password);
      if (passwordError) {
        failValidation(passwordError, "password");
        return;
      }
    }

    try {
      if (mode === "login") {
        if (effectiveCredentialMode === "password") {
          if (remember) {
            localStorage.setItem(REMEMBER_KEY, phone);
            localStorage.setItem(REMEMBER_COUNTRY_CODE_KEY, countryCode);
          } else {
            localStorage.removeItem(REMEMBER_KEY);
            localStorage.removeItem(REMEMBER_COUNTRY_CODE_KEY);
          }
          await authStore.login({ phone, countryCode, password });
        } else {
          await authStore.loginWithOtp({
            phone,
            countryCode,
            code: otpCode.trim(),
          });
        }
      } else {
        await authStore.register({
          phone,
          countryCode,
          password,
          nickname: nickname.trim() || undefined,
          inviteCode: inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined,
        });
        clearLockedInviteCode();
      }
      toast.success(mode === "login" ? "登录成功" : "注册成功", {
        duration: 900,
        position: "top-center",
      });
      navigate(from, { replace: true, state: fromState });
    } catch (e) {
      toast.error(authErrorMessage(e, mode === "login" ? "登录失败" : "注册失败"));
    }
  };

  const handleRequestReset = async () => {
    const phoneError = validatePhoneForCountry(phone, countryCode);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    setResetLoading(true);
    setDevResetToken("");
    try {
      const data = await authService.requestPasswordReset({ phone, countryCode });
      if (data?.resetToken) {
        setResetToken(data.resetToken);
        setDevResetToken(data.resetToken);
      }
      toast.success(data?.resetToken ? "已生成重置口令" : "重置口令已发送（如已配置）", toastPresetQuickSuccess);
    } catch (e) {
      toast.error(authErrorMessage(e, "请求重置失败"));
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetToken.trim()) {
      toast.error("请输入重置令牌");
      return;
    }
    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setResetLoading(true);
    try {
      await authService.resetPassword({ token: resetToken.trim(), newPassword });
      toast.success("密码已重置，请使用新密码登录", toastPresetQuickSuccess);
      setPassword(newPassword);
      closeResetSheet();
    } catch (e) {
      toast.error(authErrorMessage(e, "重置失败"));
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetSheet = () => {
    setShowReset(false);
    setResetToken("");
    setNewPassword("");
    setDevResetToken("");
  };

  return (
    <div className={STORE_AUTH_SHELL_CLASS}>
      <header className="relative z-20 flex shrink-0 items-center gap-3 border-b border-border/40 bg-background px-[var(--store-page-x)] pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:hidden">
        {logoSrc ? (
          <img src={logoSrc} alt={siteName} width={44} height={44} className="rounded-xl object-contain" loading="eager" decoding="async" />
        ) : null}
        <div className="min-w-0 flex flex-col">
          <h1 className="font-display text-xl font-bold leading-tight tracking-tight text-foreground">
            {renderBrandTitle(siteName)}
          </h1>
          <p className="truncate text-[11px] uppercase tracking-widest text-muted-foreground">{slogan}</p>
        </div>
      </header>

      <main className={STORE_AUTH_MAIN_CLASS}>
        <div className="mb-6 hidden text-center lg:block">
          {logoSrc ? (
            <img src={logoSrc} alt="" width={56} height={56} className="mx-auto rounded-2xl object-contain" />
          ) : null}
          <h1 className="mt-3 font-display text-2xl font-bold text-foreground">{renderBrandTitle(siteName)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{slogan}</p>
        </div>
        {banners.length > 0 ? (
          <section
            className="mb-4 overflow-hidden lg:hidden [transition:none]"
          >
            <LoginBannerCarousel banners={banners} paused={formCompact} />
          </section>
        ) : null}

        <section className="mb-5 shrink-0">
          <h2 className="font-display text-xl font-bold text-foreground sm:text-[22px]">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "登录您的账号，畅享品质购物" : "注册新账号，开启品质购物之旅"}
          </p>
        </section>

        <section className="mb-4">
          <div className="flex rounded-2xl bg-secondary p-1">
            {(["login", "register"] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchAuthMode(m)}
                className={`relative flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "登 录" : "注 册"}
              </button>
            ))}
          </div>
        </section>

        {mode === "login" && !authFeaturesReady ? (
          <section
            className="mb-4 h-[42px] animate-pulse rounded-2xl bg-secondary"
            aria-hidden="true"
          />
        ) : null}

        {mode === "login" && authFeaturesReady && smsOtpLoginEnabled ? (
          <section className="mb-4 flex rounded-2xl bg-secondary p-1" role="tablist" aria-label="登录方式">
            {(["password", "otp"] as CredentialMode[]).map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={credentialMode === c}
                onClick={() => {
                  setCredentialMode(c);
                  setShowReset(false);
                  setFieldErrors({});
                  setFormError("");
                }}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
                  credentialMode === c
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {c === "password" ? "密码登录" : "验证码登录"}
              </button>
            ))}
          </section>
        ) : null}

        {formError ? (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-destructive" role="alert">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        <FormFieldShake shake={shakeKey} className="space-y-3.5">
          <form
            className="flex flex-col gap-3.5"
            autoComplete="on"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
          {mode === "register" && !hasLockedInviteCode && (
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="auth-nickname"
                type="text"
                placeholder="昵称"
                value={nickname}
                aria-invalid={Boolean(fieldErrors.nickname) || undefined}
                onChange={(e) => {
                  setNickname(e.target.value);
                  clearFieldError("nickname");
                }}
                className={cn(INPUT_CLASS, "pl-12 pr-4", fieldErrors.nickname && INPUT_ERROR_CLASS)}
              />
            </div>
          )}
          {mode === "register" && (
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={hasLockedInviteCode ? "邀请码（已锁定）" : "邀请码（选填）"}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                readOnly={hasLockedInviteCode}
                className={cn(
                  INPUT_CLASS,
                  "pl-12 pr-4",
                  hasLockedInviteCode && "cursor-default opacity-80",
                )}
              />
            </div>
          )}

          <CountryPhoneInput
            countryCode={countryCode}
            onCountryCodeChange={(value) => {
              setCountryCode(value);
              clearFieldError("phone");
            }}
            phone={phone}
            onPhoneChange={(value) => {
              setPhone(value);
              clearFieldError("phone");
            }}
            errorText={fieldErrors.phone}
            hasError={Boolean(fieldErrors.phone)}
            showErrorText={false}
            phoneInputId="auth-phone"
            phoneInputName="tel"
            phoneAutoComplete="tel"
            enterKeyHint="next"
            onPhoneKeyDown={handlePhoneKeyDown}
          />

          {(mode === "register" || (mode === "login" && effectiveCredentialMode === "password")) ? (
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="auth-password"
                name="password"
                type={showPwd ? "text" : "password"}
                placeholder="密码"
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                autoCorrect="off"
                autoCapitalize="none"
                enterKeyHint={mode === "login" ? "go" : "done"}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                className={cn(INPUT_CLASS, "pl-12 pr-12", fieldErrors.password && INPUT_ERROR_CLASS)}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground touch-target"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          ) : null}

          {mode === "login" && effectiveCredentialMode === "otp" ? (
            <>
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="auth-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6 位验证码"
                  enterKeyHint="go"
                  value={otpCode}
                  maxLength={6}
                  aria-invalid={Boolean(fieldErrors.otp) || undefined}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    clearFieldError("otp");
                  }}
                  className={cn(INPUT_CLASS, "pl-12 pr-4 tracking-widest", fieldErrors.otp && INPUT_ERROR_CLASS)}
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending || otpCooldown > 0 || !authFeaturesReady}
                className="w-full rounded-2xl border border-gold/40 bg-gold/10 py-3 text-xs font-semibold text-theme-price disabled:opacity-50"
              >
                {otpCooldown > 0 ? `${otpCooldown}s 后可重发` : otpSending ? "发送中…" : "发送验证码"}
              </button>
            </>
          ) : null}

          {mode === "login" && effectiveCredentialMode === "password" && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-border accent-gold w-4 h-4"
                />
                <span className="text-xs text-muted-foreground">记住账号</span>
              </label>
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-xs text-theme-price font-medium active:opacity-70"
              >
                忘记密码？
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl btn-theme-price py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                />
                处理中...
              </span>
            ) : mode === "login" ? "登 录" : "注 册"}
          </button>
          </form>
        </FormFieldShake>

      </main>

      <LoginPasswordResetSheet
        open={mode === "login" && showReset}
        onClose={closeResetSheet}
        supportContact={supportContact}
        resetToken={resetToken}
        onResetTokenChange={setResetToken}
        newPassword={newPassword}
        onNewPasswordChange={setNewPassword}
        devResetToken={devResetToken}
        resetLoading={resetLoading}
        onRequestReset={handleRequestReset}
        onConfirmReset={handleConfirmReset}
      />

      <LoginAgreementFooter
        mode={mode}
        termsPath={siteInfo.termsPath}
        privacyPath={siteInfo.privacyPolicyPath}
      />
    </div>
  );
}
