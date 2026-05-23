import { Tx } from "@/components/admin/AdminText";
import type { SiteSettings } from "@/types/admin";
import { useAdminT } from "@/hooks/useAdminT";

type Props = {
  settings: SiteSettings;
};

function formatMoney(n: number) {
  return n.toFixed(2);
}

export default function TaxPreviewCard({ settings }: Props) {
  const enabled = settings.sstEnabled === "1";
  const rate = parseFloat(String(settings.sstRatePercent ?? "0")) || 0;
  const gross = 100;
  const tax = enabled && rate > 0 ? (gross * rate) / (100 + rate) : 0;
  const net = gross - tax;

  return (
    <div className="rounded-xl border border-border bg-background p-3 text-xs">
      <p className="font-medium text-foreground"><Tx>税务预览</Tx></p>
      {!enabled ? (
        <p className="mt-2 text-muted-foreground"><Tx>SST 展示已关闭</Tx></p>
      ) : (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>RM{gross} 商品（含税示意）</li>
          <li>
            {settings.sstLabel || "SST"} {rate}%
          </li>
          <li>不含税金额 RM{formatMoney(net)}</li>
          <li className="text-foreground">税额 RM{formatMoney(tax)}</li>
        </ul>
      )}
    </div>
  );
}
