import { useState, useEffect } from "react";
import { Eye, EyeOff, Phone, Lock, User, KeyRound } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import * as authService from "@/services/authService";
import { toast } from "sonner";
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
import { getPublicApiRoot } from "@/utils/apiRoot";

const REMEMBER_KEY = "login_remembered_phone";
const REMEMBER_COUNTRY_CODE_KEY = "login_remembered_country_code";
const COUNTRY_CODE_OPTIONS = [
  { value: "+60", label: "🇲🇾 +60" },
  { value: "+86", label: "🇨🇳 +86" },
];

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
  const siteName = siteInfo.siteName || "大马通";
  const slogan = siteInfo.siteSlogan || "Premium Lifestyle";
  const supportContact =
    siteInfo.contactWhatsApp || siteInfo.contactPhone || "客服";
  const rawFrom = (location.state as { from?: string } | null)?.from;
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
  const [inviteCode, setInviteCode] = useState(getLockedInviteCode());
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
  const hasLockedInviteCode = !!inviteCode;

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
    const params = new URLSearchParams(location.search);
    const oauthErr = params.get("oauthError");
    const oauthCode = params.get("oauthCode");
    const oauthProvider = params.get("oauthProvider");
    if (oauthErr) {
      toast.error(decodeURIComponent(oauthErr.replace(/\+/g, " ")));
      navigate("/login", { replace: true });
      return;
    }
    if (!oauthCode || (oauthProvider !== "google" && oauthProvider !== "facebook")) return;

    let cancelled = false;
    (async () => {
      try {
        await useAuthStore.getState().completeOAuthLogin({
          code: oauthCode,
          provider: oauthProvider,
        });
        if (cancelled) return;
        toast.success("登录成功", { duration: 900, position: "top-center" });
        navigate(from, { replace: true });
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
  }, [location.search, navigate, from]);

  const loading = authStore.loading;

  const openOAuth = (provider: "google" | "facebook") => {
    const root = getPublicApiRoot();
    const redirect = encodeURIComponent("/login");
    window.location.href = `${root}/auth/oauth/${provider}/start?redirect=${redirect}`;
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error("请填写手机号");
      return;
    }
    if (!countryCode || (countryCode !== "+60" && countryCode !== "+86")) {
      toast.error("请选择国家代码");
      return;
    }
    if (otpCooldown > 0 || otpSending) return;
    setOtpSending(true);
    try {
      const data = await authService.sendOtp({ phone, countryCode });
      if (data?.devOtp) {
        toast.message(`开发环境验证码：${data.devOtp}`, { duration: 12_000 });
      }
      toast.success("验证码已发送", { position: "top-center" });
      setOtpCooldown(60);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败");
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async () => {
    if (!phone) {
      toast.error(mode === "login" && credentialMode === "otp" ? "请填写手机号" : "请填写手机号和密码");
      return;
    }
    if (mode === "login" && credentialMode === "otp") {
      if (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim())) {
        toast.error("请填写 6 位验证码");
        return;
      }
    } else if (!password) {
      toast.error("请填写密码");
      return;
    }
    if (!countryCode) {
      toast.error("请选择国家代码");
      return;
    }
    if (countryCode !== "+60" && countryCode !== "+86") {
      toast.error("仅支持 +60 或 +86 手机号");
      return;
    }
    if (mode === "register" && !hasLockedInviteCode && !nickname.trim()) {
      toast.error("请填写昵称");
      return;
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
      navigate(from, { replace: true });
    } catch (e) {
      const fallback = useAuthStore.getState().error;
      let msg =
        e instanceof Error
          ? e.message
          : (fallback ?? (mode === "login" ? "登录失败" : "注册失败"));
      /* 仅当服务端未返回具体说明时才用泛化文案，避免本地排障时看不到真实 500 原因（如数据库未连上） */
      if (e instanceof ApiError && e.code === 500) {
        const vague =
          msg === "请求失败 (500)" || msg === "服务器内部错误" || msg.trim() === "";
        if (vague) msg = "服务暂时不可用，请稍后再试";
      }
      toast.error(msg);
    }
  };

  const handleRequestReset = async () => {
    if (!phone.trim()) {
      toast.error("请先填写手机号");
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
      toast.success(data?.resetToken ? "重置令牌已生成" : "如账号存在，重置指引已生成");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "申请重置失败");
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetToken.trim() || !newPassword) {
      toast.error("请填写重置令牌和新密码");
      return;
    }
    setResetLoading(true);
    try {
      await authService.resetPassword({ token: resetToken.trim(), newPassword });
      toast.success("密码已重置，请使用新密码登录");
      setPassword(newPassword);
      setShowReset(false);
      setResetToken("");
      setNewPassword("");
      setDevResetToken("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "重置密码失败");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ══════════════ Top Brand Bar ══════════════ */}
      <header className="flex items-center gap-3 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
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

      {/* ══════════════ Banner Carousel ══════════════ */}
      <div className="px-5 mt-2 animate-in fade-in zoom-in-95 duration-300">
        <LoginBannerCarousel banners={banners} />
      </div>

      {/* ══════════════ Main Content ══════════════ */}
      <main className="flex-1 mx-auto w-full max-w-lg px-5 mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
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

        {mode === "login" && (
          <div className="mb-4 flex rounded-2xl bg-secondary p-1">
            {(["password", "otp"] as CredentialMode[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCredentialMode(c)}
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
        <div className="space-y-3.5">
          {mode === "register" && !hasLockedInviteCode && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="昵称"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all"
                />
              </div>
            </div>
          )}
          {mode === "register" && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="邀请码（选填）"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-[112px_1fr] gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="rounded-2xl border border-border bg-card px-3 py-3.5 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
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
                inputMode="numeric"
                placeholder="手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s\-()]/g, ""))}
                className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all"
              />
            </div>
          </div>

          {(mode === "register" || (mode === "login" && credentialMode === "password")) && (
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPwd ? "text" : "password"}
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all"
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

          {mode === "login" && credentialMode === "otp" && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6 位验证码"
                  value={otpCode}
                  maxLength={6}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all tracking-widest"
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending || otpCooldown > 0}
                className="w-full rounded-2xl border border-gold/40 bg-gold/10 py-3 text-xs font-semibold text-gold disabled:opacity-50"
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
                className="text-xs text-gold font-medium active:opacity-70"
              >
                忘记密码？
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-gold py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.98] disabled:opacity-60"
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
        </div>

        {/* ══════════════ Divider ══════════════ */}
        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">其他登录方式</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ══════════════ OAuth ══════════════ */}
        <div className="mb-8">
          <div className="flex justify-center gap-6">
            <button
              type="button"
              onClick={() => openOAuth("google")}
              className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-card py-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl" aria-hidden>
                G
              </span>
              <span className="text-[11px] font-medium text-foreground">Google</span>
            </button>
            <button
              type="button"
              onClick={() => openOAuth("facebook")}
              className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-card py-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl font-bold text-[#1877F2]" aria-hidden>
                f
              </span>
              <span className="text-[11px] font-medium text-foreground">Facebook</span>
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground leading-relaxed">
            跳转第三方完成授权；请在服务器配置 OAuth 客户端与回调地址（见 .env.example）
          </p>
        </div>

        {showReset && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
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
              className="w-full rounded-xl border border-gold/30 bg-gold/10 py-2.5 text-xs font-semibold text-gold disabled:opacity-60"
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
                className="w-full rounded-xl bg-gold py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                确认重置密码
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              没收到令牌？请联系客服：{supportContact}
            </p>
          </div>
        )}

        {/* ══════════════ Agreement ══════════════ */}
        <p className="text-center text-[11px] text-muted-foreground pb-8 pb-safe leading-relaxed">
          登录即代表您同意
          <button onClick={() => navigate("/about")} className="text-gold mx-0.5">《用户协议》</button>
          和
          <button onClick={() => navigate("/help")} className="text-gold mx-0.5">《隐私政策》</button>
        </p>
      </main>
    </div>
  );
}
