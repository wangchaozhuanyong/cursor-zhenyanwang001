import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/utils/errorMessage";
import { getApiErrorCode, isAbortError } from "@/utils/asyncErrors";

export type UseAsyncResourceOptions<T> = {
  /** 为 false 时不发起请求 */
  enabled?: boolean;
  /** 依赖变化时先清空 data/error（详情页切 id 时建议 true） */
  resetOnChange?: boolean;
  /** 失败时 toast；默认 false，由页面决定展示方式 */
  toast?: (message: string) => void;
  toastFallback?: string;
  /** 这些 HTTP 业务码不 toast（仍写入 error 供页面展示） */
  suppressToastCodes?: number[];
  onSuccess?: (data: T) => void;
};

/**
 * 带请求代数 + AbortController 的数据加载。
 * 解决：切换路由/筛选后旧请求晚到 → 误 toast「xxx不存在」、错显上一条数据。
 */
export function useAsyncResource<T>(
  deps: readonly unknown[],
  loader: (signal: AbortSignal) => Promise<T>,
  options: UseAsyncResourceOptions<T> = {},
) {
  const {
    enabled = true,
    resetOnChange = true,
    toast,
    toastFallback = "加载失败",
    suppressToastCodes = [],
    onSuccess,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const [reloadSeq, setReloadSeq] = useState(0);
  const reload = useCallback(() => setReloadSeq((s) => s + 1), []);
  const toastRef = useRef(toast);
  const onSuccessRef = useRef(onSuccess);
  toastRef.current = toast;
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const generation = ++generationRef.current;
    const controller = new AbortController();

    if (resetOnChange) {
      setData(null);
      setError(null);
    }
    setLoading(true);

    void loader(controller.signal)
      .then((result) => {
        if (generation !== generationRef.current) return;
        setData(result);
        setError(null);
        onSuccessRef.current?.(result);
      })
      .catch((err) => {
        if (generation !== generationRef.current) return;
        if (isAbortError(err)) return;

        const message = getErrorMessage(err, toastFallback);
        setError(message);

        const code = getApiErrorCode(err);
        const notify = toastRef.current;
        if (notify && (code === null || !suppressToastCodes.includes(code))) {
          notify(message);
        }
      })
      .finally(() => {
        if (generation !== generationRef.current) return;
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方显式传入
  }, [enabled, resetOnChange, toastFallback, reloadSeq, ...deps]);

  return { data, loading, error, setData, reload };
}
