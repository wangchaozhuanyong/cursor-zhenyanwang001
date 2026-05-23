import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AdminTableScrollContainer } from "@/components/admin/AdminTableScrollContainer";
import {
  adminTableClassName,
  ADMIN_TABLE_STICKY_FIRST_CLASS,
} from "@/utils/adminTableClasses";

type AdminNativeTableProps = {
  children: ReactNode;
  className?: string;
  tableClassName?: string;
  stickyFirstColumn?: boolean;
};

/** 非 AnimatedTable 场景（监控、系统设置等）的统一响应式表格容器 */
export function AdminNativeTable({
  children,
  className,
  tableClassName,
  stickyFirstColumn = true,
}: AdminNativeTableProps) {
  return (
    <div className={cn("admin-native-table-card", className)}>
      <AdminTableScrollContainer>
        <table
          className={adminTableClassName(
            cn(
              "w-full text-left text-sm",
              stickyFirstColumn && ADMIN_TABLE_STICKY_FIRST_CLASS,
              tableClassName,
            ),
          )}
        >
          {children}
        </table>
      </AdminTableScrollContainer>
    </div>
  );
}

export default AdminNativeTable;
