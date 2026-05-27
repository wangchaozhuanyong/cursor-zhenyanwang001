import { useEffect, useState } from "react";
import { ShieldCheck, Smartphone, LogOut } from "lucide-react";
import { toast } from "sonner";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import SettingsSecuritySection from "@/modules/public/pages/user/SettingsSecuritySection";
import * as authService from "@/services/authService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGoBack } from "@/hooks/useGoBack";

type SecuritySession = Awaited<ReturnType<typeof authService.listSecuritySessions>>[number];

const CARD = "rounded-2xl bg-[var(--theme-surface)] px-[var(--store-card-x)] py-[var(--store-card-y)] shadow-[var(--theme-shadow)] sm:p-4";

function formatTime(value?: string | null) {
  if (!value) return "未知";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知" : date.toLocaleString();
}

export default function AccountSecurity() {
  const goBack = useGoBack();
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      setSessions(await authService.listSecuritySessions());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载登录设备失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const revokeSession = async (id: string) => {
    try {
      await authService.revokeSecuritySession(id);
      toast.success("设备会话已退出");
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出设备失败");
    }
  };

  const logoutAll = async () => {
    try {
      await authService.logoutAll();
      useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
      toast.success("已退出所有设备");
      window.location.href = "/login";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出所有设备失败");
    }
  };

  return (
    <StoreAccountLayout title="账号安全" onBack={goBack} className="store-page text-[var(--theme-text)]" mainClassName="space-y-3 pb-24 sm:py-4 lg:pb-12">
      <section className={CARD}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_12%,transparent)] text-[var(--theme-primary)]">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">账号保护状态</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
              系统会根据登录失败、设备、IP 和请求频率自动拦截撞库、密码喷洒和批量尝试。
            </p>
          </div>
        </div>
      </section>

      <SettingsSecuritySection />

      <section className={CARD}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">登录设备管理</h2>
            <p className="mt-1 text-xs text-[var(--theme-muted)]">发现陌生设备时，请立即退出该会话并修改密码。</p>
          </div>
          <button type="button" onClick={logoutAll} className="rounded-full bg-[var(--theme-primary)] px-3 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]">
            退出所有设备
          </button>
        </div>

        {loading ? <p className="text-sm text-[var(--theme-muted)]">加载中...</p> : null}
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-2xl border border-[var(--theme-border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)] text-[var(--theme-primary)]">
                    <Smartphone size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.deviceName || "未知设备"}</p>
                    <p className="mt-1 text-xs text-[var(--theme-muted)]">IP：{session.ip || "未知"}</p>
                    <p className="mt-1 text-xs text-[var(--theme-muted)]">最近活跃：{formatTime(session.lastSeenAt)}</p>
                    {session.revokedAt ? <p className="mt-1 text-xs text-[var(--theme-danger)]">已退出</p> : null}
                  </div>
                </div>
                {!session.revokedAt ? (
                  <button type="button" onClick={() => revokeSession(session.id)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs">
                    <LogOut size={13} />
                    退出
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {!loading && sessions.length === 0 ? <p className="text-sm text-[var(--theme-muted)]">暂无登录设备记录</p> : null}
        </div>
      </section>
    </StoreAccountLayout>
  );
}
