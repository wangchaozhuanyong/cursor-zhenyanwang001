/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useShippingStore, calcShippingFee } from "@/stores/useShippingStore";
import type { ShippingTemplate } from "@/stores/useShippingStore";
import { ResponsiveSheet, useMediaSheetMode } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";

interface ShippingPickerProps {
  totalAmount: number;
  selectedId: number | null;
  /** 外层已有「配送方式」标题时隐藏卡片内重复标题 */
  hideHeading?: boolean;
  /** 结算页内嵌：无独立外框，触发区样式与支付方式一致 */
  embedded?: boolean;
  onSelect: (template: ShippingTemplate, fee: number) => void;
}

export { calcShippingFee };

function formatRegions(regions: unknown): string {
  const raw = String(regions ?? "").trim();
  if (!raw) return "全国配送";
  if (raw === "[]") return "全国配送";
  if (!raw.startsWith("[")) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const labels = parsed.map((it) => String(it ?? "").trim()).filter(Boolean);
      return labels.length ? labels.join(" / ") : "全国配送";
    }
  } catch {
    // keep raw string fallback
  }
  return raw;
}

function ShippingOptionButton({
  template,
  totalAmount,
  isActive,
  onPick,
}: {
  template: ShippingTemplate;
  totalAmount: number;
  isActive: boolean;
  onPick: () => void;
}) {
  const fee = calcShippingFee(template, totalAmount);
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl p-3 text-left transition-all",
        isActive ? "border-2 border-gold bg-gold/5" : "border border-border bg-secondary hover:border-gold/30",
      )}
    >
      <div>
        <p className={cn("text-sm font-medium", isActive ? "text-theme-price" : "text-foreground")}>{template.name}</p>
        <p className="text-xs text-muted-foreground">{formatRegions(template.regions)}</p>
        {template.freeAbove > 0 ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            满 RM {template.freeAbove} 包邮 {fee === 0 ? "✓" : ""}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        {fee === 0 ? (
          <span className="text-sm font-bold text-[var(--theme-success)]">包邮</span>
        ) : (
          <span className="text-sm font-bold text-foreground">RM {fee}</span>
        )}
      </div>
    </button>
  );
}

function ShippingSummary({
  template,
  totalAmount,
  flat = false,
}: {
  template: ShippingTemplate;
  totalAmount: number;
  flat?: boolean;
}) {
  const fee = calcShippingFee(template, totalAmount);
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between",
        !flat && "rounded-xl bg-secondary p-3",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{template.name}</p>
        <p className="text-xs text-muted-foreground">{formatRegions(template.regions)}</p>
      </div>
      <div className="shrink-0 text-right">
        {fee === 0 ? (
          <span className="text-sm font-bold text-[var(--theme-success)]">包邮</span>
        ) : (
          <span className="text-sm font-bold text-foreground">RM {fee}</span>
        )}
        {template.freeAbove > 0 && fee > 0 ? (
          <p className="text-[10px] text-muted-foreground">满 RM {template.freeAbove} 包邮</p>
        ) : null}
      </div>
    </div>
  );
}

export default function ShippingPicker({
  totalAmount,
  selectedId,
  hideHeading = false,
  embedded = false,
  onSelect,
}: ShippingPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobileSheet = useMediaSheetMode();
  const { templates } = useShippingStore();
  const enabledTemplates = templates.filter((t) => t.enabled);

  const selected = enabledTemplates.find((t) => t.id === selectedId) ?? enabledTemplates[0];
  if (!selected) return null;

  const optionList = (
    <div className="space-y-2 pb-2">
      {enabledTemplates.map((t) => (
        <ShippingOptionButton
          key={t.id}
          template={t}
          totalAmount={totalAmount}
          isActive={t.id === selected.id}
          onPick={() => {
            onSelect(t, calcShippingFee(t, totalAmount));
            setSheetOpen(false);
            setExpanded(false);
          }}
        />
      ))}
    </div>
  );

  const shellClass = embedded ? "" : "rounded-2xl border border-border bg-card p-5";

  if (isMobileSheet) {
    return (
      <div className={shellClass}>
        {!hideHeading && !embedded ? <h3 className="mb-3 text-sm font-semibold text-foreground">配送方式</h3> : null}
        <button
          type="button"
          onClick={() => (enabledTemplates.length > 1 ? setSheetOpen(true) : undefined)}
          className={
            embedded
              ? "flex w-full items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3.5 text-left"
              : "flex w-full items-center gap-2 text-left"
          }
        >
          <div className="min-w-0 flex-1">
            <ShippingSummary template={selected} totalAmount={totalAmount} flat={embedded} />
          </div>
          {enabledTemplates.length > 1 ? (
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          ) : null}
        </button>
        {enabledTemplates.length > 1 ? (
          <ResponsiveSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="选择配送方式" height="auto">
            {optionList}
          </ResponsiveSheet>
        ) : null}
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {(enabledTemplates.length > 1 || !hideHeading) && (
        <div className={cn("mb-3 flex items-center", hideHeading ? "justify-end" : "justify-between")}>
          {!hideHeading ? <h3 className="text-sm font-semibold text-foreground">配送方式</h3> : null}
          {enabledTemplates.length > 1 ? (
            <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-theme-price">
              {expanded ? "收起" : "更多选项"}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          ) : null}
        </div>
      )}

      {!expanded ? (
        <ShippingSummary template={selected} totalAmount={totalAmount} flat={embedded} />
      ) : (
        optionList
      )}
    </div>
  );
}
