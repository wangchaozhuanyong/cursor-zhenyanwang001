import { useEffect, useMemo, useState } from "react";
import { Share2, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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

export default function InstallApp() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const ios = useMemo(() => isIosSafari(), []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canOneTapInstall = !!deferredPrompt && !ios && !installed;

  const installNow = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="store-page min-h-screen text-[var(--theme-text)]">
      <PageHeader title="安装应用" backFallback="/" />

      <main className="mx-auto w-full max-w-lg space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] pb-16 sm:px-4 sm:py-4">
        <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
              <Smartphone size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">添加到手机桌面</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">
                安装后可像 App 一样从桌面打开。下单、支付、订单等功能保持不变。
              </p>
            </div>
          </div>
        </section>

        {canOneTapInstall ? (
          <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
            <p className="text-sm font-semibold">一键安装（推荐）</p>
            <p className="mt-1 text-xs text-[var(--theme-text-muted)]">点击按钮后，按系统提示确认即可。</p>
            <button
              type="button"
              onClick={installNow}
              disabled={installing}
              className="mt-3 w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
            >
              {installing ? "安装处理中..." : "立即安装到桌面"}
            </button>
          </section>
        ) : null}

        {ios && !installed ? (
          <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
            <p className="text-sm font-semibold">iPhone（Safari）</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
              <li>点击底部分享按钮 <Share2 size={13} className="mx-0.5 inline-block align-text-bottom" />。</li>
              <li>选择“添加到主屏幕”。</li>
              <li>点击“添加”完成安装。</li>
            </ol>
          </section>
        ) : null}

        {!canOneTapInstall && !ios && !installed ? (
          <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
            <p className="text-sm font-semibold">Android（Chrome）</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
              <li>打开首页并等待几秒。</li>
              <li>浏览器会出现“安装应用”提示。</li>
              <li>点击确认完成安装。</li>
            </ol>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] py-3 text-sm font-semibold text-[var(--theme-text)]"
        >
          返回首页
        </button>
      </main>
    </div>
  );
}
