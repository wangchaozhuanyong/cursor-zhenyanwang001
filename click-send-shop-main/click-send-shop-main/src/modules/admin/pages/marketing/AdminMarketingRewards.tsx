import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminRewardRecords from "@/modules/admin/pages/user/AdminRewardRecords";

export default function AdminMarketingRewards() {
  return (
    <AdminPageShell hint={<Tx>维护邀请返现规则，查看返现入账、冲正和结算状态。</Tx>}>
      <AdminRewardRecords embedded />
    </AdminPageShell>
  );
}
