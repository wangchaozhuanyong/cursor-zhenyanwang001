import { ArrowLeft, Share2, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIOS && isSafari;
}

export default function InstallApp() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const ios = isIosSafari();

  return (
    <div className="store-page min-h-screen text-[var(--theme-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 px-[var(--store-page-x)] py-3 backdrop-blur-md sm:px-4">
        <div className="mx-auto flex w-full items-center gap-3 sm:max-w-lg">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)] touch-target" aria-label="返回">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold">安装应用</h1>
        </div>
      </header>

      <main className="mx-auto w-full space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] pb-16 sm:max-w-lg sm:px-4 sm:py-4">
        <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
              <Smartphone size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">添加到手机桌面</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">
                安装后可像 App 一样从桌面打开，加载更快。下单、支付、订单等仍需要联网。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <p className="text-sm font-semibold">Android（Chrome）</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
            <li>访问商城首页。</li>
            <li>点击浏览器提示“安装到桌面”或菜单里的“安装应用”。</li>
            <li>确认安装后，可在桌面直接打开。</li>
          </ol>
        </section>

        <section className="rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
          <p className="text-sm font-semibold">iPhone（Safari）</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
            <li>用 Safari 打开商城首页。</li>
            <li>点击底部分享按钮 <Share2 size={13} className="mx-0.5 inline-block align-text-bottom" />。</li>
            <li>选择“添加到主屏幕”。</li>
          </ol>
          {ios ? (
            <p className="mt-2 rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] px-3 py-2 text-xs text-[var(--theme-text)]">
              当前已检测到 iOS Safari，可直接按上面步骤操作。
            </p>
          ) : null}
        </section>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)]"
        >
          返回首页
        </button>
      </main>
    </div>
  );
}
