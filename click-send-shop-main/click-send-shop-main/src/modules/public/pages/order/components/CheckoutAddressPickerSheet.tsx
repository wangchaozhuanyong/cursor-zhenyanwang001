import { Check } from "lucide-react";

import type { Address } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";
import { AppModal } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

type Props = {
  open: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedId: string | null;
  onSelect: (addr: Address) => void;
};

export function CheckoutAddressPickerSheet({ open, onClose, addresses, selectedId, onSelect }: Props) {
  const navigate = useStorefrontNavigate();
  const { localizedPath, t } = usePublicLocale();

  const pick = (addr: Address) => {
    onSelect(addr);
    onClose();
  };

  const footer = (
    <UnifiedButton
      type="button"
      className="sf-next-checkout-secondary-action sf-next-checkout-secondary-action--wide"
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
        <ul className="sf-next-checkout-address-list">
          {addresses.map((addr) => {
            const selected = addr.id === selectedId;
            return (
              <li key={addr.id}>
                <UnifiedButton
                  type="button"
                  onClick={() => pick(addr)}
                  className={cn(
                    "sf-next-checkout-address-option",
                    selected && "is-selected",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--theme-text)]">
                      {addr.recipient_name}
                      <span className="font-normal text-[var(--theme-text-muted)]">{addr.phone}</span>
                      {addr.isDefault ? (
                        <span className="sf-next-checkout-address-default">
                          {t("checkout.addressDefault")}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--theme-text-muted)]">
                      {formatAddressForDisplay(addr)}
                    </span>
                  </span>
                  {selected ? (
                    <span className="sf-next-checkout-address-check">
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
