import { useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import type { Address } from "@/types/address";
import { AppModal, SquishButton, usePreferBottomSheet } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface CheckoutAddressCardProps {
  name: string;
  phone: string;
  address: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onSelectedAddressChange: (value: Address | null) => void;
  onChooseAddress: () => void;
}

export function CheckoutAddressCard({
  name,
  phone,
  address,
  onNameChange,
  onPhoneChange,
  onAddressChange,
  onSelectedAddressChange,
  onChooseAddress,
}: CheckoutAddressCardProps) {
  const isMobileSheet = usePreferBottomSheet("standard");
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3.5 text-sm text-foreground outline-none ring-[var(--theme-primary)] focus:ring-2 placeholder:text-muted-foreground";

  const hasContact = Boolean(name.trim() && phone.trim());
  const hasAddress = Boolean(address.trim());
  const addressSummary = hasContact ? `${name}  ${phone}` : "请选择收货信息";
  const addressLine = hasAddress ? address : "添加收货地址后才能提交订单";

  const openAddressBook = () => {
    setAddressSheetOpen(false);
    onChooseAddress();
  };

  const openEditor = () => setAddressSheetOpen(true);

  return (
    <div className="store-checkout-card rounded-[20px] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[var(--theme-surface)] p-4 shadow-[0_14px_38px_rgba(65,45,28,0.08)] md:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-foreground md:text-base">收货信息</h3>
          <p className="mt-2 truncate text-sm font-semibold leading-5 text-foreground">{addressSummary}</p>
          <p
            className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground no-underline md:text-sm"
            style={{ WebkitTextDecorationLine: "none", textDecorationLine: "none" }}
          >
            {addressLine}
          </p>
        </div>
        <UnifiedButton
          type="button"
          onClick={openEditor}
          className="inline-flex min-h-9 w-14 shrink-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-full px-0 text-xs font-semibold leading-none text-[var(--theme-price)] hover:bg-[color-mix(in_srgb,var(--theme-price)_9%,transparent)]"
        >
          <span>{hasContact && hasAddress ? "修改" : "填写"}</span>
          <ChevronRight size={12} className="shrink-0" />
        </UnifiedButton>
      </div>

      {!hasAddress ? (
        <div className="mt-3 rounded-2xl bg-[color-mix(in_srgb,var(--theme-price)_8%,var(--theme-surface))] px-3 py-2 text-xs text-[var(--theme-price)]">
          请先补全收货信息，提交按钮会自动可用。
        </div>
      ) : null}

      <AppModal
        tier="form"
        open={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
        title="编辑收货信息"
        height={isMobileSheet ? "auto" : "70vh"}
        stickyFooter
        footer={
          <div className="grid grid-cols-2 gap-2">
            <UnifiedButton
              type="button"
              onClick={openAddressBook}
              className="inline-flex min-h-12 items-center justify-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm font-semibold text-[var(--theme-text)]"
            >
              <MapPin size={14} /> 地址簿
            </UnifiedButton>
            <SquishButton
              type="button"
              variant="gold"
              className="min-h-12 w-full rounded-full text-sm font-semibold"
              onClick={() => setAddressSheetOpen(false)}
            >
              完成
            </SquishButton>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="姓名 *"
            className={inputClass}
          />
          <input
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="电话 *"
            type="tel"
            className={inputClass}
          />
          <input
            value={address}
            onChange={(e) => {
              onAddressChange(e.target.value);
              onSelectedAddressChange(null);
            }}
            placeholder="收货地址"
            className={inputClass}
          />
        </div>
      </AppModal>
    </div>
  );
}
