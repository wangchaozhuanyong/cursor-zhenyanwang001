import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * 智能返回 hook
 *
 *  - 有浏览器历史 → `navigate(-1)`
 *  - 无历史（直接访问、新标签页打开、PWA 独立窗口、被分享链接） → 跳到 `fallback`
 *
 * 默认 fallback：
 *   - `/orders/...`、`/order/...`、`/checkout` → 回到首页
 *   - `/admin/...` → `/admin`
 *   - 其他 → `/`
 *
 * 使用：
 *   const goBack = useGoBack();
 *   <button onClick={goBack}>返回</button>
 *   // 或自定义：const goBack = useGoBack("/profile");
 */
export function useGoBack(fallback?: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    // history.length 在 SPA 内最低为 1，>1 通常表示在站内有可返回的页面
    const hasHistory =
      typeof window !== "undefined" && window.history.length > 1;

    if (hasHistory) {
      navigate(-1);
      return;
    }

    if (fallback) {
      navigate(fallback, { replace: true });
      return;
    }

    const path = location.pathname || "/";
    let target = "/";
    if (path.startsWith("/admin")) target = "/admin";
    else if (path.startsWith("/profile")) target = "/profile";
    else target = "/";

    navigate(target, { replace: true });
  }, [navigate, location.pathname, fallback]);
}
