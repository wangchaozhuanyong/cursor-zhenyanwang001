import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore, type Address } from "@/stores/useUserStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MALAYSIA_STATES } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";

type AddressForm = Omit<Address, "id">;

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
      toast.error("请填写完整地址信息");
      return;
    }
    if (!isValidMyPhone(form.phone)) {
      toast.error("手机号格式不正确，请输入马来西亚手机号");
      return;
    }
    if (!isValidMyPostcode(form.postcode)) {
      toast.error("邮编格式不正确，需为 5 位数字");
      return;
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
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <header className="sticky top-0 z-40 bg-[var(--theme-surface)]/95 px-4 py-3 backdrop-blur-md border-b border-[var(--theme-border)]">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack}>
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="text-base font-semibold text-foreground">收货地址</h1>
          </div>
          <button onClick={openAdd} className="flex items-center gap-1 text-sm text-[var(--theme-price)]">
            <Plus size={16} /> 新增
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        {addressLoading ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Loader2 size={24} className="animate-spin mb-3" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <MapPin size={40} className="text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">暂无收货地址</p>
            <button onClick={openAdd} className="mt-4 rounded-full px-6 py-2 text-sm font-semibold text-white" style={{ background: "var(--theme-gradient)" }}>
              添加地址
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{addr.recipient_name}</span>
                      <span className="text-sm text-muted-foreground">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="theme-rounded bg-[var(--theme-price)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-price)]">默认</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatAddressForDisplay(addr)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--theme-border)] pt-3">
                  <button onClick={() => setDefaultAddress(addr.id)} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${addr.isDefault ? "border-[var(--theme-price)] bg-[var(--theme-price)]" : "border-muted-foreground"}`}>
                      {addr.isDefault && <Check size={10} className="text-primary-foreground" />}
                    </div>
                    设为默认
                  </button>
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(addr)} className="text-xs text-muted-foreground">编辑</button>
                    <button
                      onClick={async () => {
                        try {
                          await removeAddress(addr.id);
                          toast.success("已删除", toastPresetQuickSuccess);
                        } catch {
                          toast.error("删除失败");
                        }
                      }}
                      className="text-xs text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? "编辑地址" : "新增地址"}</DialogTitle>
            <DialogDescription>用于结账收货，请确保州、城市与邮编填写正确。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input
              value={form.recipient_name}
              onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
              placeholder="收货人姓名"
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="手机号码（如 0123456789）"
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <input
              value={form.line1}
              onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
              placeholder="地址行 1（门牌号、街道）"
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <input
              value={form.line2}
              onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
              placeholder="地址行 2（可选）"
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="城市"
                className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <input
                value={form.postcode}
                onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
                placeholder="邮编（5位）"
                className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none"
            >
              {MALAYSIA_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-gold"
              />
              设为默认地址
            </label>
            <button onClick={handleSave} disabled={saving} className="w-full rounded-full py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "var(--theme-gradient)" }}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
