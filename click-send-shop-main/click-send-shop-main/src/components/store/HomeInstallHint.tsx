import { Download, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const DISMISS_KEY = "home_install_hint_dismissed_at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 3;

export default function HomeInstallHint() {
  const navigate = useNavigate();
  const [closed, setClosed] = useState(false);

  const dismissed = useMemo(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_MS;
  }, []);

  if (closed || dismissed) return null;

  return (
    <div className="fixed bottom-[86px] left-1/2 z-toast w-[min(92vw,420px)] -translate-x-1/2 px-2 md:hidden">
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/96 p-3 shadow-[var(--theme-shadow)] backdrop-blur-sm">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
            <Download size={13} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--theme-text)]">可安装到手机桌面</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--theme-text-muted)]">像 App 一样打开，步骤只需 1 分钟。</p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now()));
              setClosed(true);
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--theme-text-muted)]"
          >
            <X size={13} />
          </button>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/install")}
            className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--theme-primary-foreground)]"
          >
            查看安装方式
          </button>
        </div>
      </div>
    </div>
  );
}
