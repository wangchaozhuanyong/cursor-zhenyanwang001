import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, LogIn, RefreshCw, ShoppingBag, MessageCircle } from "lucide-react";
import * as orderService from "@/services/orderService";
import type { Order } from "@/types/order";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { SUPPORT_PAGE_PATH } from "@/utils/supportDownloadConfig";
import { usePublicLocale } from "@/i18n/publicLocale";
import { ApiError } from "@/types/common";

type ResultState = "loading" | "paid" | "pending" | "failed";

const PAYMENT_STATUS_LABEL_KEYS: Record<string, string> = {
  pending: "payment.status.pending",
  paid: "payment.status.paid",
  failed: "payment.status.failed",
  refunded: "payment.status.refunded",
  partially_refunded: "payment.status.partiallyRefunded",
};

function resolveState(order: Order | null, error: string): ResultState {
  if (error) return "failed";
  if (!order) return "loading";
  if (order.payment_status === "paid" || order.status === ORDER_STATUS.PAID || order.status === ORDER_STATUS.SHIPPED || order.status === ORDER_STATUS.COMPLETED) {
    return "paid";
  }
  return "pending";
}

function labelPaymentStatus(status: string | null | undefined, t: (key: string) => string) {
  const key = PAYMENT_STATUS_LABEL_KEYS[String(status || "pending")];
  return key ? t(key) : t("payment.status.unknown");
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { localizedPath, t } = usePublicLocale();
  const orderId = searchParams.get("order_id") || searchParams.get("orderId") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setError(t("payment.missingOrder"));
      setAuthRequired(false);
      return;
    }
    setRefreshing(true);
    try {
      const latest = await orderService.fetchOrderById(orderId, {
        loadingMode: "silent",
        skipGlobalLoading: true,
        skipAuthRetry: true,
        suppressAuthExpired: true,
      });
      setOrder(latest);
      setError("");
      setAuthRequired(false);
    } catch (e) {
      setOrder(null);
      if (e instanceof ApiError && (e.code === 401 || e.code === 403)) {
        setAuthRequired(true);
        setError(t("payment.loginRequiredDescription"));
      } else {
        setAuthRequired(false);
        setError(t("payment.refreshFailed"));
      }
    } finally {
      setRefreshing(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!orderId || order?.payment_status === "paid") return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      void load();
      if (count >= 6) window.clearInterval(timer);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [load, order?.payment_status, orderId]);

  const state = resolveState(order, error);
  const view = useMemo(() => {
    if (state === "paid") {
      return {
        icon: <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden="true" />,
        title: t("payment.paidTitle"),
        description: t("payment.paidDescription"),
      };
    }
    if (state === "pending") {
      return {
        icon: refreshing ? <Loader2 className="h-12 w-12 animate-spin text-amber-500" aria-hidden="true" /> : <RefreshCw className="h-12 w-12 text-amber-500" aria-hidden="true" />,
        title: t("payment.pendingTitle"),
        description: t("payment.pendingDescription"),
      };
    }
    if (state === "failed") {
      return {
        icon: <AlertCircle className="h-12 w-12 text-rose-500" aria-hidden="true" />,
        title: t("payment.failedTitle"),
        description: error || t("payment.failedDescription"),
      };
    }
    return {
      icon: <Loader2 className="h-12 w-12 animate-spin text-[var(--theme-primary)]" aria-hidden="true" />,
      title: t("payment.loadingTitle"),
      description: t("payment.loadingDescription"),
    };
  }, [error, refreshing, state, t]);

  return (
    <main className="store-page-shell store-v12-page store-payment-result-v12-page store-bottom-safe mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
      <section className="store-payment-result-v12-card w-full rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--theme-muted)]">
          {view.icon}
        </div>
        <h1 className="text-2xl font-semibold text-[var(--theme-text)]">{view.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">{view.description}</p>

        {order ? (
          <div className="mt-5 rounded-2xl bg-[var(--theme-muted)] p-4 text-left text-sm text-[var(--theme-text)]">
            <div className="flex items-center justify-between gap-3">
              <span>{t("payment.orderNo")}</span>
              <strong>{order.order_no}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>{t("payment.status")}</span>
              <strong>{labelPaymentStatus(order.payment_status, t)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>{t("payment.amountDue")}</span>
              <strong>RM {Number(order.total_amount || 0).toFixed(2)}</strong>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <UnifiedButton type="button" onClick={load} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2">
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t("payment.refresh")}
          </UnifiedButton>
          <Link className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] px-5 py-2 text-sm font-medium text-[var(--theme-text)]" to={localizedPath(order ? `/orders/${order.id}` : "/orders")}>
            <ShoppingBag size={16} />
            {t("payment.viewOrder")}
          </Link>
          {authRequired ? (
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] px-5 py-2 text-sm font-medium text-[var(--theme-text)]"
              to={localizedPath("/login")}
              state={{ from: `${location.pathname}${location.search}` }}
            >
              <LogIn size={16} />
              {t("payment.loginToView")}
            </Link>
          ) : null}
          <Link className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] px-5 py-2 text-sm font-medium text-[var(--theme-text)]" to={localizedPath(SUPPORT_PAGE_PATH)}>
            <MessageCircle size={16} />
            {t("payment.contactSupport")}
          </Link>
        </div>
      </section>
    </main>
  );
}
