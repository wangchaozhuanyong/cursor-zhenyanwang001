import { useState, useEffect, useRef, type CSSProperties } from "react";
import { Eye, EyeOff, Phone, Lock, User, KeyRound } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import * as authService from "@/services/authService";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import LoginBannerCarousel from "@/components/LoginBannerCarousel";
import logoWebp from "@/assets/logo.webp";
import { ApiError } from "@/types/common";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { renderBrandTitle } from "@/utils/brand";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import {
  clearLockedInviteCode,
  getLockedInviteCode,
  syncLockedInviteCodeBySearch,
} from "@/utils/inviteReferral";
import { THIRD_PARTY_LOGIN_ENABLED } from "@/constants/authLogin";
import { cn } from "@/lib/utils";
import { FormFieldShake } from "@/modules/micro-interactions";
import { authErrorMessage, validatePhoneForCountry, validateStrongPassword } from "@/utils/authValidation";

const REMEMBER_KEY = "login_remembered_phone";
/** text-base(16px) 避免 iOS 聚焦时自动缩放视口导致整页闪动 */
const INPUT_CLASS =
  "w-full rounded-2xl border border-border bg-card py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-[border-color,box-shadow]";
const REMEMBER_COUNTRY_CODE_KEY = "login_remembered_country_code";
const COUNTRY_CODE_OPTIONS = [
  { value: "+60", label: "🇲🇾 +60" },
  { value: "+86", label: "🇨🇳 +86" },
];
const KEYBOARD_INSET_THRESHOLD = 24;

type AuthMode = "login" | "register";
type CredentialMode = "password" | "otp";

export default function Login() {
  useDocumentTitle("登录");
  const navigate = useNavigate();
  const location = useLocation();
  const authStore = useAuthStore();
  const { banners } = useHomeBanners();
  const siteInfo = useSiteInfo();
  const logoSrc = siteInfo.logoUrl || logoWebp;
  const siteName = siteInfo.siteName || "官方商城";
  const slogan = siteInfo.siteSlogan || "Premium Lifestyle";
  const supportContact =
    siteInfo.contactWhatsApp || siteInfo.contactPhone || "客服";
  const loginState = location.state as { from?: string; fromState?: unknown } | null;
  const rawFrom = loginState?.from;
  const fromState = loginState?.fromState;
  const from =
    rawFrom && rawFrom !== "/login" && !rawFrom.startsWith("/admin")
      ? rawFrom
      : "/";
  const [mode, setMode] = useState<AuthMode>("login");
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
  const [smsOtpLoginEnabled, setSmsOtpLoginEnabled] = useState(true);
  const mainRef = useRef<HTMLElement | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const hasLockedInviteCode = !!lockedInviteCode;
  const [shakeKey, setShakeKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; password?: string; otp?: string; nickname?: string }>({});
  const failValidation = (message: string, field?: keyof typeof fieldErrors) => {
    setShakeKey((k) => k + 1);
    if (field) {
      setFieldErrors((prev) => ({ ...prev, [field]: message }));
      return;
    }
    toast.error(message);
  };

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
    const normalized = syncLockedInviteCodeBySearch(location.search);
    if (!normalized) return;
    setMode("register");
    setLockedInviteCode(normalized);
    setInviteCode(normalized);
  }, [location.search]);

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
        setSmsOtpLoginEnabled(enabled);
        if (!enabled) setCredentialMode("password");
      })
      .catch(() => {
        if (!cancelled) setSmsOtpLoginEnabled(true);
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
          const { useCartStore } = await import("@/stores/useCartStore");
          const { useFavoritesStore } = await import("@/stores/useFavoritesStore");
          const { useHistoryStore } = await import("@/stores/useHistoryStore");
          const localCartSnapshot = [...useCartStore.getState().items];
          const localFavoriteIds = [...useFavoritesStore.getState().favoriteIds];
          const localFavoriteProducts = [...useFavoritesStore.getState().favoriteProducts];
          const localHistorySnapshot = [...useHistoryStore.getState().history];
          useAuthStore.setState({ isAuthenticated: true });
          await useCartStore.getState().mergeLocalThenSync(localCartSnapshot);
          await useFavoritesStore.getState().mergeLocalThenSync(localFavoriteIds, localFavoriteProducts);
          await useHistoryStore.getState().mergeLocalThenSync(localHistorySnapshot).catch(() => {});
          await useUserStore.getState().loadProfile();
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

  useEffect(() => {
    const isKeyboardField = (el: Element | null) => {
      if (el instanceof HTMLTextAreaElement) return true;
      if (!(el instanceof HTMLInputElement)) return false;
      return !["checkbox", "radio", "button", "submit", "reset", "file", "hidden", "image"].includes(
        (el.type || "text").toLowerCase(),
      );
    };

    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardInset(0);
        return;
      }

      const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      setKeyboardInset(inset > KEYBOARD_INSET_THRESHOLD ? inset : 0);
    };

    const scrollFocusedFieldIntoView = () => {
      const active = document.activeElement;
      if (!isKeyboardField(active) || !mainRef.current?.contains(active)) return;

      window.setTimeout(() => {
        active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }, 80);
    };

    const handleViewportChange = () => {
      updateKeyboardInset();
      scrollFocusedFieldIntoView();
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isKeyboardField(event.target as Element | null)) return;
      updateKeyboardInset();
      scrollFocusedFieldIntoView();
    };

    document.addEventListener("focusin", handleFocusIn);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    updateKeyboardInset();

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  const loading = authStore.loading;

  const handleSendOtp = async () => {
    if (!smsOtpLoginEnabled) {
      failValidation("当前未开启短信验证码登录");
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
    const phoneError = validatePhoneForCountry(phone, countryCode);
    if (phoneError) {
      failValidation(phoneError, "phone");
      return;
    }

    if (mode === "login" && credentialMode === "otp") {
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
      if (!hasLockedInviteCode && !nickname.trim()) {
        failValidation("请输入昵称", "nickname");
        return;
      }
      const passwordError = validateStrongPassword(password);
      if (passwordError) {
        failValidation(passwordError, "password");
        return;
      }
    }

    try {
      if (mode === "login") {
        if (credentialMode === "password") {
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
      failValidation(phoneError);
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
      failValidation("请输入重置口令");
      return;
    }
    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      failValidation(passwordError);
      return;
    }
    setResetLoading(true);
    try {
      await authService.resetPassword({ token: resetToken.trim(), newPassword });
      toast.success("密码已重置，请使用新密码登录", toastPresetQuickSuccess);
      setPassword(newPassword);
      setShowReset(false);
      setResetToken("");
      setNewPassword("");
      setDevResetToken("");
    } catch (e) {
      toast.error(authErrorMessage(e, "重置失败"));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-page-shell flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background">
      {/* ══════════════ Top Brand Bar ══════════════ */}
      <header className="relative z-20 flex shrink-0 items-center gap-3 border-b border-transparent bg-background/95 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] backdrop-blur">
        <img src={logoSrc} alt={siteName} width={44} height={44} className="rounded-xl object-contain" loading="eager" decoding="async" />
        <div className="flex flex-col">
          <h1 className="font-display text-xl font-bold tracking-tight leading-tight text-foreground">
            {renderBrandTitle(siteName)}
          </h1>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">
            {slogan}
          </p>
        </div>
      </header>

      {/* 表单聚焦时只暂停轮播，避免输入时顶部内容突然消失造成页面跳动。 */}
      {/* ══════════════ Main Content ══════════════ */}
      <main
        ref={mainRef}
        style={
          {
            paddingBottom: `calc(max(env(safe-area-inset-bottom), 0.5rem) + ${keyboardInset}px)`,
            scrollPaddingBottom: `calc(2rem + ${keyboardInset}px)`,
          } satisfies CSSProperties
        }
        className={cn(
          "mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto overscroll-contain px-[var(--store-page-x)] pt-3",
        )}
      >
        {banners.length > 0 ? (
          <div className="mb-5">
            <LoginBannerCarousel banners={banners} />
          </div>
        ) : null}

        {/* Welcome text */}
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "登录您的账号，畅享品质购物" : "注册新账号，开启品质购物之旅"}
          </p>
        </div>

        {/* ══════════════ Auth Tabs ══════════════ */}
        <div className="mb-5">
          <div className="flex rounded-2xl bg-secondary p-1">
            {(["login", "register"] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setShowReset(false);
                  if (m === "register") setCredentialMode("password");
                }}
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
        </div>

        {mode === "login" && smsOtpLoginEnabled && (
          <div className="mb-4 flex rounded-2xl bg-secondary p-1">
            {(["password", "otp"] as CredentialMode[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCredentialMode(c);
                  setShowReset(false);
                }}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                  credentialMode === c
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {c === "password" ? "密码登录" : "验证码登录"}
              </button>
            ))}
          </div>
        )}

        {/* ══════════════ Form ══════════════ */}
        <FormFieldShake shake={shakeKey} className="space-y-3.5">
          {mode === "register" && !hasLockedInviteCode && (
            <div>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="昵称"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (fieldErrors.nickname) setFieldErrors((s) => ({ ...s, nickname: undefined }));
                  }}
                  className={cn(INPUT_CLASS, "pl-12 pr-4")}
                />
              </div>
              {fieldErrors.nickname ? <p className="text-xs text-destructive">{fieldErrors.nickname}</p> : null}
            </div>
          )}
          {mode === "register" && (
            <div>
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
            </div>
          )}

          <div className="grid grid-cols-[minmax(6.5rem,7rem)_1fr] gap-2 sm:grid-cols-[112px_1fr]">
            <select
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                if (fieldErrors.phone) setFieldErrors((s) => ({ ...s, phone: undefined }));
              }}
              aria-label="国家或地区代码"
              className="min-w-0 rounded-2xl border border-border bg-card px-2.5 py-3.5 text-base text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 sm:px-3"
            >
              {COUNTRY_CODE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="relative">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="手机号"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^\d\s\-()]/g, ""));
                  if (fieldErrors.phone) setFieldErrors((s) => ({ ...s, phone: undefined }));
                }}
                className={cn(INPUT_CLASS, "scroll-mt-4 pl-12 pr-4")}
              />
            </div>
          </div>
          {fieldErrors.phone ? <p className="text-xs text-destructive">{fieldErrors.phone}</p> : null}

          {(mode === "register" || (mode === "login" && credentialMode === "password")) && (
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPwd ? "text" : "password"}
                placeholder="密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((s) => ({ ...s, password: undefined }));
                }}
                className={cn(INPUT_CLASS, "pl-12 pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground touch-target"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}
          {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}

          {mode === "login" && credentialMode === "otp" && (
            <div className="space-y-2">
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6 位验证码"
                  value={otpCode}
                  maxLength={6}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (fieldErrors.otp) setFieldErrors((s) => ({ ...s, otp: undefined }));
                  }}
                  className={cn(INPUT_CLASS, "pl-12 pr-4 tracking-widest")}
                />
              </div>
              {fieldErrors.otp ? <p className="text-xs text-destructive">{fieldErrors.otp}</p> : null}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending || otpCooldown > 0}
                className="w-full rounded-2xl border border-gold/40 bg-gold/10 py-3 text-xs font-semibold text-theme-price disabled:opacity-50"
              >
                {otpCooldown > 0 ? `${otpCooldown}s 后可重发` : otpSending ? "发送中…" : "发送验证码"}
              </button>
            </div>
          )}

          {mode === "login" && credentialMode === "password" && (
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
            type="button"
            onClick={handleSubmit}
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
        </FormFieldShake>

        {mode === "login" && showReset && (
          <FormFieldShake shake={shakeKey} className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">重置密码</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  先用当前手机号申请重置令牌，再输入令牌和新密码完成重置。线上环境请根据客服发送的令牌操作。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="text-xs font-medium text-muted-foreground active:opacity-70"
              >
                关闭
              </button>
            </div>

            <button
              type="button"
              onClick={handleRequestReset}
              disabled={resetLoading}
              className="w-full rounded-xl border border-gold/30 bg-gold/10 py-2.5 text-xs font-semibold text-theme-price disabled:opacity-60"
            >
              {resetLoading ? "处理中..." : "发送重置令牌"}
            </button>

            {devResetToken && (
              <p className="mt-2 break-all rounded-xl bg-secondary p-2 text-[11px] leading-relaxed text-muted-foreground">
                开发环境令牌：{devResetToken}
              </p>
            )}

            <div className="mt-3 space-y-2">
              <input
                type="text"
                placeholder="输入重置令牌"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
              <input
                type="password"
                placeholder="新密码（至少 6 位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetLoading}
                className="w-full rounded-xl btn-theme-price py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                确认重置密码
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              没收到令牌？请联系客服：{supportContact}
            </p>
          </FormFieldShake>
        )}

        {/* ══════════════ Agreement ══════════════ */}
        <p className="pb-8 pb-safe pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          {mode === "login" ? "登录" : "注册"}即代表您同意
          <button
            type="button"
            onClick={() => navigate(siteInfo.termsPath || "/content/terms-of-service")}
            className="text-theme-price mx-0.5 hover:underline"
          >
            《用户协议》
          </button>
          和
          <button
            type="button"
            onClick={() => navigate(siteInfo.privacyPolicyPath || "/content/privacy-policy")}
            className="text-theme-price mx-0.5 hover:underline"
          >
            《隐私政策》
          </button>
        </p>
      </main>
    </div>
  );
}
