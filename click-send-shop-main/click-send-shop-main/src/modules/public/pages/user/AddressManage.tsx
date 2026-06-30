import { useState, useEffect, type ReactNode } from "react";
import { Check, Edit3, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore, type Address } from "@/stores/useUserStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { BottomSheetConfirm, BottomSheetForm } from "@/modules/micro-interactions";
import { MALAYSIA_STATES } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";
import { THEME_ACCENT_CHIP_CLASS } from "@/utils/themeVisuals";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale } from "@/i18n/publicLocale";
import "@/styles/secondary-routes.css";

type AddressForm = Omit<Address, "id">;
const CARD = "sf-next-address-card";
const FORM_CONTROL = "sf-next-address-control";

const EMPTY_FORM: AddressForm = {
  recipient_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: MALAYSIA_STATES[0],
  postcode: "",
  country: "MY",
  isDefault: false,
};

function isValidMyPhone(phone: string): boolean {
  return /^(\+?60|0)1\d{7,9}$/.test(phone.replace(/[\s-]/g, ""));
}
function isValidMyPostcode(postcode: string): boolean {
  return /^\d{5}$/.test(postcode.trim());
}

export default function AddressManage() {
  const { localizedPath, t } = usePublicLocale();
  const goBack = useGoBack(localizedPath("/profile"));
  const { addresses, addressLoading, loadAddresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useUserStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (addr: Address) => {
    setEditId(addr.id);
    setForm({
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || "",
      city: addr.city,
      state: addr.state || MALAYSIA_STATES[0],
      postcode: addr.postcode,
      country: "MY",
      isDefault: addr.isDefault,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.recipient_name.trim() || !form.phone.trim() || !form.line1.trim() || !form.city.trim() || !form.state.trim() || !form.postcode.trim()) {
      toast.error(t("address.missing"));
      throw new Error("validation");
    }
    if (!isValidMyPhone(form.phone)) {
      toast.error(t("address.phoneInvalid"));
      throw new Error("validation");
    }
    if (!isValidMyPostcode(form.postcode)) {
      toast.error(t("address.postcodeInvalid"));
      throw new Error("validation");
    }
    setSaving(true);
    try {
      if (editId) {
        await updateAddress(editId, form);
        toast.success(t("address.updated"), toastPresetQuickSuccess);
      } else {
        await addAddress(form);
        toast.success(t("address.added"), toastPresetQuickSuccess);
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("address.operationFailed"));
    } finally {
      setSaving(false);
    }
  };

  const addAddressButton = (
    <UnifiedButton
      type="button"
      onClick={openAdd}
      aria-label={t("address.addAddress")}
      className="sf-next-address-add-button sf-next-address-add-button--header"
    >
      <Plus size={14} aria-hidden />
      <span className="sf-next-address-add-button__label">{t("address.add")}</span>
    </UnifiedButton>
  );
  return (
    <>
      <StoreAccountLayout
        title={t("address.title")}
        onBack={goBack}
        rightSlot={addAddressButton}
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-address-page text-[var(--theme-text)]"
        mainClassName="sf-next-account-main pb-24 sm:py-4 md:pb-12"
      >
        {addressLoading && addresses.length === 0 ? (
          <AddressLoadingSkeleton label={t("address.loading")} />
        ) : addresses.length === 0 ? (
          <section className="sf-next-state-panel sf-next-address-empty">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <MapPin size={28} />
            </span>
            <h2>{t("address.emptyTitle")}</h2>
            <p>{t("address.emptyDescription")}</p>
            <UnifiedButton type="button" onClick={openAdd} className="sf-next-state-panel__primary">
              <Plus size={17} aria-hidden />
              {t("address.addAddress")}
            </UnifiedButton>
          </section>
        ) : (
          <div className="sf-next-address-list space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
            {addresses.map((addr) => (
              <article key={addr.id} className={CARD}>
                <div className="flex items-start gap-3">
                  <div className="sf-next-address-pin">
                    <MapPin size={20} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-[var(--theme-text-on-surface)]">{addr.recipient_name}</span>
                      {addr.isDefault && <span className={THEME_ACCENT_CHIP_CLASS}>{t("address.defaultAddress")}</span>}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--theme-text-muted-on-surface)]">
                      <Phone size={12} aria-hidden />
                      {addr.phone}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--theme-text-on-surface)]">{formatAddressForDisplay(addr)}</p>
                  </div>
                </div>
                <div className="sf-next-address-card__actions">
                  <UnifiedButton
                    type="button"
                    onClick={() => setDefaultAddress(addr.id)}
                    disabled={addr.isDefault}
                    className="sf-next-address-action sf-next-address-action--default"
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${addr.isDefault ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]" : "border-[var(--theme-border)]"}`}>
                      {addr.isDefault && <Check size={10} className="text-[var(--theme-primary-foreground)]" aria-hidden />}
                    </span>
                    {addr.isDefault ? t("address.defaultAddress") : t("address.setDefault")}
                  </UnifiedButton>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <UnifiedButton type="button" onClick={() => openEdit(addr)} className="sf-next-address-action sf-next-address-action--edit">
                      <Edit3 size={13} aria-hidden />
                      {t("address.edit")}
                    </UnifiedButton>
                    <UnifiedButton
                      type="button"
                      onClick={() => setDeleteTarget(addr)}
                      className="sf-next-address-action sf-next-address-action--delete"
                    >
                      <Trash2 size={13} aria-hidden />
                      {t("address.delete")}
                    </UnifiedButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </StoreAccountLayout>

      <BottomSheetForm
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? t("address.editAddress") : t("address.addAddress")}
        description={t("address.formDescription")}
        submitText={t("address.save")}
        loading={saving}
        onSubmit={handleSave}
        height="90vh"
      >
        <div className="sf-next-address-form">
          <AddressField label={t("address.recipient")}>
            <input aria-label={t("address.recipient")} value={form.recipient_name} onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))} placeholder={t("address.recipientPlaceholder")} className={FORM_CONTROL} />
          </AddressField>
          <AddressField label={t("address.phone")}>
            <input aria-label={t("address.phone")} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t("address.phonePlaceholder")} className={FORM_CONTROL} />
          </AddressField>
          <AddressField label={t("address.line1")}>
            <input aria-label={t("address.line1")} value={form.line1} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} placeholder={t("address.line1Placeholder")} className={FORM_CONTROL} />
          </AddressField>
          <AddressField label={t("address.line2")}>
            <input aria-label={t("address.line2")} value={form.line2} onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))} placeholder={t("address.line2Placeholder")} className={FORM_CONTROL} />
          </AddressField>
          <div className="sf-next-address-form-grid">
            <AddressField label={t("address.city")}>
              <input aria-label={t("address.city")} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder={t("address.cityPlaceholder")} className={FORM_CONTROL} />
            </AddressField>
            <AddressField label={t("address.postcode")}>
              <input aria-label={t("address.postcode")} value={form.postcode} onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))} placeholder={t("address.postcodePlaceholder")} className={FORM_CONTROL} />
            </AddressField>
          </div>
          <AddressField label={t("address.state")}>
            <select aria-label={t("address.state")} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={FORM_CONTROL}>
              {MALAYSIA_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </AddressField>
          <label className="sf-next-address-default-toggle">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            {t("address.setDefaultAddress")}
          </label>
        </div>
      </BottomSheetForm>

      <BottomSheetConfirm
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("address.deleteConfirmTitle")}
        description={
          deleteTarget
            ? `${t("address.deleteConfirmDescriptionPrefix")}「${deleteTarget.recipient_name}」${t("address.deleteConfirmDescriptionSuffix")}`
            : undefined
        }
        confirmText={t("address.delete")}
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await removeAddress(deleteTarget.id);
            toast.success(t("address.deleted"), toastPresetQuickSuccess);
          } catch (error) {
            toast.error(t("address.deleteFailed"));
            throw error;
          }
        }}
      />
    </>
  );
}

function AddressField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="sf-next-address-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function AddressLoadingSkeleton({ label }: { label: string }) {
  return (
    <section className="sf-next-address-loading" aria-busy="true" aria-label={label}>
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={index} className="sf-next-address-loading-card">
          <div className="sf-next-skeleton sf-next-address-loading-pin" />
          <div className="sf-next-address-loading-copy">
            <div className="sf-next-skeleton sf-next-address-loading-line is-title" />
            <div className="sf-next-skeleton sf-next-address-loading-line is-phone" />
            <div className="sf-next-skeleton sf-next-address-loading-line is-address" />
          </div>
          <div className="sf-next-address-loading-actions">
            <div className="sf-next-skeleton sf-next-address-loading-action" />
            <div className="sf-next-skeleton sf-next-address-loading-action" />
          </div>
        </article>
      ))}
      <span className="sr-only">{label}</span>
    </section>
  );
}
