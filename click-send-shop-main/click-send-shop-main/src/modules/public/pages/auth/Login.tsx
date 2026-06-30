import { useState, useEffect, useMemo, useCallback, type CSSProperties, type KeyboardEvent } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, User, KeyRound } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import * as authService from "@/services/authService";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import LoginBannerCarousel from "@/components/LoginBannerCarousel";
import HomeTrustBar from "@/components/HomeTrustBar";
import { LoginAgreementFooter } from "@/components/auth/LoginAgreementFooter";
import { LoginPasswordResetSheet } from "@/components/auth/LoginPasswordResetSheet";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import {
  clearLockedInviteCode,
  getLockedInviteCode,
  syncLockedInviteCodeBySearch,
} from "@/utils/inviteReferral";
import { SMS_OTP_LOGIN_BUILD_HINT, THIRD_PARTY_LOGIN_ENABLED } from "@/constants/authLogin";
import { readCachedAuthFeatures, writeCachedAuthFeatures } from "@/utils/authFeaturesCache";
import { STORE_AUTH_MAIN_CLASS, STORE_AUTH_SHELL_CLASS } from "@/constants/storeLayout";
import { isHomeModuleEnabled } from "@/constants/homeModules";
import { cn } from "@/lib/utils";
import { FormFieldShake } from "@/modules/micro-interactions";
import CountryPhoneInput from "@/components/auth/CountryPhoneInput";
import {
  authErrorMessage,
  inferCountryCodeFromPhone,
  validatePhoneForCountry,
  validateStrongPassword,
} from "@/utils/authValidation";
import { useFormFieldFocus } from "@/hooks/useFormFieldFocus";
import { useSupportRuntime } from "@/hooks/useSupportRuntime";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { resolveAuthRedirectTarget, resolveLoginCancelTarget } from "@/utils/authRedirect";
import { buildRoutePath, readRouteBack } from "@/utils/routeBackState";
import { stripPublicLocaleFromPathname, usePublicLocale } from "@/i18n/publicLocale";

const REMEMBER_KEY = "login_remembered_phone";
/** text-base(16px) 避免 iOS 聚焦时自动缩放视口导致整页闪动 */
const INPUT_CLASS =
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)] transition-[border-color,box-shadow]";
const INPUT_ERROR_CLASS =
  "border-destructive focus:border-destructive focus:ring-destructive/20";
const REMEMBER_COUNTRY_CODE_KEY = "login_remembered_country_code";
type AuthMode = "login" | "register";
type CredentialMode = "password" | "otp";
type AuthNavigationState = { from?: string; fromState?: unknown; cancelFrom?: string };

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { localizedPath, t } = usePublicLocale();
  const canonicalPathname = stripPublicLocaleFromPathname(location.pathname);
  const authStore = useAuthStore();
  const { banners } = useHomeBanners();
  const { settings: homeModules } = useHomeModuleSettings();
  const siteInfo = useSiteInfo();
  const { channels } = useSupportRuntime();
  const supportContact = useMemo(() => {
    const wa = channels.find((channel) => channel.type === "whatsapp");
    return wa?.account?.trim() || siteInfo.contactPhone || siteInfo.contactEmail || "客服";
  }, [channels, siteInfo.contactEmail, siteInfo.contactPhone]);
  const loginState = location.state as AuthNavigationState | null;
  const rawFrom = loginState?.from;
  const fromState = loginState?.fromState;
  const from = useMemo(() => resolveAuthRedirectTarget(rawFrom), [rawFrom]);
  const currentPath = buildRoutePath(location);
  const handleBack = useCallback(() => {
    const trackedFrom = readRouteBack(location.key, currentPath);
    const target = resolveLoginCancelTarget({
      currentPath,
      cancelFrom: loginState?.cancelFrom,
      returnTo: rawFrom,
      trackedFrom,
      fallback: localizedPath("/"),
    });
    navigate(target, { replace: true, state: target === from ? fromState : undefined });
  }, [currentPath, from, fromState, localizedPath, location.key, loginState?.cancelFrom, navigate, rawFrom]);
  const [mode, setMode] = useState<AuthMode>(() =>
    canonicalPathname === "/register" ? "register" : "login",
  );
  useDocumentTitle(mode === "register" ? t("auth.register") : t("auth.login"));
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
  const { formCompact, keyboardOpen, keyboardInset, visualViewportOffsetTop, visualViewportHeight } = useFormFieldFocus();
  const showHomeTrustBar = isHomeModuleEnabled(homeModules, "trust_bar", "guest");
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
    else setCountryCode(inferCountryCodeFromPhone(saved || "") || "+60");
  }, []);

  useEffect(() => {
    if (canonicalPathname === "/register") {
      setMode("register");
      setCredentialMode("password");
    } else if (canonicalPathname === "/login" && !syncLockedInviteCodeBySearch(location.search)) {
      setMode("login");
    }
  }, [canonicalPathname, location.search]);

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
    if (canonicalPathname !== target) {
      navigate(localizedPath(target), { replace: true, state: location.state });
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
      navigate(localizedPath("/login"), { replace: true });
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
        navigate(localizedPath("/login"), { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, from, fromState, localizedPath]);

  const loading = authStore.loading;
  const submitLabel = mode === "login" ? t("auth.login") : t("auth.register");
  const submitLoadingLabel = mode === "login" ? t("auth.loggingIn") : t("auth.registering");

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
    if (loading) return;
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

  const authShellStyle = useMemo(() => ({
    "--auth-keyboard-inset": `${Math.max(0, Math.round(keyboardInset))}px`,
    "--auth-visual-offset-top": `${Math.max(0, Math.round(visualViewportOffsetTop))}px`,
    "--auth-visual-height": visualViewportHeight > 0 ? `${Math.round(visualViewportHeight)}px` : "100svh",
  }) as CSSProperties, [keyboardInset, visualViewportOffsetTop, visualViewportHeight]);

  useEffect(() => {
    if (!keyboardOpen) return;
    let revealTimer: number | undefined;

    const revealFocusedField = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      if (!active.closest(".auth-page-shell")) return;
      if (!active.matches("input, textarea, select")) return;

      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        const scrollContainer = active.closest("main.auth-page-main");
        if (!(scrollContainer instanceof HTMLElement)) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        const visibleTop = containerRect.top + 10;
        const visibleBottom = containerRect.bottom - 16;
        const shouldRevealSubmit = active.id === "auth-password" || active.id === "auth-otp";
        const revealTarget = shouldRevealSubmit
          ? scrollContainer.querySelector(".auth-login-submit")
          : active;
        const revealRect = revealTarget?.getBoundingClientRect() ?? activeRect;
        const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
        let delta = 0;

        if (revealRect.bottom > visibleBottom) {
          delta = revealRect.bottom - visibleBottom;
        } else if (activeRect.top < visibleTop) {
          delta = activeRect.top - visibleTop;
        }

        if (activeRect.top - delta < visibleTop) {
          delta = activeRect.top - visibleTop;
        }

        if (Math.abs(delta) < 1) return;

        const nextScrollTop = Math.min(maxScrollTop, Math.max(0, scrollContainer.scrollTop + delta));

        scrollContainer.scrollTo({ top: nextScrollTop, behavior: "auto" });
      }, 80);
    };

    revealFocusedField();
    document.addEventListener("focusin", revealFocusedField);
    return () => {
      document.removeEventListener("focusin", revealFocusedField);
      window.clearTimeout(revealTimer);
    };
  }, [keyboardOpen, visualViewportHeight]);

  return (
    <div
      className={`${STORE_AUTH_SHELL_CLASS} auth-login-page auth-next-page`}
      data-auth-mode={mode}
      data-keyboard-open={keyboardOpen ? "true" : undefined}
      style={authShellStyle}
    >
      <main className={`${STORE_AUTH_MAIN_CLASS} auth-login-main auth-next-main`}>
        <div className="auth-login-topbar">
          <button
            type="button"
            onClick={handleBack}
            aria-label={t("auth.back")}
            className="auth-login-back-btn"
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </button>

          <section className="auth-login-heading shrink-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-[22px]">
              {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
            </h1>
          </section>
        </div>

        {banners.length > 0 ? (
          <section
            className="auth-login-banner mb-3 overflow-hidden lg:hidden [transition:none]"
          >
            <LoginBannerCarousel banners={banners} paused={formCompact} />
          </section>
        ) : null}

        {showHomeTrustBar ? <HomeTrustBar className="auth-login-trust mb-4 lg:hidden" /> : null}

        <section className="auth-login-mode-tabs mb-4">
          <div className="flex rounded-2xl bg-secondary p-1" role="tablist" aria-label={t("auth.loginOrRegister")}>
            {(["login", "register"] as AuthMode[]).map((m) => (
              <UnifiedButton
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                aria-label={m === "login" ? t("auth.login") : t("auth.register")}
                onClick={() => switchAuthMode(m)}
                className={`relative min-h-10 flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {m === "login" ? t("auth.loginTab") : t("auth.registerTab")}
              </UnifiedButton>
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
          <section className="auth-login-credential-tabs mb-4 flex rounded-2xl bg-secondary p-1" role="tablist" aria-label={t("auth.loginOrRegister")}>
            {(["password", "otp"] as CredentialMode[]).map((c) => (
              <UnifiedButton
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
                {c === "password" ? t("auth.passwordLogin") : t("auth.otpLogin")}
              </UnifiedButton>
            ))}
          </section>
        ) : null}

        {formError ? (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-destructive" role="alert">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        <FormFieldShake shake={shakeKey} className="auth-login-form-wrap space-y-3.5">
          <form
            className="auth-login-form sf-next-form-sheet auth-next-sheet flex flex-col gap-3.5"
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
                placeholder={t("auth.nickname")}
                value={nickname}
                aria-label={t("auth.nickname")}
                aria-invalid={Boolean(fieldErrors.nickname) || undefined}
                aria-describedby={fieldErrors.nickname ? "auth-nickname-error" : undefined}
                onChange={(e) => {
                  setNickname(e.target.value);
                  clearFieldError("nickname");
                }}
                className={cn(INPUT_CLASS, "pl-12 pr-4", fieldErrors.nickname && INPUT_ERROR_CLASS)}
              />
              {fieldErrors.nickname ? <p id="auth-nickname-error" className="sr-only">{fieldErrors.nickname}</p> : null}
            </div>
          )}
          {mode === "register" && (
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={hasLockedInviteCode ? t("auth.inviteCodeLocked") : t("auth.inviteCodeOptional")}
                value={inviteCode}
                aria-label={hasLockedInviteCode ? t("auth.inviteCodeLockedAria") : t("auth.inviteCodeOptionalAria")}
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
            className="auth-login-phone-field"
            autoDetectCountryCode
            variant="joined"
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
                placeholder={t("auth.password")}
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                autoCorrect="off"
                autoCapitalize="none"
                enterKeyHint={mode === "login" ? "go" : "done"}
                aria-label={t("auth.password")}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                className={cn(INPUT_CLASS, "pl-12 pr-14", fieldErrors.password && INPUT_ERROR_CLASS)}
              />
              <UnifiedButton
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? t("auth.hidePassword") : t("auth.showPassword")}
                className="absolute right-2 top-1/2 inline-flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 touch-target"
              >
                {showPwd ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </UnifiedButton>
              {fieldErrors.password ? <p id="auth-password-error" className="sr-only">{fieldErrors.password}</p> : null}
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
                  placeholder={t("auth.otpPlaceholder")}
                  enterKeyHint="go"
                  value={otpCode}
                  maxLength={6}
                  aria-label={t("auth.otpPlaceholder")}
                  aria-invalid={Boolean(fieldErrors.otp) || undefined}
                  aria-describedby={fieldErrors.otp ? "auth-otp-error" : undefined}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    clearFieldError("otp");
                  }}
                  className={cn(INPUT_CLASS, "pl-12 pr-4 tracking-widest", fieldErrors.otp && INPUT_ERROR_CLASS)}
                />
                {fieldErrors.otp ? <p id="auth-otp-error" className="sr-only">{fieldErrors.otp}</p> : null}
              </div>
              <UnifiedButton
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending || otpCooldown > 0 || !authFeaturesReady}
                className="w-full rounded-2xl border border-[color-mix(in_srgb,var(--theme-primary)_40%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] py-3 text-xs font-semibold text-[var(--theme-primary)] disabled:opacity-50"
              >
                {otpCooldown > 0 ? `${otpCooldown}${t("auth.otpCooldownSuffix")}` : otpSending ? t("auth.otpSending") : t("auth.sendOtp")}
              </UnifiedButton>
            </>
          ) : null}

          {mode === "login" && effectiveCredentialMode === "password" && (
            <div className="auth-login-meta-row flex items-center justify-between">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-1 pr-2">
                <input
                  type="checkbox"
                  aria-label={t("auth.rememberAccount")}
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-5 w-5 rounded border-border accent-[var(--theme-primary)]"
                />
                <span className="text-xs text-muted-foreground">{t("auth.rememberAccount")}</span>
              </label>
              <UnifiedButton
                type="button"
                onClick={() => navigate(localizedPath("/forgot"), { state: { from: localizedPath("/login") } })}
                className="inline-flex min-h-9 items-center rounded-full px-2 text-xs font-medium text-theme-price active:opacity-70"
              >
                {t("auth.forgotPassword")}
              </UnifiedButton>
            </div>
          )}

          <UnifiedButton
            type="submit"
            disabled={loading}
            aria-busy={loading || undefined}
            className="auth-login-submit min-h-12 w-full rounded-2xl btn-theme-price px-4 py-3.5 text-sm font-bold text-[var(--theme-price-foreground)] shadow-[0_18px_34px_-26px_var(--theme-price)] transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="flex min-w-0 items-center justify-center gap-2 whitespace-nowrap">
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                />
                {submitLoadingLabel}
              </span>
            ) : submitLabel}
          </UnifiedButton>
          </form>
        </FormFieldShake>

        <LoginAgreementFooter
          mode={mode}
          termsPath={siteInfo.termsPath}
          privacyPath={siteInfo.privacyPolicyPath}
          className="auth-login-agreement-footer--sheet"
        />
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

    </div>
  );
}
