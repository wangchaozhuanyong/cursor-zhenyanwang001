import { MapPin } from "lucide-react";
import type { Address } from "@/types/address";

interface CheckoutAddressCardProps {
  name: string;
  phone: string;
  address: string;
  note: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSelectedAddressChange: (value: Address | null) => void;
  onChooseAddress: () => void;
}

export function CheckoutAddressCard({
  name,
  phone,
  address,
  note,
  onNameChange,
  onPhoneChange,
  onAddressChange,
  onNoteChange,
  onSelectedAddressChange,
  onChooseAddress,
}: CheckoutAddressCardProps) {
  return (
    <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">1. 收货信息</h3>
        <button onClick={onChooseAddress} className="flex items-center gap-1 rounded-full bg-[var(--theme-bg)] px-3 py-1.5 text-xs font-medium text-[var(--theme-price)]">
          <MapPin size={12} /> 选择地址
        </button>
      </div>
      <div className="space-y-3">
        <input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="姓名 *"
          className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
        <input value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder="电话 *" type="tel"
          className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
        <input value={address} onChange={(e) => { onAddressChange(e.target.value); onSelectedAddressChange(null); }} placeholder="收货地址"
          className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
        <textarea value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="备注（可选）" rows={2}
          className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
      </div>
    </div>
  );
}
