import { useNavigate, useParams } from "react-router-dom";
import AdminUserDetailPanel from "@/modules/admin/pages/user/AdminUserDetailPanel";

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams();

  return (
    <AdminUserDetailPanel
      userId={id}
      onBack={() => navigate("/admin/users")}
    />
  );
}
