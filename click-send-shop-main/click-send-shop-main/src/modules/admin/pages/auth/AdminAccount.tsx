import AdminAccountPanel from "@/components/admin/AdminAccountPanel";

/** 保留 /admin/account 路由，供书签与刷新；日常从右上角头像弹窗进入 */
export default function AdminAccount() {
  return <AdminAccountPanel />;
}
