import { useState, useEffect } from "react";
import { Eye, EyeOff, Phone, Lock, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import LoginBannerCarousel from "@/components/LoginBannerCarousel";
import WeChatIcon from "@/components/icons/WeChatIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import logoWebp from "@/assets/logo.webp";
import { ApiError } from "@/types/common";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { renderBrandTitle } from "@/utils/brand";
import { useHomeBanners } from "@/hooks/useHomeBanners";

const REMEMBER_KEY = "login_remembered_phone";
const REMEMBER_COUNTRY_CODE_KEY = "login_remembered_country_code";
const COUNTRY_CODE_OPTIONS = [
  { value: "+60", label: "🇲🇾 +60" },
  { value: "+86", label: "🇨🇳 +86" },
  { value: "+65", label: "🇸🇬 +65" },
  { value: "+1", label: "🇺🇸 +1" },
];

type AuthMode = "login" | "register";

export default function Login() {
  useDocumentTitle("登录");
  const navigate = useNavigate();
  const location = useLocation();
  const authStore = useAuthStore();
  const { banners } = useHomeBanners({ fetchRemote: false });
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
  const [countryCode, setCountryCode] = useState("+60");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setPhone(saved);
      setRemember(true);
    }
    const savedCc = localStorage.getItem(REMEMBER_COUNTRY_CODE_KEY);
    if (savedCc) setCountryCode(savedCc);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromShare = params.get("ref") || params.get("inviteCode") || "";
    const normalized = fromShare.trim().toUpperCase();
    if (!normalized) return;
    setMode("register");
    setInviteCode(normalized);
  }, [location.search]);

  const loading = authStore.loading;

  const handleSubmit = async () => {
    if (!phone || !password) {
      toast.error("请填写手机号和密码");
      return;
    }
    if (!countryCode) {
      toast.error("请选择国家代码");
      return;
    }
    if (mode === "register" && !nickname) {
      toast.error("请填写昵称");
      return;
    }
    try {
      if (mode === "login") {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, phone);
          localStorage.setItem(REMEMBER_COUNTRY_CODE_KEY, countryCode);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
          localStorage.removeItem(REMEMBER_COUNTRY_CODE_KEY);
        }
        await authStore.login({ phone, countryCode, password });
      } else {
        await authStore.register({
          phone,
          countryCode,
          password,
          nickname,
          inviteCode: inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined,
        });
      }
      toast.success(mode === "login" ? "登录成功" : "注册成功", {
        duration: 900,
        position: "top-center",
      });
      navigate(from, { replace: true });
    } catch (e) {
      const fallback = useAuthStore.getState().error;
      let msg =
        e instanceof Error ? e.message : (fallback ?? (mode === "login" ? "登录失败" : "注册失败"));
      /* 仅当服务端未返回具体说明时才用泛化文案，避免本地排障时看不到真实 500 原因（如数据库未连上） */
      if (e instanceof ApiError && e.code === 500) {
        const vague =
          msg === "请求失败 (500)" || msg === "服务器内部错误" || msg.trim() === "";
        if (vague) msg = "服务暂时不可用，请稍后再试";
      }
      toast.error(msg);
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
                onClick={() => setMode(m)}
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

        {/* ══════════════ Form ══════════════ */}
        <div className="space-y-3.5">
          {mode === "register" && (
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
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground touch-target"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {mode === "login" && (
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
                onClick={() =>
                  toast.info(`请联系客服重置密码：${supportContact}`)
                }
                className="text-xs text-gold font-medium active:opacity-70"
              >
                忘记密码？
              </button>
            </div>
          )}

          <button
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

        {/* ══════════════ Social Login（未对接 OAuth，仅展示）══════════════ */}
        <div className="mb-8">
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center gap-2 opacity-50">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="微信快捷登录即将支持"
                className="flex h-14 w-14 cursor-not-allowed items-center justify-center rounded-2xl border border-border bg-card"
              >
                <WeChatIcon size={28} />
              </button>
              <span className="text-[11px] text-muted-foreground">微信</span>
            </div>

            <div className="flex flex-col items-center gap-2 opacity-50">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="WhatsApp 快捷登录即将支持"
                className="flex h-14 w-14 cursor-not-allowed items-center justify-center rounded-2xl border border-border bg-card"
              >
                <WhatsAppIcon size={28} />
              </button>
              <span className="text-[11px] text-muted-foreground">WhatsApp</span>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            第三方快捷登录即将开放，请暂时使用手机号登录
          </p>
        </div>

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
