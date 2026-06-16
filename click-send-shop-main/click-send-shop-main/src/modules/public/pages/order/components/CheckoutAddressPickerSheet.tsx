import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Address } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";
import { AppModal } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale } from "@/i18n/publicLocale";

type Props = {
  open: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedId: string | null;
  onSelect: (addr: Address) => void;
};

export function CheckoutAddressPickerSheet({ open, onClose, addresses, selectedId, onSelect }: Props) {
  const navigate = useNavigate();
  const { localizedPath, t } = usePublicLocale();

  const pick = (addr: Address) => {
    onSelect(addr);
    onClose();
  };

  const footer = (
    <UnifiedButton
      type="button"
      className="flex min-h-12 w-full items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-sm font-semibold text-[var(--theme-text)]"
      onClick={() => {
        onClose();
        navigate(localizedPath("/address"));
      }}
    >
      {t("checkout.addressManage")}
    </UnifiedButton>
  );

  return (
    <AppModal
      tier="form"
      open={open}
      onClose={onClose}
      title={t("checkout.addressPickerTitle")}
      description={t("checkout.addressPickerDescription")}
      height="70vh"
      stickyFooter
      footer={footer}
    >
      {addresses.length === 0 ? (
        <p className="pb-4 text-sm text-[var(--theme-text-muted)]">{t("checkout.addressEmpty")}</p>
      ) : (
        <ul className="space-y-2 pb-2">
          {addresses.map((addr) => {
            const selected = addr.id === selectedId;
            return (
              <li key={addr.id}>
                <UnifiedButton
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
                          {t("checkout.addressDefault")}
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
                </UnifiedButton>
              </li>
            );
          })}
        </ul>
      )}
    </AppModal>
  );
}
