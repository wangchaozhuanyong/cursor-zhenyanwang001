import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

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
    const isChunkLoadError =
      /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|dynamically imported module/i.test(
        message,
      );
    return { hasError: true, message, isChunkLoadError };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: "", isChunkLoadError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {this.state.isChunkLoadError ? "网站版本已更新" : "页面出错了"}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground break-words">
              {this.state.isChunkLoadError ? "请刷新页面加载最新版本。" : this.state.message}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full btn-theme-price px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              <RefreshCw size={16} /> 刷新页面
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground"
            >
              <Home size={16} /> 返回首页
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
