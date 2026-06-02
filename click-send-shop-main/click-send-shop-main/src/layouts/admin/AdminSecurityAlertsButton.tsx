import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, Shield } from "lucide-react";
import AnchoredMenu from "@/components/admin/AnchoredMenu";
import { Tx } from "@/components/admin/AdminText";
import { getSecurityAlerts, type SecurityAlertSummary } from "@/api/admin/audit";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { isAdminMfaStepUpPending } from "@/lib/adminMfaStepUp";
import { isAdminAuthenticated } from "@/services/admin/accountService";
import {
  applyAdminTextTranslation,
  localizedAuditSummary,
  zhActionType,
} from "@/utils/auditLogI18n";
import { formatDateTime } from "@/utils/formatDateTime";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const SECURITY_ALERT_VISIBLE_POLL_MS = 60_000;
const SECURITY_ALERT_HIDDEN_POLL_MS = 5 * 60_000;

type AdminSecurityAlertsButtonProps = {
  showNotificationsTab: boolean;
  canViewSecurityAlerts: boolean;
};

export default function AdminSecurityAlertsButton({
  showNotificationsTab,
  canViewSecurityAlerts,
}: AdminSecurityAlertsButtonProps) {
  const adminNavigate = useAdminNavigation();
  const { t, tText } = useAdminT();
  const labelize = useCallback(
    (zh: string) => applyAdminTextTranslation(zh, tText),
    [tText],
  );
  const securityBtnRef = useRef<HTMLButtonElement>(null);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlertSummary | null>(null);
  const [securityAlertsOpen, setSecurityAlertsOpen] = useState(false);
  const securityAlertCount = securityAlerts?.total ?? 0;

  useEffect(() => {
    if (!isAdminAuthenticated() || !canViewSecurityAlerts) {
      setSecurityAlerts(null);
      return;
    }

    let alive = true;
    const load = async () => {
      if (isAdminMfaStepUpPending()) return;
      try {
        const data = await getSecurityAlerts({ limit: 5, sinceHours: 24 });
        if (alive) setSecurityAlerts(data);
      } catch {
        if (alive) setSecurityAlerts(null);
      }
    };

    let timer: ReturnType<typeof window.setTimeout> | null = null;
    const schedule = () => {
      if (!alive) return;
      if (timer) window.clearTimeout(timer);
      const delay = document.hidden ? SECURITY_ALERT_HIDDEN_POLL_MS : SECURITY_ALERT_VISIBLE_POLL_MS;
      timer = window.setTimeout(() => {
        void load().finally(() => {
          if (alive) schedule();
        });
      }, delay);
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) void load();
      schedule();
    };

    void load();
    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canViewSecurityAlerts]);

  if (!showNotificationsTab && !canViewSecurityAlerts) return null;

  return (
    <div className="relative shrink-0">
      <UnifiedButton
        ref={securityBtnRef}
        type="button"
        aria-label={canViewSecurityAlerts ? "安全告警" : t("layout.notifications")}
        title={canViewSecurityAlerts ? "安全告警" : "通知中心"}
        className="touch-manipulation relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
        onClick={() => {
          if (canViewSecurityAlerts) {
            setSecurityAlertsOpen((v) => !v);
            return;
          }
          void adminNavigate("/admin/notifications");
        }}
      >
        <Bell size={18} />
        {securityAlertCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
            {securityAlertCount > 99 ? "99+" : securityAlertCount}
          </span>
        ) : showNotificationsTab ? (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        ) : null}
      </UnifiedButton>
      <AnchoredMenu
        open={securityAlertsOpen && canViewSecurityAlerts}
        onClose={() => setSecurityAlertsOpen(false)}
        anchorRef={securityBtnRef}
        width={352}
        gap={6}
        placement="bottom-end"
        className="p-2"
      >
        <motion.div className="w-[min(92vw,22rem)]">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Shield size={16} className="shrink-0 text-destructive" />
              <p className="truncate text-sm font-semibold text-foreground"><Tx>安全监控</Tx></p>
            </div>
            <UnifiedButton
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => {
                setSecurityAlertsOpen(false);
                void adminNavigate("/admin/audit-logs?keyword=security");
              }}
            >
              <Tx>审计日志</Tx>
            </UnifiedButton>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {securityAlerts?.list?.length ? (
              securityAlerts.list.map((item) => (
                <UnifiedButton
                  key={item.id}
                  type="button"
                  className="flex w-full gap-2 rounded-lg px-2 py-2 text-left hover:bg-secondary"
                  onClick={() => {
                    setSecurityAlertsOpen(false);
                    void adminNavigate(`/admin/audit-logs?actionType=${encodeURIComponent(item.action_type)}`);
                  }}
                >
                  <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${item.result === "failure" ? "text-destructive" : "text-[var(--theme-primary)]"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {item.summary
                        ? localizedAuditSummary(item.summary, tText)
                        : labelize(zhActionType(item.action_type))}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.ip || "-"} · {formatDateTime(item.created_at)}</span>
                  </span>
                </UnifiedButton>
              ))
            ) : (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground"><Tx>近 24 小时暂无安全告警</Tx></div>
            )}
          </div>
          {showNotificationsTab ? (
            <UnifiedButton
              type="button"
              className="mt-1 flex min-h-[40px] w-full items-center justify-center rounded-lg border border-border text-sm text-foreground hover:bg-secondary"
              onClick={() => {
                setSecurityAlertsOpen(false);
                void adminNavigate("/admin/notifications");
              }}
            >
              打开通知中心
            </UnifiedButton>
          ) : null}
        </motion.div>
      </AnchoredMenu>
    </div>
  );
}
