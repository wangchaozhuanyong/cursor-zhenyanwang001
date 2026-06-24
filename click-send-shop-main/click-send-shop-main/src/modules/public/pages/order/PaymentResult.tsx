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

function resultTone(state: ResultState) {
  if (state === "paid") return "success";
  if (state === "failed") return "error";
  if (state === "pending") return "pending";
  return "loading";
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { localizedPath, t } = usePublicLocale();
  const orderId =
    searchParams.get("order_id")
    || searchParams.get("orderId")
    || searchParams.get("order_no")
    || searchParams.get("orderNo")
    || "";
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
    <main className="store-page-shell store-v12-page store-payment-result-v12-page store-bottom-safe mx-auto flex min-h-[70vh] max-w-2xl flex-col px-4 py-6 text-center sm:py-10">
      <section className="store-payment-result-v12-card w-full" data-state={resultTone(state)}>
        <div className="store-payment-result-v12-status">
          <div className="store-payment-result-v12-icon" aria-hidden="true">
            {view.icon}
          </div>
          <div className="store-payment-result-v12-copy">
            <h1>{view.title}</h1>
            <p>{view.description}</p>
          </div>
        </div>

        {order ? (
          <div className="store-payment-result-v12-receipt" aria-label={t("payment.viewOrder")}>
            <div className="store-payment-result-v12-amount">
              <span>{t("payment.amountDue")}</span>
              <strong>RM {Number(order.total_amount || 0).toFixed(2)}</strong>
            </div>
            <dl className="store-payment-result-v12-lines">
              <div>
                <dt>{t("payment.orderNo")}</dt>
                <dd>{order.order_no}</dd>
              </div>
              <div>
                <dt>{t("payment.status")}</dt>
                <dd>{labelPaymentStatus(order.payment_status, t)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="store-payment-result-v12-actions">
          <UnifiedButton type="button" onClick={load} disabled={refreshing} className="store-payment-result-v12-action store-payment-result-v12-action--primary">
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t("payment.refresh")}
          </UnifiedButton>
          <Link className="store-payment-result-v12-action" to={localizedPath(order ? `/orders/${order.id}` : "/orders")}>
            <ShoppingBag size={16} />
            {t("payment.viewOrder")}
          </Link>
          {authRequired ? (
            <Link
              className="store-payment-result-v12-action"
              to={localizedPath("/login")}
              state={{ from: `${location.pathname}${location.search}` }}
            >
              <LogIn size={16} />
              {t("payment.loginToView")}
            </Link>
          ) : null}
          <Link className="store-payment-result-v12-action" to={localizedPath(SUPPORT_PAGE_PATH)}>
            <MessageCircle size={16} />
            {t("payment.contactSupport")}
          </Link>
        </div>
      </section>
    </main>
  );
}
