import { useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import type { Address } from "@/types/address";
import { AppModal, SquishButton, usePreferBottomSheet } from "@/modules/micro-interactions";

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
  const isMobileSheet = usePreferBottomSheet("standard");
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);

  const inputClass =
    "w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground";

  const addressSummary =
    [name, phone].filter(Boolean).join(" · ") || "请填写收货人信息";
  const addressLine = address || "请填写详细收货地址";

  const openAddressBook = () => {
    setAddressSheetOpen(false);
    onChooseAddress();
  };

  return (
    <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--theme-price)] text-xs font-bold text-white">1</span>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">收货信息</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">用于配送员联系和确认送达地址</p>
          </div>
        </div>
        {!isMobileSheet ? (
          <button
            type="button"
            onClick={onChooseAddress}
            className="flex items-center gap-1 rounded-full bg-[var(--theme-bg)] px-3 py-1.5 text-xs font-medium text-[var(--theme-price)]"
          >
            <MapPin size={12} /> 选择地址
          </button>
        ) : null}
      </div>

      {isMobileSheet ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setAddressSheetOpen(true)}
            className="flex w-full items-center justify-between gap-2 rounded-xl bg-secondary px-4 py-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">收货人</p>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">{addressSummary}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{addressLine}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => setNoteSheetOpen(true)}
            className="flex w-full items-center justify-between gap-2 rounded-xl bg-secondary px-4 py-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">订单备注</p>
              <p className={note ? "mt-0.5 truncate text-sm text-foreground" : "mt-0.5 text-sm text-muted-foreground"}>
                {note || "选填，可备注配送要求"}
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </button>

          <AppModal
            tier="form"
            open={addressSheetOpen}
            onClose={() => setAddressSheetOpen(false)}
            title="编辑收货信息"
            height="auto"
            stickyFooter
            footer={
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openAddressBook}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm font-semibold text-[var(--theme-text)]"
                >
                  地址簿
                </button>
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
                placeholder="收货地址 *"
                className={inputClass}
              />
            </div>
          </AppModal>

          <AppModal
            tier="form"
            open={noteSheetOpen}
            onClose={() => setNoteSheetOpen(false)}
            title="订单备注"
            height="auto"
            stickyFooter
            footer={
              <SquishButton
                type="button"
                variant="gold"
                className="min-h-12 w-full rounded-full text-sm font-semibold"
                onClick={() => setNoteSheetOpen(false)}
              >
                完成
              </SquishButton>
            }
          >
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="选填，可备注配送要求、门禁信息等"
              rows={4}
              className={inputClass}
            />
          </AppModal>
        </div>
      ) : (
        <div className="space-y-3">
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
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="备注（可选）"
            rows={2}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
