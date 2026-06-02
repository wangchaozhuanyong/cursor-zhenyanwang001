import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { isChunkLoadFailure, recoverFromChunkLoadError } from "@/lib/browserBoot";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  message: string;
  isChunkLoadError: boolean;
}

/** 捕获子树渲染错误，避免整页白屏 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", isChunkLoadError: false };

  static getDerivedStateFromError(err: Error): State {
    const message = err.message || "未知错误";
    const isChunkLoadError = isChunkLoadFailure(err);
    return { hasError: true, message, isChunkLoadError };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    if (this.state.isChunkLoadError) {
      const appName = window.location.pathname.startsWith("/admin") ? "admin" : "storefront";
      console.warn("[ErrorBoundary] 网站版本文件加载失败，已触发统一版本恢复。");
      recoverFromChunkLoadError(appName, err);
      return;
    }
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: "", isChunkLoadError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      const isAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
      const homeHref = isAdmin ? "/admin" : "/";
      const homeLabel = isAdmin ? "返回后台首页" : "返回首页";
      const message = this.state.isChunkLoadError
        ? "请刷新页面加载最新版本。"
        : "系统遇到临时问题，请刷新页面后再试。";

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))]">
            <AlertTriangle className="h-8 w-8 text-[var(--theme-danger)]" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {this.state.isChunkLoadError ? "网站版本已更新" : "页面出错了"}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground break-words">
              {message}
            </p>
            {!import.meta.env.PROD && !this.state.isChunkLoadError && this.state.message ? (
              <p className="mt-2 max-w-sm break-words rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                {this.state.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <UnifiedButton
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full btn-theme-price px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              <RefreshCw size={16} /> 刷新页面
            </UnifiedButton>
            <a
              href={homeHref}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground"
            >
              <Home size={16} /> {homeLabel}
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
