import { useMemo } from "react";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";

function isChineseBrowser() {
  const languages = [navigator.language, ...(navigator.languages || [])]
    .map((item) => String(item || "").toLowerCase())
    .filter(Boolean);
  return languages.some((lang) => lang.startsWith("zh"));
}

export default function LanguageGate() {
  const capabilities = useSiteCapabilities();
  const allowed = useMemo(() => isChineseBrowser(), []);

  if (!capabilities.languageGateEnabled || allowed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h1 className="text-lg font-semibold text-foreground">暂不支持当前浏览器语言</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          当前站点仅面向中文浏览器用户开放。请将浏览器语言切换为中文后刷新页面。
        </p>
      </div>
    </div>
  );
}
