import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminT } from "@/hooks/useAdminT";
import AdminAccountPanel, { type AdminAccountTab } from "@/components/admin/AdminAccountPanel";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,720px)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("layout.accountSettings")}</DialogTitle>
        </DialogHeader>
        <AdminAccountPanel key={`${open}-${initialTab}`} initialTab={initialTab} embedded />
      </DialogContent>
    </Dialog>
  );
}
