import { useState } from "react";
import { Truck, ChevronDown, ChevronUp } from "lucide-react";
import { useShippingStore, calcShippingFee } from "@/stores/useShippingStore";
import type { ShippingTemplate } from "@/stores/useShippingStore";

interface ShippingPickerProps {
  totalAmount: number;
  selectedId: number | null;
  onSelect: (template: ShippingTemplate, fee: number) => void;
}

export { calcShippingFee };

export default function ShippingPicker({ totalAmount, selectedId, onSelect }: ShippingPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const { templates } = useShippingStore();
  const enabledTemplates = templates.filter((t) => t.enabled);

  const selected = enabledTemplates.find((t) => t.id === selectedId) ?? enabledTemplates[0];
  if (!selected) return null;

  const currentFee = calcShippingFee(selected, totalAmount);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Truck size={16} className="text-gold" /> 配送方式
        </h3>
        {enabledTemplates.length > 1 && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-gold">
            {expanded ? "收起" : "更多选项"}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {!expanded && (
        <div className="flex items-center justify-between rounded-xl bg-secondary p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.regions}</p>
          </div>
          <div className="text-right">
            {currentFee === 0 ? (
              <span className="text-sm font-bold text-emerald-600">包邮</span>
            ) : (
              <span className="text-sm font-bold text-foreground">RM {currentFee}</span>
            )}
            {selected.freeAbove > 0 && currentFee > 0 && (
              <p className="text-[10px] text-muted-foreground">满 RM {selected.freeAbove} 包邮</p>
            )}
          </div>
        </div>
      )}

      {expanded && (
        <div className="space-y-2">
          {enabledTemplates.map((t) => {
            const fee = calcShippingFee(t, totalAmount);
            const isActive = t.id === selected.id;
            return (
              <button
                key={t.id}
                onClick={() => { onSelect(t, fee); setExpanded(false); }}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${
                  isActive ? "border-2 border-gold bg-gold/5" : "border border-border bg-secondary hover:border-gold/30"
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${isActive ? "text-gold" : "text-foreground"}`}>{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.regions}</p>
                  {t.freeAbove > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      满 RM {t.freeAbove} 包邮 {fee === 0 && "✓"}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {fee === 0 ? (
                    <span className="text-sm font-bold text-emerald-600">包邮</span>
                  ) : (
                    <span className="text-sm font-bold text-foreground">RM {fee}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
