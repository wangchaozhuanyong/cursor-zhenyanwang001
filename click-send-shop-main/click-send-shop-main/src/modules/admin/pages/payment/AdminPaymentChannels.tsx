import { useCallback, useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import StripeChannelConfigForm from "./StripeChannelConfigForm";
import { formatChannelSubtitle, labelPaymentEnvironment } from "@/utils/paymentAdminLabels";
import PermissionGate from "@/components/admin/PermissionGate";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentChannelRow } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";

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
          <AdminPageTitle
            title={<Tx>支付管理</Tx>}
            hint={<Tx>渠道启停、排序与扩展配置（手续费率等可在下方表单填写）</Tx>}
          />
        </div>
        <PaymentAdminSubnav />

        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="theme-rounded mb-4 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow space-y-3"
              >
                <div className="skeleton-base skeleton-shimmer h-5 w-1/3 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-2/3 rounded" />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
                  <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
                </div>
              </div>
            ))
          : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{formatChannelSubtitle(row)}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!row.enabled}
                      onChange={(e) => void saveRow(row.id, { enabled: e.target.checked })}
                    /><Tx>
                    启用
                  </Tx></label>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-muted-foreground"><Tx>
                    排序
                    </Tx><input
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
                  <label className="text-xs text-muted-foreground"><Tx>
                    环境
                    </Tx><select
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={row.environment}
                      onChange={(e) => void saveRow(row.id, { environment: e.target.value as "live" | "sandbox" })}
                    >
                      <option value="live">{labelPaymentEnvironment("live")}</option>
                      <option value="sandbox">{labelPaymentEnvironment("sandbox")}</option>
                    </select>
                  </label>
                </div>
                {row.provider === "stripe" && (
                  <StripeChannelConfigForm
                    draft={configDraft[row.id] ?? "{}"}
                    onDraftChange={(next) => setConfigDraft((d) => ({ ...d, [row.id]: next }))}
                    onSave={() => void saveConfigJson(row)}
                  />
                )}
              </div>
            ))}
            {rows.length === 0 && (
              <div className="py-12 text-center">
                <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground"><Tx>暂无支付渠道，请联系技术人员初始化支付配置。</Tx></p>
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
