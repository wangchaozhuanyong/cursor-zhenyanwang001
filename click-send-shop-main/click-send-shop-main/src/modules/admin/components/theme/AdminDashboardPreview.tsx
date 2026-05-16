import { LayoutDashboard, Package, Settings } from "lucide-react";
import type { ThemeConfig } from "@/types/theme";

const rows = [
  { id: "1001", name: "精选商品 A", status: "在售", amount: "RM 88.00" },
  { id: "1002", name: "精选商品 B", status: "待审", amount: "RM 128.00" },
  { id: "1003", name: "精选商品 C", status: "缺货", amount: "RM 56.00" },
];

export default function AdminDashboardPreview({ config: _config }: { config: ThemeConfig }) {
  return (
    <div className="flex min-h-[420px] overflow-hidden rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <aside className="w-28 shrink-0 border-r border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 text-[10px]">
        <p className="mb-2 px-1 font-semibold">管理后台</p>
        <nav className="space-y-1">
          <div className="flex items-center gap-1 rounded-md bg-[var(--theme-primary)] px-2 py-1.5 font-medium text-[var(--theme-primary-foreground)]">
            <LayoutDashboard size={12} /> 仪表盘
          </div>
          <div className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[var(--theme-text-muted)]">
            <Package size={12} /> 商品
          </div>
          <div className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[var(--theme-text-muted)]">
            <Settings size={12} /> 设置
          </div>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 p-3">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--theme-border)] pb-2">
          <span className="text-xs font-semibold">商品列表</span>
          <button type="button" className="rounded-md bg-[var(--theme-primary)] px-2 py-1 text-[10px] text-[var(--theme-primary-foreground)]">
            新建
          </button>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {["今日订单", "销售额", "访客"].map((label) => (
            <div key={label} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2">
              <p className="text-[10px] text-[var(--theme-text-muted)]">{label}</p>
              <p className="text-sm font-bold">128</p>
            </div>
          ))}
        </div>
        <div className="mb-2 flex gap-2">
          <input
            placeholder="筛选商品..."
            className="h-8 flex-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 text-[10px] outline-none"
          />
          <button type="button" className="h-8 rounded-md border border-[var(--theme-border)] px-2 text-[10px]">
            筛选
          </button>
        </div>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-[var(--theme-border)] text-left text-[var(--theme-text-muted)]">
              <th className="py-1.5">ID</th>
              <th>商品</th>
              <th>状态</th>
              <th>金额</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--theme-border)]">
                <td className="py-2">{row.id}</td>
                <td>{row.name}</td>
                <td>
                  <span
                    className={`rounded px-1.5 py-0.5 ${
                      row.status === "在售"
                        ? "bg-[var(--theme-success)]/15 text-[var(--theme-success)]"
                        : row.status === "缺货"
                          ? "bg-[var(--theme-danger)]/15 text-[var(--theme-danger)]"
                          : "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)]"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td>{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex gap-2">
          <button type="button" className="rounded-md bg-[var(--theme-primary)] px-3 py-1.5 text-[10px] text-[var(--theme-primary-foreground)]">
            保存
          </button>
          <button type="button" className="rounded-md bg-[var(--theme-danger)] px-3 py-1.5 text-[10px] text-[var(--theme-danger-foreground)]">
            删除
          </button>
        </div>
        <div className="mt-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2">
          <p className="text-[10px] font-medium">弹窗示例</p>
          <p className="mt-1 text-[10px] text-[var(--theme-text-muted)]">确认删除该商品？此操作不可撤销。</p>
        </div>
      </div>
    </div>
  );
}
