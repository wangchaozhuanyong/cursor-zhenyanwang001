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

  const inputClass = "sf-next-checkout-form-control";

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
    <div className="sf-next-checkout-card">
      <div className="sf-next-checkout-card__head">
        <div className="sf-next-checkout-address-copy">
          <h3 className="sf-next-checkout-section-title">收货信息</h3>
          <p className="sf-next-checkout-address-name">{addressSummary}</p>
          <p
            className="sf-next-checkout-address-line"
            style={{ WebkitTextDecorationLine: "none", textDecorationLine: "none" }}
          >
            {addressLine}
          </p>
        </div>
        <UnifiedButton
          type="button"
          onClick={openEditor}
          className="sf-next-checkout-link-action"
        >
          <span>{hasContact && hasAddress ? "修改" : "填写"}</span>
          <ChevronRight size={12} className="shrink-0" />
        </UnifiedButton>
      </div>

      {!hasAddress ? (
        <div className="sf-next-checkout-notice sf-next-checkout-notice--danger">
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
          <div className="sf-next-checkout-modal-actions">
            <UnifiedButton
              type="button"
              onClick={openAddressBook}
              className="sf-next-checkout-secondary-action"
            >
              <MapPin size={14} /> 地址簿
            </UnifiedButton>
            <SquishButton
              type="button"
              variant="gold"
              className="sf-next-checkout-primary-action"
              onClick={() => setAddressSheetOpen(false)}
            >
              完成
            </SquishButton>
          </div>
        }
      >
        <div className="sf-next-checkout-form-stack">
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
