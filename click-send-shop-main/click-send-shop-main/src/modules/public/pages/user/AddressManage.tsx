import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore, type Address } from "@/stores/useUserStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { BottomSheetForm } from "@/modules/micro-interactions";
import { MALAYSIA_STATES } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";

type AddressForm = Omit<Address, "id">;
const CARD = "rounded-2xl bg-[var(--theme-surface)] shadow-[var(--theme-shadow)] p-4";

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
  const goBack = useGoBack();
  const { addresses, addressLoading, loadAddresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useUserStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setOpen(true); };
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
      toast.error("请填写完整地址信息");
      throw new Error("validation");
    }
    if (!isValidMyPhone(form.phone)) {
      toast.error("手机号格式不正确，请输入马来西亚手机号");
      throw new Error("validation");
    }
    if (!isValidMyPostcode(form.postcode)) {
      toast.error("邮编格式不正确，需要 5 位数字");
      throw new Error("validation");
    }
    setSaving(true);
    try {
      if (editId) {
        await updateAddress(editId, form);
        toast.success("地址已更新", toastPresetQuickSuccess);
      } else {
        await addAddress(form);
        toast.success("地址已添加", toastPresetQuickSuccess);
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="store-page min-h-screen text-[var(--theme-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)]"><ArrowLeft size={20} /></button>
            <h1 className="text-base font-semibold">收货地址</h1>
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"><Plus size={14} />新增</button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4 pb-24">
        {addressLoading ? (
          <div className="flex flex-col items-center py-20 text-[var(--theme-muted)]"><Loader2 size={24} className="mb-3 animate-spin" /><p className="text-sm">加载中...</p></div>
        ) : addresses.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center py-12`}>
            <MapPin size={40} className="text-[var(--theme-muted)]" />
            <p className="mt-3 text-sm text-[var(--theme-muted)]">暂无收货地址</p>
            <button onClick={openAdd} className="mt-4 rounded-full bg-[var(--theme-primary)] px-6 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]">添加地址</button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className={CARD}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{addr.recipient_name}</span>
                      <span className="text-sm text-[var(--theme-muted)]">{addr.phone}</span>
                      {addr.isDefault && <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-secondary)_18%,white)] px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-secondary)]">默认</span>}
                    </div>
                    <p className="mt-1 text-xs text-[var(--theme-muted)]">{formatAddressForDisplay(addr)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--theme-border)] pt-3">
                  <button onClick={() => setDefaultAddress(addr.id)} className="flex items-center gap-1 text-xs text-[var(--theme-muted)]">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${addr.isDefault ? "border-[var(--theme-secondary)] bg-[var(--theme-secondary)]" : "border-[var(--theme-border)]"}`}>
                      {addr.isDefault && <Check size={10} className="text-white" />}
                    </div>
                    设为默认
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(addr)} className="text-xs text-[var(--theme-muted)]">编辑</button>
                    <button onClick={async () => { try { await removeAddress(addr.id); toast.success("已删除", toastPresetQuickSuccess); } catch { toast.error("删除失败"); } }} className="text-xs text-[var(--theme-danger)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomSheetForm
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "编辑地址" : "新增地址"}
        description="请填写马来西亚标准地址：州 / 城市 / 邮编。"
        submitText="保存"
        loading={saving}
        onSubmit={handleSave}
        height="90vh"
      >
        <div className="space-y-3">
            <input value={form.recipient_name} onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))} placeholder="收货人姓名" className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none" />
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="手机号（如 0123456789）" className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none" />
            <input value={form.line1} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} placeholder="地址行 1（门牌号、街道）" className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none" />
            <input value={form.line2} onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))} placeholder="地址行 2（可选）" className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="城市" className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none" />
              <input value={form.postcode} onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))} placeholder="邮编（5位）" className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none" />
            </div>
            <select value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="h-11 w-full rounded-lg bg-[var(--theme-bg)] px-4 text-sm ring-1 ring-[var(--theme-border)] outline-none">
              {MALAYSIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
              设为默认地址
            </label>
        </div>
      </BottomSheetForm>
    </div>
  );
}
