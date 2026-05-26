import { toast } from "sonner";
import { AppModal } from "@/modules/micro-interactions";
import { copyToClipboard } from "@/utils/clipboard";

export type LogisticsInfoModalProps = {
  open: boolean;
  onClose: () => void;
  carrier?: string;
  trackingNo?: string;
};

/** 无外链物流页时，展示承运商与单号（light Dialog，走全局 ModalLayer） */
export function LogisticsInfoModal({ open, onClose, carrier, trackingNo }: LogisticsInfoModalProps) {
  const hasCarrier = Boolean(carrier?.trim());
  const hasTracking = Boolean(trackingNo?.trim());

  return (
    <AppModal
      tier="light"
      open={open}
      onClose={onClose}
      title="物流信息"
      height="auto"
      showHandle={false}
      stickyFooter
      footer={
        hasTracking ? (
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--theme-primary)] text-sm font-semibold text-[var(--theme-primary-foreground)]"
            onClick={async () => {
              const ok = await copyToClipboard(trackingNo!.trim());
              if (ok) {
                toast.success("物流单号已复制");
                onClose();
              } else {
                toast.error("复制失败，请手动复制");
              }
            }}
          >
            复制物流单号
          </button>
        ) : undefined
      }
    >
      <div className="space-y-2 text-sm">
        {hasCarrier ? (
          <p>
            <span className="text-[var(--theme-text-muted)]">物流公司：</span>
            <span className="font-medium text-[var(--theme-text)]">{carrier}</span>
          </p>
        ) : null}
        {hasTracking ? (
          <p className="break-all">
            <span className="text-[var(--theme-text-muted)]">物流单号：</span>
            <span className="font-medium text-[var(--theme-text)]">{trackingNo}</span>
          </p>
        ) : null}
        {!hasCarrier && !hasTracking ? (
          <p className="text-[var(--theme-text-muted)]">暂无物流信息</p>
        ) : null}
      </div>
    </AppModal>
  );
}
