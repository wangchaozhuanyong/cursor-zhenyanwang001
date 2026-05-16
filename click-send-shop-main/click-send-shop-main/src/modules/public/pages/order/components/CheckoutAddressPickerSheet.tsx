import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Address } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";
import { ResponsiveSheet } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedId: string | null;
  onSelect: (addr: Address) => void;
};

export function CheckoutAddressPickerSheet({ open, onClose, addresses, selectedId, onSelect }: Props) {
  const navigate = useNavigate();

  const pick = (addr: Address) => {
    onSelect(addr);
    onClose();
  };

  const footer = (
    <button
      type="button"
      className="flex min-h-12 w-full items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-sm font-semibold text-[var(--theme-text)]"
      onClick={() => {
        onClose();
        navigate("/address");
      }}
    >
      管理收货地址
    </button>
  );

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title="选择收货地址"
      description="选择后将自动填入结算信息"
      height="70vh"
      stickyFooter
      footer={footer}
    >
      {addresses.length === 0 ? (
        <p className="pb-4 text-sm text-[var(--theme-text-muted)]">暂无保存的地址，请点击下方添加。</p>
      ) : (
        <ul className="space-y-2 pb-2">
          {addresses.map((addr) => {
            const selected = addr.id === selectedId;
            return (
              <li key={addr.id}>
                <button
                  type="button"
                  onClick={() => pick(addr)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3.5 text-left",
                    selected
                      ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)]"
                      : "border-[var(--theme-border)] bg-[var(--theme-bg)]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--theme-text)]">
                      {addr.recipient_name}
                      <span className="font-normal text-[var(--theme-text-muted)]">{addr.phone}</span>
                      {addr.isDefault ? (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-primary)]">
                          默认
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--theme-text-muted)]">
                      {formatAddressForDisplay(addr)}
                    </span>
                  </span>
                  {selected ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ResponsiveSheet>
  );
}
