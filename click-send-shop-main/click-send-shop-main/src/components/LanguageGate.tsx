import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSiteCapabilities, useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";
import { isChineseBrowserLanguage } from "@/utils/browserLanguage";
import { getPublicLocaleFromPathname } from "@/i18n/publicLocale";
import {
  BLOCKING_ACCESS_GATE_PRIORITY,
  BlockingAccessDialog,
  BlockingAccessDialogDescription,
  BlockingAccessDialogTitle,
} from "@/components/compliance/BlockingAccessDialog";
import { Languages } from "lucide-react";
import "@/styles/fixed-storefront-overlays.css";

/** 后台路由（含 /admin/login）不受前台中文浏览器限制影响 */
function isLanguageGateExemptPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default function LanguageGate() {
  const location = useLocation();
  const capabilities = useSiteCapabilities();
  const capabilitiesReady = useSiteCapabilitiesReady();
  const allowed = useMemo(() => isChineseBrowserLanguage(), []);
  const pathLocale = getPublicLocaleFromPathname(location.pathname);

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

  if (!capabilities.languageGateEnabled || allowed || pathLocale) return null;

  return (
    <BlockingAccessDialog
      gateId="language"
      priority={BLOCKING_ACCESS_GATE_PRIORITY.language}
    >
      <span className="sf-fixed-access-gate__icon" aria-hidden>
        <Languages size={22} />
      </span>
      <div className="sf-fixed-access-gate__copy">
        <p className="sf-fixed-access-gate__eyebrow">语言设置</p>
        <BlockingAccessDialogTitle>暂不支持当前浏览器语言</BlockingAccessDialogTitle>
        <BlockingAccessDialogDescription>
          当前站点仅面向中文浏览器用户开放。请将浏览器首选语言设置为中文（简体或繁体）后刷新页面。
        </BlockingAccessDialogDescription>
      </div>
    </BlockingAccessDialog>
  );
}
