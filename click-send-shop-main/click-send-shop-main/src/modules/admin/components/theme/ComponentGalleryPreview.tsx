import PremiumCouponCard from "@/components/PremiumCouponCard";
import ProductCard from "@/components/ProductCard";
import StoreBadge from "@/components/ui/StoreBadge";
import StorePrice from "@/components/ui/StorePrice";
import type { ThemeConfig } from "@/types/theme";
import { previewProduct } from "./themePreviewData";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

function Btn({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" | "danger" | "ghost" | "success" }) {
  const styles: Record<string, string> = {
    primary: "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]",
    secondary: "bg-[var(--theme-secondary)] text-[var(--theme-secondary-foreground)]",
    danger: "bg-[var(--theme-danger)] text-[var(--theme-danger-foreground)]",
    success: "bg-[var(--theme-success)] text-[var(--theme-success-foreground)]",
    ghost: "border border-[var(--theme-border)] text-[var(--theme-text)] opacity-50",
  };
  return (
    <button type="button" disabled={variant === "ghost" && label.includes("禁用")} className={`rounded-[var(--theme-button-radius)] px-3 py-1.5 text-xs font-medium ${styles[variant]}`}>
      {label}
    </button>
  );
}

export default function ComponentGalleryPreview({ config: _config }: { config: ThemeConfig }) {
  const { tText } = useAdminT();
  return (
    <div className="space-y-4 text-[var(--theme-text)]">
      <section>
        <p className="mb-2 text-xs font-semibold text-[var(--theme-text-muted)]"><Tx>按钮</Tx></p>
        <div className="flex flex-wrap gap-2">
          <Btn label={tText("主按钮")} />
          <Btn label={tText("次按钮")} variant="secondary" />
          <Btn label={tText("危险按钮")} variant="danger" />
          <Btn label={tText("成功按钮")} variant="success" />
          <Btn label={tText("禁用按钮")} variant="ghost" />
        </div>
      </section>
      <section>
        <p className="mb-2 text-xs font-semibold text-[var(--theme-text-muted)]"><Tx>输入</Tx></p>
        <input className="mb-2 h-9 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-xs" placeholder={tText("输入框")} />
        <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3">
          <span className="text-[var(--theme-text-muted)]">🔍</span>
          <span className="text-xs text-[var(--theme-text-muted)]"><Tx>搜索框</Tx></span>
        </div>
      </section>
      <section>
        <p className="mb-2 text-xs font-semibold text-[var(--theme-text-muted)]"><Tx>标签 / 徽章</Tx></p>
        <div className="flex flex-wrap gap-2">
          <StoreBadge type="hot"><Tx>热销</Tx></StoreBadge>
          <StoreBadge type="sale"><Tx>促销</Tx></StoreBadge>
          <StoreBadge type="danger"><Tx>危险</Tx></StoreBadge>
        </div>
      </section>
      <StorePrice price={79} originalPrice={99} />
      <PremiumCouponCard
        colorScheme="invite"
        layout="home"
        title={tText("中秋9.5折")}
        amount="95%"
        amountPrefix=""
        minSpendText="满 RM 100 可用"
        expireText="2027-05-09"
        scopeText="适用范围：全场商品"
        actionLabel="立即领取"
      />
      <div className="store-card p-2 text-xs"><Tx>会员卡骨架预览</Tx></div>
      <ProductCard product={previewProduct} />
      <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 text-xs"><Tx>Toast / 提示样式区域</Tx></div>
      <div className="rounded-t-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-xs shadow-lg">
        <p className="font-medium">Bottom Sheet</p>
        <p className="mt-1 text-[var(--theme-text-muted)]"><Tx>从底部上滑的弹层示例</Tx></p>
      </div>
      <div className="h-8 animate-pulse rounded-lg bg-[var(--theme-border)]/40" />
      <table className="admin-table-fixed w-full border-collapse text-[10px]">
        <tbody>
          <tr className="border-b border-[var(--theme-border)]">
            <td className="py-1"><Tx>表格行 A</Tx></td>
            <td>RM 10</td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-center gap-1 text-[10px]">
        <span className="rounded border border-[var(--theme-border)] px-2 py-1">‹</span>
        <span className="rounded bg-[var(--theme-primary)] px-2 py-1 text-[var(--theme-primary-foreground)]">1</span>
        <span className="rounded border border-[var(--theme-border)] px-2 py-1">›</span>
      </div>
    </div>
  );
}
