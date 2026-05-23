import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import AdminRewardRecords from "@/modules/admin/pages/user/AdminRewardRecords";

export default function AdminMarketingRewards() {
  return (
    <div className="space-y-4">
      <AdminPageTitle
        title={<Tx>活动管理 / 返现管理</Tx>}
        hint={<Tx>维护邀请返现规则，查看返现入账、冲正和结算状态。</Tx>}
      />
      <AdminRewardRecords />
    </div>
  );
}
