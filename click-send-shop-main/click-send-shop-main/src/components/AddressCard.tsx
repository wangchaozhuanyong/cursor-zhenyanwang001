import { Check, MapPin } from "lucide-react";
import type { Address } from "@/stores/useUserStore";

interface AddressCardProps {
  address: Address;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function AddressCard({ address, selected, onClick, compact }: AddressCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected ? "border-gold bg-gold/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <MapPin size={16} className={selected ? "mt-0.5 text-gold" : "mt-0.5 text-muted-foreground"} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{address.name}</span>
            <span className="text-xs text-muted-foreground">{address.phone}</span>
            {address.isDefault && (
              <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold">默认</span>
            )}
          </div>
          {!compact && <p className="mt-1 text-xs text-muted-foreground">{address.address}</p>}
        </div>
        {selected && <Check size={16} className="mt-0.5 text-gold" />}
      </div>
    </button>
  );
}
