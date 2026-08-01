import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import "@/styles/fixed-storefront-overlays.css";
import { isChunkLoadFailure, recoverFromChunkLoadError } from "@/lib/browserBoot";

const ErrorBoundaryFallback = lazy(() => import("@/components/ErrorBoundaryFallback"));

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
      const title = this.state.isChunkLoadError ? "网站版本已更新" : "页面出错了";
      const details = !import.meta.env.PROD && !this.state.isChunkLoadError && this.state.message
        ? this.state.message
        : "";

      return (
        <Suspense
          fallback={(
            <main className="sf-fixed-error-page">
              <section className="sf-fixed-error-state is-loading" aria-live="polite">
                <h1>{title}</h1>
                <p>{message}</p>
              </section>
            </main>
          )}
        >
          <ErrorBoundaryFallback
            title={title}
            message={message}
            details={details}
            homeHref={homeHref}
            homeLabel={homeLabel}
            refreshLabel="刷新页面"
            onReload={() => window.location.reload()}
          />
        </Suspense>
      );
    }
    return this.props.children;
  }
}
