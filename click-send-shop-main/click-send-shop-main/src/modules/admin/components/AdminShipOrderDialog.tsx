import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tx } from "@/components/admin/AdminText";

type Props = {
  open: boolean;
  orderNo: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (trackingNo: string, carrier: string) => void | Promise<void>;
};

export default function AdminShipOrderDialog({ open, orderNo, onOpenChange, onConfirm }: Props) {
  const [trackingNo, setTrackingNo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTrackingNo("");
      setCarrier("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onConfirm(trackingNo.trim(), carrier.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle><Tx>确认发货</Tx></DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <Tx>订单号</Tx>：<span className="font-mono text-foreground">{orderNo}</span>
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground"><Tx>承运商（选填）</Tx></label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="例如 J&T、Pos Laju"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground"><Tx>运单号（选填）</Tx></label>
            <input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="填写物流单号"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
          >
            <Tx>取消</Tx>
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="rounded-lg btn-theme-price px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <Tx>提交中…</Tx> : <Tx>确认发货</Tx>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
