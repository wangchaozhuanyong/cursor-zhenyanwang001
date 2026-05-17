import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { adminLogin } from "@/services/admin/accountService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { FormFieldShake } from "@/modules/micro-interactions";
import { useAdminT } from "@/hooks/useAdminT";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { t } = useAdminT();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleLogin = async () => {
    const normalizedAccount = account.trim();
    if (!normalizedAccount || !password.trim()) {
      setShakeKey((k) => k + 1);
      toast.error(t("login.accountPasswordRequired"));
      return;
    }
    setLoading(true);
    try {
      await adminLogin({ username: normalizedAccount, phone: normalizedAccount, password });
      toast.success(t("login.loginSuccess"));
      navigate("/admin");
    } catch (e) {
      setShakeKey((k) => k + 1);
      toast.error(toastErrorMessage(e, t("login.loginFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="safe-area-pt safe-area-pb flex min-h-[100dvh] items-center justify-center bg-background px-4 py-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-2xl font-bold text-primary-foreground shadow-md">
              A
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{t("login.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <FormFieldShake shake={shakeKey} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.accountLabel")}</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/20">
                <User size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder={t("login.accountPlaceholder")}
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.passwordLabel")}</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/20">
                <Lock size={16} className="text-muted-foreground" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="touch-manipulation mt-2 min-h-[48px] w-full rounded-xl btn-theme-price py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-95 disabled:opacity-50 sm:text-sm"
            >
              {loading ? t("login.submitting") : t("login.submit")}
            </button>
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
