import { Tx } from "@/components/admin/AdminText";
import { AdminSideDrawer } from "@/modules/admin/components/AdminSideDrawer";
import AdminOrderDetailPanel from "@/modules/admin/pages/order/AdminOrderDetailPanel";

type AdminOrderDetailDrawerProps = {
  open: boolean;
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void | Promise<void>;
};

export default function AdminOrderDetailDrawer({
  open,
  orderId,
  onOpenChange,
  onUpdated,
}: AdminOrderDetailDrawerProps) {
  return (
    <AdminSideDrawer
      open={open && Boolean(orderId)}
      onOpenChange={onOpenChange}
      title={<Tx>订单详情</Tx>}
      bodyClassName="bg-[var(--theme-bg)]"
    >
      {orderId ? (
        <AdminOrderDetailPanel
          orderId={orderId}
          embedded
          enableTabTitle={false}
          onUpdated={onUpdated}
        />
      ) : null}
    </AdminSideDrawer>
  );
}
