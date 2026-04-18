import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { adminLogin } from "@/services/admin/accountService";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!account.trim() || !password.trim()) {
      toast.error("请输入账号和密码");
      return;
    }
    setLoading(true);
    try {
      await adminLogin({ username: account, password });
      toast.success("登录成功");
      navigate("/admin");
    } catch {
      toast.error("登录失败，请检查账号密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="safe-area-pt safe-area-pb flex min-h-[100dvh] items-center justify-center bg-background px-4 py-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          {/* Logo & Title */}
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-2xl font-bold text-primary-foreground shadow-md">
              A
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">管理后台</h1>
            <p className="mt-1 text-sm text-muted-foreground">请使用管理员账号登录</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Account */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">管理员账号</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/20">
                <User size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="输入账号"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">密码</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/20">
                <Lock size={16} className="text-muted-foreground" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="touch-manipulation mt-2 min-h-[48px] w-full rounded-xl bg-gold py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-95 disabled:opacity-50 sm:text-sm"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-foreground">
              ← 返回前台
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
