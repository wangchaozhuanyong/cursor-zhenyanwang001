import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSiteCapabilities, useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";
import { isChineseBrowserLanguage } from "@/utils/browserLanguage";

/** 后台路由（含 /admin/login）不受前台中文浏览器限制影响 */
function isLanguageGateExemptPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default function LanguageGate() {
  const location = useLocation();
  const capabilities = useSiteCapabilities();
  const capabilitiesReady = useSiteCapabilitiesReady();
  const allowed = useMemo(() => isChineseBrowserLanguage(), []);

  if (isLanguageGateExemptPath(location.pathname)) return null;

  if (!capabilitiesReady) {
    return (
      <div
        className="fixed inset-0 z-[9998] bg-background"
        aria-busy="true"
        aria-label="正在加载站点配置"
      />
    );
  }

  if (!capabilities.languageGateEnabled || allowed) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-6 text-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-gate-title"
    >
      <div className="max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h1 id="language-gate-title" className="text-lg font-semibold text-foreground">
          暂不支持当前浏览器语言
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          当前站点仅面向中文浏览器用户开放。请将浏览器首选语言设置为中文（简体或繁体）后刷新页面。
        </p>
      </div>
    </div>
  );
}
