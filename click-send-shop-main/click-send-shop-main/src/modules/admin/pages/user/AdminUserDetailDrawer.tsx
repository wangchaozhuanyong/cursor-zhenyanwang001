import { Tx } from "@/components/admin/AdminText";
import { AdminSideDrawer } from "@/modules/admin/components/AdminSideDrawer";
import AdminUserDetailPanel from "@/modules/admin/pages/user/AdminUserDetailPanel";

type AdminUserDetailDrawerProps = {
  open: boolean;
  userId: string | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void | Promise<void>;
};

export default function AdminUserDetailDrawer({
  open,
  userId,
  onOpenChange,
  onUpdated,
}: AdminUserDetailDrawerProps) {
  return (
    <AdminSideDrawer
      open={open && Boolean(userId)}
      onOpenChange={onOpenChange}
      title={<Tx>用户详情</Tx>}
      bodyClassName="bg-[var(--theme-bg)]"
    >
      {userId ? (
        <AdminUserDetailPanel
          userId={userId}
          embedded
          enableTabTitle={false}
          onUpdated={onUpdated}
        />
      ) : null}
    </AdminSideDrawer>
  );
}
