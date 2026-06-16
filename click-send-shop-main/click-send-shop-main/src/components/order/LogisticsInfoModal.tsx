import { toast } from "sonner";
import { AppModal } from "@/modules/micro-interactions";
import { copyToClipboard } from "@/utils/clipboard";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { formatDateTime } from "@/utils/formatDateTime";
import type { OrderLogisticsTrack } from "@/types/order";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

export type LogisticsInfoModalProps = {
  open: boolean;
  onClose: () => void;
  carrier?: string;
  trackingNo?: string;
  statusLabel?: string;
  exceptionMessage?: string;
  hasException?: boolean;
  timeline?: OrderLogisticsTrack[];
};

const LOGISTICS_MODAL_COPY: Record<PublicLocale, {
  title: string;
  copied: string;
  copyFailed: string;
  copyTracking: string;
  carrier: string;
  trackingNo: string;
  empty: string;
  update: string;
}> = {
  zh: {
    title: "物流信息",
    copied: "物流单号已复制",
    copyFailed: "复制失败，请手动复制",
    copyTracking: "复制物流单号",
    carrier: "物流公司",
    trackingNo: "物流单号",
    empty: "暂无物流信息",
    update: "物流更新",
  },
  en: {
    title: "Logistics information",
    copied: "Tracking number copied",
    copyFailed: "Copy failed. Please copy it manually.",
    copyTracking: "Copy tracking number",
    carrier: "Courier",
    trackingNo: "Tracking number",
    empty: "No logistics info yet",
    update: "Logistics update",
  },
  ms: {
    title: "Maklumat logistik",
    copied: "Nombor penjejakan disalin",
    copyFailed: "Gagal salin. Sila salin secara manual.",
    copyTracking: "Salin nombor penjejakan",
    carrier: "Kurier",
    trackingNo: "Nombor penjejakan",
    empty: "Tiada maklumat logistik lagi",
    update: "Kemas kini logistik",
  },
};

/** 无外链物流页时，展示承运商与单号（light Dialog，走全局 ModalLayer） */
export function LogisticsInfoModal({
  open,
  onClose,
  carrier,
  trackingNo,
  statusLabel,
  exceptionMessage,
  hasException,
  timeline = [],
}: LogisticsInfoModalProps) {
  const { locale } = usePublicLocale();
  const copy = LOGISTICS_MODAL_COPY[locale];
  const hasCarrier = Boolean(carrier?.trim());
  const hasTracking = Boolean(trackingNo?.trim());
  const hasTimeline = timeline.length > 0;

  return (
    <AppModal
      tier="light"
      open={open}
      onClose={onClose}
      title={copy.title}
      height="auto"
      showHandle={false}
      stickyFooter
      footer={
        hasTracking ? (
          <UnifiedButton
            type="button"
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--theme-primary)] text-sm font-semibold text-[var(--theme-primary-foreground)]"
            onClick={async () => {
              const ok = await copyToClipboard(trackingNo!.trim());
              if (ok) {
                toast.success(copy.copied);
                onClose();
              } else {
                toast.error(copy.copyFailed);
              }
            }}
          >
            {copy.copyTracking}
          </UnifiedButton>
        ) : undefined
      }
    >
      <div className="space-y-3 text-sm">
        {statusLabel ? (
          <div className={`rounded-2xl border px-3 py-2 ${hasException ? "border-[var(--theme-danger)] bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))]" : "border-border bg-[var(--theme-surface)]"}`}>
            <p className="font-semibold text-[var(--theme-text)]">{statusLabel}</p>
            {exceptionMessage ? (
              <p className="mt-1 text-xs text-[var(--theme-text-muted)]">{exceptionMessage}</p>
            ) : null}
          </div>
        ) : null}
        {hasCarrier ? (
          <p>
            <span className="text-[var(--theme-text-muted)]">{copy.carrier}: </span>
            <span className="font-medium text-[var(--theme-text)]">{carrier}</span>
          </p>
        ) : null}
        {hasTracking ? (
          <p className="break-all">
            <span className="text-[var(--theme-text-muted)]">{copy.trackingNo}: </span>
            <span className="font-medium text-[var(--theme-text)]">{trackingNo}</span>
          </p>
        ) : null}
        {!hasCarrier && !hasTracking ? (
          <p className="text-[var(--theme-text-muted)]">{copy.empty}</p>
        ) : null}
        {hasTimeline ? (
          <div className="space-y-2 border-t border-border pt-3">
            {timeline.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-[var(--theme-surface)] px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={item.severity === "error" || item.severity === "warning" ? "font-semibold text-[var(--theme-danger)]" : "font-semibold text-[var(--theme-text)]"}>
                    {item.title || item.status_label || item.status || copy.update}
                  </span>
                  <span className="text-[var(--theme-text-muted)]">{item.event_time ? formatDateTime(item.event_time) : ""}</span>
                </div>
                <p className="mt-1 text-[var(--theme-text-muted)]">{item.description || item.location || item.status_label || ""}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
