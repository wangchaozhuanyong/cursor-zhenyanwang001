import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, ClipboardList, Copy, ExternalLink, MapPin, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import * as orderService from "@/services/orderService";
import type { Order } from "@/types/order";
import { ApiError } from "@/types/common";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";
import { formatDateTime } from "@/utils/formatDateTime";
import { copyToClipboard } from "@/utils/clipboard";
import { safeOpenExternal } from "@/utils/safeOpen";
import { getOrderLogisticsSnapshot } from "@/utils/orderLogistics";
import { getBuyerOrderStatusTextLocalized, getOrderCopy } from "./orderPageLocale";
import RouteStatePanel from "@/modules/storefront-v2/design/components/RouteStatePanel";
import StatusTimeline, { type StatusTimelineItem } from "@/modules/storefront-v2/design/components/StatusTimeline";

const LOGISTICS_PAGE_COPY: Record<PublicLocale, {
  title: string;
  subtitle: string;
  loading: string;
  loadFailed: string;
  authRequired: string;
  retry: string;
  backOrder: string;
  orderNo: string;
  orderStatus: string;
  currentStatus: string;
  courier: string;
  trackingNo: string;
  copyTracking: string;
  copied: string;
  copyFailed: string;
  external: string;
  timeline: string;
  noTimeline: string;
  noLogisticsTitle: string;
  noLogisticsDesc: string;
  latestUpdate: string;
}> = {
  zh: {
    title: "物流详情",
    subtitle: "配送状态以后台订单物流数据为准，不读取 URL 参数判断结果。",
    loading: "物流信息加载中...",
    loadFailed: "物流信息加载失败",
    authRequired: "请登录后查看该订单物流。",
    retry: "重试",
    backOrder: "返回订单详情",
    orderNo: "订单号",
    orderStatus: "订单状态",
    currentStatus: "当前物流",
    courier: "物流公司",
    trackingNo: "物流单号",
    copyTracking: "复制单号",
    copied: "物流单号已复制",
    copyFailed: "复制失败，请手动复制",
    external: "打开官方查询",
    timeline: "物流轨迹",
    noTimeline: "暂无轨迹更新，发货后会在这里同步。",
    noLogisticsTitle: "暂无物流信息",
    noLogisticsDesc: "商家发货并录入单号后，物流公司、单号和轨迹会展示在这里。",
    latestUpdate: "最新更新",
  },
  en: {
    title: "Delivery details",
    subtitle: "Delivery status comes from the backend order record, not URL parameters.",
    loading: "Loading delivery details...",
    loadFailed: "Failed to load delivery details",
    authRequired: "Please sign in to view delivery details.",
    retry: "Retry",
    backOrder: "Back to order",
    orderNo: "Order no.",
    orderStatus: "Order status",
    currentStatus: "Current delivery",
    courier: "Courier",
    trackingNo: "Tracking no.",
    copyTracking: "Copy tracking no.",
    copied: "Tracking number copied",
    copyFailed: "Copy failed. Please copy it manually.",
    external: "Open carrier tracking",
    timeline: "Delivery timeline",
    noTimeline: "No timeline yet. Updates will appear after shipment.",
    noLogisticsTitle: "No delivery details yet",
    noLogisticsDesc: "Courier, tracking number and events will show here after the merchant ships the order.",
    latestUpdate: "Latest update",
  },
};

export default function OrderLogistics() {
  const { id = "" } = useParams();
  const { localizedPath, locale } = usePublicLocale();
  const copy = LOGISTICS_PAGE_COPY[locale];
  const orderCopy = getOrderCopy(locale);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) {
      setError(orderCopy.unavailable);
      setLoading(false);
      return;
    }
    setRefreshing(true);
    try {
      const latest = await orderService.fetchOrderById(id, {
        loadingMode: "silent",
        skipGlobalLoading: true,
        skipAuthRetry: true,
        suppressAuthExpired: true,
      });
      setOrder(latest);
      setError("");
    } catch (e) {
      setOrder(null);
      if (e instanceof ApiError && (e.code === 401 || e.code === 403)) {
        setError(copy.authRequired);
      } else {
        setError(e instanceof Error ? e.message : copy.loadFailed);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.authRequired, copy.loadFailed, id, orderCopy.unavailable]);

  useEffect(() => {
    void load();
  }, [load]);

  const snapshot = useMemo(() => (order ? getOrderLogisticsSnapshot(order) : null), [order]);
  const trackingUrl = order?.logistics_provider?.tracking_url || "";
  const timeline = snapshot?.timeline || [];
  const hasLogistics = Boolean(
    snapshot?.carrier
      || snapshot?.trackingNo
      || snapshot?.statusLabel
      || snapshot?.exceptionMessage
      || timeline.length,
  );

  const pageBackFallback = id ? localizedPath(`/orders/${id}`) : localizedPath("/orders");
  const timelineItems: StatusTimelineItem[] = timeline.slice(0, 18).map((item, index) => ({
    id: item.id || `${item.tracking_no}-${item.event_time}-${index}`,
    title: item.title || item.status_label || item.status || copy.timeline,
    description: item.description || item.location || item.status_label || "",
    time: item.event_time ? formatDateTime(item.event_time) : "",
    state: index === 0 ? "current" : "complete",
  }));

  return (
    <StoreAccountLayout
      title={copy.title}
      backFallback={pageBackFallback}
      desktopBackLabel={copy.backOrder}
      className="store-v12-page store-logistics-v12-page"
      mainClassName="store-logistics-v12-main"
    >
      {loading ? (
        <section className="store-logistics-v12-card store-logistics-v12-loading" aria-busy="true" aria-label={copy.loading}>
          <div className="sf-next-skeleton store-logistics-v12-loading__hero" />
          <div className="sf-next-skeleton store-logistics-v12-loading__line" />
          <div className="sf-next-skeleton store-logistics-v12-loading__line is-short" />
        </section>
      ) : null}

      {!loading && error ? (
        <RouteStatePanel
          icon={<AlertTriangle size={28} aria-hidden />}
          title={copy.loadFailed}
          description={error}
          tone="error"
          primaryAction={
            <button type="button" className="sf-next-button sf-next-button--primary" onClick={() => void load()}>
              <RefreshCw size={16} aria-hidden />
              {copy.retry}
            </button>
          }
        />
      ) : null}

      {!loading && !error && order ? (
        <div className="space-y-4">
          <section className={`store-logistics-v12-hero ${snapshot?.hasException ? "is-exception" : ""}`}>
            <div className="store-logistics-v12-hero__icon">
              {snapshot?.hasException ? <AlertTriangle size={24} aria-hidden /> : <PackageCheck size={24} aria-hidden />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="store-logistics-v12-eyebrow">{copy.currentStatus}</p>
              <h1 className="store-logistics-v12-title">
                {snapshot?.statusLabel || getBuyerOrderStatusTextLocalized(order, locale)}
              </h1>
              <p className="store-logistics-v12-subtitle">
                {snapshot?.exceptionMessage || copy.subtitle}
              </p>
            </div>
            <UnifiedButton
              type="button"
              className="store-logistics-v12-refresh"
              disabled={refreshing}
              onClick={() => void load()}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} aria-hidden />
              {copy.retry}
            </UnifiedButton>
          </section>

          <section className="store-logistics-v12-card">
            <div className="store-logistics-v12-grid">
              <LogisticsMeta label={copy.orderNo} value={order.order_no} icon={<ClipboardList size={17} aria-hidden />} />
              <LogisticsMeta label={copy.orderStatus} value={getBuyerOrderStatusTextLocalized(order, locale)} icon={<PackageCheck size={17} aria-hidden />} />
              <LogisticsMeta label={copy.courier} value={snapshot?.carrier || "-"} icon={<Truck size={17} aria-hidden />} />
              <LogisticsMeta
                label={copy.trackingNo}
                value={snapshot?.trackingNo || "-"}
                icon={<MapPin size={17} aria-hidden />}
                action={snapshot?.trackingNo ? (
                  <UnifiedButton
                    type="button"
                    className="store-logistics-v12-inline-action"
                    onClick={async () => {
                      const trackingNo = snapshot?.trackingNo.trim() || "";
                      if (!trackingNo) return;
                      const ok = await copyToClipboard(trackingNo);
                      if (ok) toast.success(copy.copied);
                      else toast.error(copy.copyFailed);
                    }}
                  >
                    <Copy size={14} aria-hidden />
                    {copy.copyTracking}
                  </UnifiedButton>
                ) : null}
              />
            </div>
            {trackingUrl ? (
              <div className="mt-4 flex justify-end">
                <UnifiedButton
                  type="button"
                  className="store-logistics-v12-external"
                  onClick={() => safeOpenExternal(trackingUrl)}
                >
                  <ExternalLink size={15} aria-hidden />
                  {copy.external}
                </UnifiedButton>
              </div>
            ) : null}
          </section>

          <section className="store-logistics-v12-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="store-logistics-v12-eyebrow">{copy.latestUpdate}</p>
                <h2 className="store-logistics-v12-section-title">{copy.timeline}</h2>
              </div>
              <span className="store-logistics-v12-count">{timeline.length}</span>
            </div>

            {hasLogistics && timeline.length ? (
              <StatusTimeline items={timelineItems} className="store-logistics-v12-next-timeline" />
            ) : (
              <RouteStatePanel
                icon={<Truck size={28} aria-hidden />}
                title={hasLogistics ? copy.noTimeline : copy.noLogisticsTitle}
                description={hasLogistics ? copy.noTimeline : copy.noLogisticsDesc}
              />
            )}
          </section>
        </div>
      ) : null}
    </StoreAccountLayout>
  );
}

function LogisticsMeta({
  label,
  value,
  icon,
  action,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="store-logistics-v12-meta">
      <span className="store-logistics-v12-meta__icon">{icon}</span>
      <div className="min-w-0 flex-1">
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      {action}
    </div>
  );
}
