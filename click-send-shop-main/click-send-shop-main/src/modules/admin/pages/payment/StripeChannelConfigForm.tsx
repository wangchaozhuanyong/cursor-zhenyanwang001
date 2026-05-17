import { useMemo } from "react";
import { Save } from "lucide-react";
import {
import { Tx } from "@/components/admin/AdminText";
  CHECKOUT_MODE_LABELS,
  formatPaymentConfigSummary,
} from "@/utils/paymentAdminLabels";

function parseDraft(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return {};
  }
}

type Props = {
  draft: string;
  onDraftChange: (next: string) => void;
  onSave: () => void;
};

export default function StripeChannelConfigForm({ draft, onDraftChange, onSave }: Props) {
  const config = useMemo(() => parseDraft(draft), [draft]);
  const checkoutMode = String(config.checkoutMode ?? "session");
  const feeRate =
    config.fee_rate_percent != null && config.fee_rate_percent !== ""
      ? String(config.fee_rate_percent)
      : "";
  const feeFixed =
    config.fee_fixed != null && config.fee_fixed !== "" ? String(config.fee_fixed) : "";

  const patchConfig = (patch: Record<string, unknown>) => {
    const next = { ...parseDraft(draft) };
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v === undefined) delete next[k];
      else next[k] = v;
    }
    onDraftChange(JSON.stringify(next, null, 2));
  };

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs text-muted-foreground">
        扩展配置（用于对账手续费估算）：{formatPaymentConfigSummary(config)}
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-muted-foreground"><Tx>
          结账模式
          </Tx><select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={checkoutMode}
            onChange={(e) => patchConfig({ checkoutMode: e.target.value })}
          >
            {Object.entries(CHECKOUT_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground"><Tx>
          手续费率（%）
          </Tx><input
            type="number"
            step="0.01"
            min="0"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={feeRate}
            placeholder="如 2.9"
            onChange={(e) =>
              patchConfig({
                fee_rate_percent: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
          />
        </label>
        <label className="text-xs text-muted-foreground"><Tx>
          固定手续费
          </Tx><input
            type="number"
            step="0.01"
            min="0"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={feeFixed}
            placeholder="如 1.0"
            onChange={(e) =>
              patchConfig({
                fee_fixed: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
          />
        </label>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"><Tx>
          高级：查看或编辑原始 JSON
        </Tx></summary>
        <textarea
          className="mt-2 min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
        />
      </details>
      <button
        type="button"
        onClick={onSave}
        className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--theme-price)]/15 px-3 py-1.5 text-xs font-medium text-[var(--theme-price)]"
      >
        <Save size={14} /><Tx> 保存配置
      </Tx></button>
    </div>
  );
}
