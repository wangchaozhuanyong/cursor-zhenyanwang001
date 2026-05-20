import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "pwa_install_prompt_dismissed_at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 3;

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIOS && isSafari;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function PwaInstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [closed, setClosed] = useState(false);
  const [installing, setInstalling] = useState(false);

  const isAdmin = location.pathname.startsWith("/admin");
  const shouldHideByDismiss = useMemo(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_MS;
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const onInstalled = () => {
      setDeferredPrompt(null);
      setClosed(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  if (isAdmin || closed || shouldHideByDismiss || isStandalone()) return null;

  const showNativePrompt = !!deferredPrompt;
  const showIosGuide = !showNativePrompt && isIosSafari();
  if (!showNativePrompt && !showIosGuide) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setClosed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
      dismiss();
    }
  };

  return (
    <div className="fixed bottom-20 left-1/2 z-toast w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
      <p className="text-sm font-semibold text-[var(--theme-text)]">安装到桌面</p>
      {showNativePrompt ? (
        <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">可将商城安装到手机桌面，打开体验更接近 App。</p>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">iPhone 用户请点击 Safari 分享按钮，再选择“添加到主屏幕”。</p>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" onClick={dismiss} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]">
          稍后再说
        </button>
        {showNativePrompt ? (
          <button type="button" onClick={install} disabled={installing} className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
            {installing ? "处理中..." : "安装到桌面"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
