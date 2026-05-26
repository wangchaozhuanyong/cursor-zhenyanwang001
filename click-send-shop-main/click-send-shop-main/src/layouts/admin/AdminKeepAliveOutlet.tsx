import { useOutlet } from "react-router-dom";

/**
 * 右侧内容以 React Router 为唯一真相，避免工作标签缓存导致 URL 已切换但页面仍停留在旧内容。
 */
export default function AdminKeepAliveOutlet() {
  return useOutlet();
}
