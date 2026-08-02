import { useId, useRef, useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import type { Address } from "@/types/address";
import { AppModal, SquishButton, usePreferBottomSheet } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { validatePhoneForCountry } from "@/utils/authValidation";

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

type CheckoutAddressField = "name" | "phone" | "address";
type CheckoutAddressErrors = Partial<Record<CheckoutAddressField, string>>;

function validateAddressFields(name: string, phone: string, address: string): CheckoutAddressErrors {
  const errors: CheckoutAddressErrors = {};
  if (!name.trim()) errors.name = "请填写收货人姓名";
  if (!phone.trim()) {
    errors.phone = "请填写联系电话";
  } else {
    const phoneError = validatePhoneForCountry(phone, "+60");
    if (phoneError) errors.phone = phoneError;
  }
  if (!address.trim()) errors.address = "请填写收货地址";
  return errors;
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
  const [fieldErrors, setFieldErrors] = useState<CheckoutAddressErrors>({});
  const fieldId = useId();
  const formId = `checkout-address-form-${fieldId}`;
  const nameInputId = `checkout-address-name-${fieldId}`;
  const phoneInputId = `checkout-address-phone-${fieldId}`;
  const addressInputId = `checkout-address-line-${fieldId}`;
  const nameErrorId = `${nameInputId}-error`;
  const phoneErrorId = `${phoneInputId}-error`;
  const addressErrorId = `${addressInputId}-error`;
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const inputClass = "sf-next-checkout-form-control";

  const hasContact = Boolean(name.trim() && phone.trim());
  const hasAddress = Boolean(address.trim());
  const addressSummary = hasContact ? `${name}  ${phone}` : "请选择收货信息";
  const addressLine = hasAddress ? address : "添加收货地址后才能提交订单";

  const closeEditor = () => {
    setFieldErrors({});
    setAddressSheetOpen(false);
  };

  const openAddressBook = () => {
    closeEditor();
    onChooseAddress();
  };

  const openEditor = () => {
    setFieldErrors({});
    setAddressSheetOpen(true);
  };

  const clearFieldError = (field: CheckoutAddressField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const completeEditor = () => {
    const nextErrors = validateAddressFields(name, phone, address);
    setFieldErrors(nextErrors);

    if (nextErrors.name) {
      nameInputRef.current?.focus();
      return;
    }
    if (nextErrors.phone) {
      phoneInputRef.current?.focus();
      return;
    }
    if (nextErrors.address) {
      addressInputRef.current?.focus();
      return;
    }

    setAddressSheetOpen(false);
  };

  return (
    <div className="sf-next-checkout-card">
      <div className="sf-next-checkout-card__head">
        <div className="sf-next-checkout-address-copy">
          <h2 className="sf-next-checkout-section-title">收货信息</h2>
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
          <ChevronRight size={12} className="shrink-0" aria-hidden />
        </UnifiedButton>
      </div>

      {!hasContact || !hasAddress ? (
        <div className="sf-next-checkout-notice sf-next-checkout-notice--danger">
          请先补全收货信息，提交按钮会自动可用。
        </div>
      ) : null}

      <AppModal
        tier="form"
        open={addressSheetOpen}
        onClose={closeEditor}
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
              <MapPin size={14} aria-hidden /> 地址簿
            </UnifiedButton>
            <SquishButton
              type="submit"
              form={formId}
              variant="gold"
              className="sf-next-checkout-primary-action"
            >
              完成
            </SquishButton>
          </div>
        }
      >
        <form
          id={formId}
          className="sf-next-checkout-form-stack"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            completeEditor();
          }}
        >
          <div className="sf-next-checkout-form-field">
            <label className="sf-next-checkout-form-label" htmlFor={nameInputId}>
              收货人姓名 <span aria-hidden>*</span>
            </label>
            <input
              ref={nameInputRef}
              id={nameInputId}
              name="name"
              value={name}
              onChange={(event) => {
                onNameChange(event.target.value);
                clearFieldError("name");
              }}
              placeholder="请输入收货人姓名"
              autoComplete="shipping name"
              required
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.name) || undefined}
              aria-describedby={fieldErrors.name ? nameErrorId : undefined}
              className={inputClass}
            />
            {fieldErrors.name ? <p id={nameErrorId} className="sf-next-checkout-field-error" role="alert">{fieldErrors.name}</p> : null}
          </div>

          <div className="sf-next-checkout-form-field">
            <label className="sf-next-checkout-form-label" htmlFor={phoneInputId}>
              联系电话 <span aria-hidden>*</span>
            </label>
            <input
              ref={phoneInputRef}
              id={phoneInputId}
              name="tel"
              value={phone}
              onChange={(event) => {
                onPhoneChange(event.target.value);
                clearFieldError("phone");
              }}
              placeholder="请输入马来西亚手机号"
              type="tel"
              inputMode="tel"
              autoComplete="shipping tel"
              required
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.phone) || undefined}
              aria-describedby={fieldErrors.phone ? phoneErrorId : undefined}
              className={inputClass}
            />
            {fieldErrors.phone ? <p id={phoneErrorId} className="sf-next-checkout-field-error" role="alert">{fieldErrors.phone}</p> : null}
          </div>

          <div className="sf-next-checkout-form-field">
            <label className="sf-next-checkout-form-label" htmlFor={addressInputId}>
              收货地址 <span aria-hidden>*</span>
            </label>
            <input
              ref={addressInputRef}
              id={addressInputId}
              name="street-address"
              value={address}
              onChange={(event) => {
                onAddressChange(event.target.value);
                onSelectedAddressChange(null);
                clearFieldError("address");
              }}
              placeholder="请输入完整收货地址"
              autoComplete="shipping street-address"
              required
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.address) || undefined}
              aria-describedby={fieldErrors.address ? addressErrorId : undefined}
              className={inputClass}
            />
            {fieldErrors.address ? <p id={addressErrorId} className="sf-next-checkout-field-error" role="alert">{fieldErrors.address}</p> : null}
          </div>
        </form>
      </AppModal>
    </div>
  );
}
