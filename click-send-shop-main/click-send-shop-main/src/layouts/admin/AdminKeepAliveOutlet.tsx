import { useLocation, useOutlet } from "react-router-dom";
import { normalizeAdminTabPath } from "@/config/adminWorkTab";

/**
 * 右侧内容以 React Router 为唯一真相，避免工作标签缓存导致 URL 已切换但页面仍停留在旧内容。
 */
export default function AdminKeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const outletKey = normalizeAdminTabPath(location.pathname, location.search);

  return (
    <div key={outletKey} data-admin-outlet-path={outletKey} className="contents">
      {outlet}
    </div>
  );
}
