import { useState, useEffect, type ReactNode } from "react";
import { Check, Edit3, Home, Loader2, MapPin, Navigation, Phone, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore, type Address } from "@/stores/useUserStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { BottomSheetForm } from "@/modules/micro-interactions";
import { MALAYSIA_STATES } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";
import { THEME_ACCENT_CHIP_CLASS } from "@/utils/themeVisuals";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";
import { usePublicLocale } from "@/i18n/publicLocale";

type AddressForm = Omit<Address, "id">;
const CARD = "rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-[var(--store-card-x)] py-[var(--store-card-y)] shadow-[var(--theme-shadow)] sm:p-4";
const ADDRESS_HERO_IMAGE = "/assets/home-banners/home-hero-05-support-bg.webp";

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
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-3 text-xs font-semibold text-[var(--theme-primary-foreground)]"
    >
      <Plus size={14} aria-hidden />
      {t("address.add")}
    </UnifiedButton>
  );
  const defaultAddress = addresses.find((addr) => addr.isDefault);

  return (
    <>
      <StoreAccountLayout
        title={t("address.title")}
        onBack={goBack}
        rightSlot={addAddressButton}
        className="store-page text-[var(--theme-text)]"
        mainClassName="pb-24 sm:py-4 md:pb-12"
      >
        <section
          className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-5 shadow-[var(--theme-shadow)] sm:px-6 sm:py-6"
          style={{
            backgroundImage: `linear-gradient(112deg, color-mix(in srgb, var(--theme-surface) 98%, transparent) 0%, color-mix(in srgb, var(--theme-surface) 92%, transparent) 48%, color-mix(in srgb, var(--theme-bg) 70%, transparent) 100%), url("${ADDRESS_HERO_IMAGE}")`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem] md:items-stretch">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-3 py-1 text-xs font-semibold text-[var(--theme-primary)]">
                <Navigation size={13} aria-hidden />
                {t("address.addressBook")}
              </span>
              <h2 className="mt-3 text-2xl font-black leading-tight text-[var(--theme-text-on-surface)] sm:text-3xl">
                {defaultAddress ? t("address.defaultReady") : t("address.setupFirst")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--theme-text-muted-on-surface)]">
                {t("address.description")}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <AddressMetric icon={<MapPin size={13} aria-hidden />} label={t("address.addressCount")} value={`${addresses.length}${t("address.addressCountUnit") ? ` ${t("address.addressCountUnit")}` : ""}`} />
                <AddressMetric icon={<Home size={13} aria-hidden />} label={t("address.defaultAddress")} value={defaultAddress ? t("address.set") : t("address.notSet")} />
                <AddressMetric icon={<ShieldCheck size={13} aria-hidden />} label={t("address.deliveryArea")} value="Malaysia" />
              </div>
            </div>
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-surface)_72%,transparent)] p-4 backdrop-blur">
              <p className="text-xs font-semibold text-[var(--theme-text-muted-on-surface)]">{t("address.defaultCheckout")}</p>
              <p className="mt-2 line-clamp-2 text-sm font-black leading-5 text-[var(--theme-text-on-surface)]">
                {defaultAddress ? formatAddressForDisplay(defaultAddress) : t("address.noDefaultFallback")}
              </p>
              <UnifiedButton
                type="button"
                onClick={openAdd}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-bold text-[var(--theme-primary-foreground)]"
              >
                <Plus size={15} aria-hidden />
                {t("address.addAddress")}
              </UnifiedButton>
            </div>
          </div>
        </section>

        {addressLoading && addresses.length === 0 ? (
          <div className="mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-12 text-[var(--theme-text-muted)] shadow-[var(--theme-shadow)]">
            <Loader2 size={24} className="mb-3 animate-spin text-[var(--theme-price)]" aria-label={t("address.loading")} />
            <p className="text-sm">{t("address.loading")}</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="mt-4">
            <ClientEmptyState
              title={t("address.emptyTitle")}
              description={t("address.emptyDescription")}
              icon={<MapPin size={30} />}
              action={
                <ClientButton type="button" onClick={openAdd}>
                  {t("address.addAddress")}
                </ClientButton>
              }
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
            {addresses.map((addr) => (
              <div key={addr.id} className={CARD}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] text-[var(--theme-primary)]">
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
                <div className="mt-3 flex items-center justify-between border-t border-[var(--theme-border)] pt-3">
                  <UnifiedButton
                    type="button"
                    onClick={() => setDefaultAddress(addr.id)}
                    disabled={addr.isDefault}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--theme-border)] px-3 text-xs font-semibold text-[var(--theme-text-muted-on-surface)] disabled:opacity-80"
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${addr.isDefault ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]" : "border-[var(--theme-border)]"}`}>
                      {addr.isDefault && <Check size={10} className="text-[var(--theme-primary-foreground)]" aria-hidden />}
                    </span>
                    {addr.isDefault ? t("address.defaultAddress") : t("address.setDefault")}
                  </UnifiedButton>
                  <div className="flex items-center gap-2">
                    <UnifiedButton type="button" onClick={() => openEdit(addr)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--theme-border)] px-3 text-xs font-semibold text-[var(--theme-text-on-surface)]">
                      <Edit3 size={13} aria-hidden />
                      {t("address.edit")}
                    </UnifiedButton>
                    <UnifiedButton
                      type="button"
                      onClick={async () => {
                        try {
                          await removeAddress(addr.id);
                          toast.success(t("address.deleted"), toastPresetQuickSuccess);
                        } catch {
                          toast.error(t("address.deleteFailed"));
                        }
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--theme-danger)_30%,var(--theme-border))] px-3 text-xs font-semibold text-[var(--theme-danger)]"
                    >
                      <Trash2 size={13} aria-hidden />
                      {t("address.delete")}
                    </UnifiedButton>
                  </div>
                </div>
              </div>
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
        <div className="space-y-3">
          <AddressField label={t("address.recipient")}>
            <input aria-label={t("address.recipient")} value={form.recipient_name} onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))} placeholder={t("address.recipientPlaceholder")} className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30" />
          </AddressField>
          <AddressField label={t("address.phone")}>
            <input aria-label={t("address.phone")} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t("address.phonePlaceholder")} className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30" />
          </AddressField>
          <AddressField label={t("address.line1")}>
            <input aria-label={t("address.line1")} value={form.line1} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} placeholder={t("address.line1Placeholder")} className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30" />
          </AddressField>
          <AddressField label={t("address.line2")}>
            <input aria-label={t("address.line2")} value={form.line2} onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))} placeholder={t("address.line2Placeholder")} className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30" />
          </AddressField>
          <div className="grid grid-cols-2 gap-2">
            <AddressField label={t("address.city")}>
              <input aria-label={t("address.city")} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder={t("address.cityPlaceholder")} className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30" />
            </AddressField>
            <AddressField label={t("address.postcode")}>
              <input aria-label={t("address.postcode")} value={form.postcode} onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))} placeholder={t("address.postcodePlaceholder")} className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30" />
            </AddressField>
          </div>
          <AddressField label={t("address.state")}>
            <select aria-label={t("address.state")} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30">
              {MALAYSIA_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </AddressField>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-3 text-sm font-medium text-[var(--theme-text-on-surface)]">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            {t("address.setDefaultAddress")}
          </label>
        </div>
      </BottomSheetForm>
    </>
  );
}

function AddressMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)] px-2.5 py-2 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--theme-text-muted-on-surface)]">
        <span className="shrink-0 text-[var(--theme-price)]">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-black text-[var(--theme-text-on-surface)]">{value}</p>
    </div>
  );
}

function AddressField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-[var(--theme-text-muted-on-surface)]">{label}</span>
      {children}
    </label>
  );
}
