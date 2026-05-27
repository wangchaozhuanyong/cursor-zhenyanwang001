import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { tryRefreshAdminSession } from "@/api/request";
import { adminLogout, isAdminAuthenticated } from "@/services/admin/accountService";

const REFRESH_THROTTLE_MS = 2_000;

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
      } catch {
        await adminLogout();
        navigate("/admin/login", { replace: true });
      }
    };

    void run();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [navigate, location.pathname]);

  return null;
}

