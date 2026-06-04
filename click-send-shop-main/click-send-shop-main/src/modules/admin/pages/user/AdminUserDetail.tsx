import { useParams } from "react-router-dom";
import AdminUserDetailPanel from "@/modules/admin/pages/user/AdminUserDetailPanel";
import { useAdminGoBack } from "@/hooks/useAdminGoBack";

export default function AdminUserDetail() {
  const { id = "" } = useParams();
  const goBack = useAdminGoBack("/admin/users");

  return (
    <AdminUserDetailPanel
      userId={id}
      onBack={goBack}
    />
  );
}
