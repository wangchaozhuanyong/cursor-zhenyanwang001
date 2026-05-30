import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { tryRefreshAdminSession } from "@/api/request";
import { adminLogout, isAdminAuthenticated } from "@/services/admin/accountService";
import { ApiError } from "@/types/common";

const REFRESH_THROTTLE_MS = 5 * 60_000;
const ADMIN_SESSION_EXPIRED_EVENT = "admin:session-expired";

/**
 * 管理端会话兜底同步：长时间闲置/系统休眠后恢复时，避免出现“本地标记仍在但 Cookie 会话已失效”的假登录态。
 */
export default function AdminSessionSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastRunAtRef = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const run = async () => {
      if (!isAdminAuthenticated()) return;
      if (location.pathname.startsWith("/admin/login")) return;
      const now = Date.now();
      if (now - lastRunAtRef.current < REFRESH_THROTTLE_MS) return;
      lastRunAtRef.current = now;

      try {
        await tryRefreshAdminSession();
      } catch (err) {
        if (err instanceof ApiError && (err.code === 401 || err.code === 403)) {
          await adminLogout();
          navigate("/admin/login", { replace: true });
        }
      }
    };

    void run();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const onExpired = () => {
      if (!location.pathname.startsWith("/admin/login")) {
        navigate("/admin/login", { replace: true });
      }
    };
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, onExpired);
    };
  }, [navigate, location.pathname]);

  return null;
}
