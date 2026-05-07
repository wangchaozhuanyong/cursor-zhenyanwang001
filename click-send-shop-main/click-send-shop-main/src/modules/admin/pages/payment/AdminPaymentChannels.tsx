import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentChannelRow } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

function parseConfig(row: PaymentChannelRow): Record<string, unknown> {
  const c = row.config_json;
  if (!c) return {};
  if (typeof c === "string") {
    try {
      return JSON.parse(c) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return c as Record<string, unknown>;
}

export default function AdminPaymentChannels() {
  const [rows, setRows] = useState<PaymentChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    paymentAdmin
      .fetchAdminPaymentChannels()
      .then((list) => {
        setRows(list);
        const draft: Record<string, string> = {};
        for (const r of list) {
          draft[r.id] = JSON.stringify(parseConfig(r), null, 2);
        }
        setConfigDraft(draft);
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载渠道失败")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRow = async (id: string, patch: Parameters<typeof paymentAdmin.updateAdminPaymentChannel>[1]) => {
    try {
      await paymentAdmin.updateAdminPaymentChannel(id, patch);
      toast.success("已保存");
      void load();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    }
  };

  const saveConfigJson = async (row: PaymentChannelRow) => {
    const raw = (configDraft[row.id] || "").trim();
    let parsed: Record<string, unknown> = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        toast.error("配置 JSON 格式无效");
        return;
      }
    }
    await saveRow(row.id, { config_json: parsed });
  };

  return (
    <PermissionGate permission="payment.manage">
      <div className="p-4 md:p-6">
        <div className="mb-2">
          <h1 className="text-xl font-bold text-foreground">支付管理</h1>
          <p className="text-sm text-muted-foreground">渠道启停、排序与扩展配置（Stripe 手续费等可写入 JSON）</p>
        </div>
        <PaymentAdminSubnav />

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.code} · {row.provider} · {row.country_code}/{row.currency}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!row.enabled}
                      onChange={(e) => void saveRow(row.id, { enabled: e.target.checked })}
                    />
                    启用
                  </label>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    排序
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      defaultValue={row.sort_order}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v) || v === row.sort_order) return;
                        void saveRow(row.id, { sort_order: v });
                      }}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    环境
                    <select
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={row.environment}
                      onChange={(e) => void saveRow(row.id, { environment: e.target.value as "live" | "sandbox" })}
                    >
                      <option value="live">生产 live</option>
                      <option value="sandbox">沙箱 sandbox</option>
                    </select>
                  </label>
                </div>
                {row.provider === "stripe" && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-muted-foreground">
                      扩展 JSON（可选）：如 {"{"}"fee_rate_percent": 2.9, "fee_fixed": 1.0{"}"} 用于对账手续费估算
                    </p>
                    <textarea
                      className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
                      value={configDraft[row.id] ?? "{}"}
                      onChange={(e) => setConfigDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => void saveConfigJson(row)}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--theme-price)]/15 px-3 py-1.5 text-xs font-medium text-[var(--theme-price)]"
                    >
                      <Save size={14} /> 保存 JSON
                    </button>
                  </div>
                )}
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">暂无渠道，请执行数据库迁移 028。</p>}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
