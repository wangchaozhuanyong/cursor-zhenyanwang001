import { useEffect, useState } from "react";
import { Tx } from "@/components/admin/AdminText";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";

type Props = {
  open: boolean;
  orderNo: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (trackingNo: string, carrier: string, shippingCostAmount?: number) => void | Promise<void>;
};

export default function AdminShipOrderDialog({ open, orderNo, onOpenChange, onConfirm }: Props) {
  const { tText } = useAdminT();
  const [trackingNo, setTrackingNo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [shippingCostAmount, setShippingCostAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dirty = open && (
    trackingNo.trim() !== ""
    || carrier.trim() !== ""
    || shippingCostAmount.trim() !== ""
  );
  useAdminTabDirty(dirty);

  useEffect(() => {
    if (!open) {
      setTrackingNo("");
      setCarrier("");
      setShippingCostAmount("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const parsed = Number(shippingCostAmount);
      const cost = shippingCostAmount.trim() === "" || Number.isNaN(parsed)
        ? undefined
        : Math.max(0, parsed);
      await onConfirm(trackingNo.trim(), carrier.trim(), cost);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={<Tx>确认发货</Tx>}
      description={
        <>
          <Tx>订单号</Tx>：<span className="font-mono text-foreground">{orderNo}</span>
        </>
      }
      submitText="确认发货"
      loading={submitting}
      size="sm"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground"><Tx>承运商（选填）</Tx></label>
        <input
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder={tText("例如 J&T、Pos Laju")}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--theme-primary)_20%,transparent)]"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground"><Tx>运单号（选填）</Tx></label>
        <input
          value={trackingNo}
          onChange={(e) => setTrackingNo(e.target.value)}
          placeholder={tText("填写物流单号")}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--theme-primary)_20%,transparent)]"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground"><Tx>实际物流成本 (RM，可选)</Tx></label>
        <input
          value={shippingCostAmount}
          onChange={(e) => setShippingCostAmount(e.target.value)}
          placeholder={tText("例如 8.50")}
          inputMode="decimal"
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--theme-primary)_20%,transparent)]"
        />
      </div>
    </AdminFormSheet>
  );
}
