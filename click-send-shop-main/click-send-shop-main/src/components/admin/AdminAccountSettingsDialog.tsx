import { useAdminT } from "@/hooks/useAdminT";
import AdminAccountPanel, { type AdminAccountTab } from "@/components/admin/AdminAccountPanel";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";

interface AdminAccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AdminAccountTab;
}

export default function AdminAccountSettingsDialog({
  open,
  onOpenChange,
  initialTab = "profile",
}: AdminAccountSettingsDialogProps) {
  const { t } = useAdminT();

  return (
    <AdminResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("layout.accountSettings")}
      size="md"
      height="auto"
    >
      <AdminAccountPanel key={`${open}-${initialTab}`} initialTab={initialTab} embedded />
    </AdminResponsiveSheet>
  );
}
