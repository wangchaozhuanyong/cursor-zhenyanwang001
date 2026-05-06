import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore, type Address } from "@/stores/useUserStore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AddressManage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { addresses, addressLoading, loadAddresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useUserStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", isDefault: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", phone: "", address: "", isDefault: false });
    setOpen(true);
  };

  const openEdit = (addr: Address) => {
    setEditId(addr.id);
    setForm({ name: addr.name, phone: addr.phone, address: addr.address, isDefault: addr.isDefault });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("请填写完整信息");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateAddress(editId, form);
        toast.success("地址已更新");
      } else {
        await addAddress(form);
        toast.success("地址已添加");
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
            <p className="text-sm">加载中…</p>
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
                      <span className="text-sm font-semibold text-foreground">{addr.name}</span>
                      <span className="text-sm text-muted-foreground">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="theme-rounded bg-[var(--theme-price)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-price)]">默认</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{addr.address}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--theme-border)] pt-3">
                  <button
                    onClick={() => setDefaultAddress(addr.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${addr.isDefault ? "border-[var(--theme-price)] bg-[var(--theme-price)]" : "border-muted-foreground"}`}>
                      {addr.isDefault && <Check size={10} className="text-primary-foreground" />}
                    </div>
                    设为默认
                  </button>
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(addr)} className="text-xs text-muted-foreground">编辑</button>
                    <button onClick={async () => { try { await removeAddress(addr.id); toast.success("已删除"); } catch { toast.error("删除失败"); } }} className="text-xs text-destructive">
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
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="收货人姓名"
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="手机号码"
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="详细地址"
              rows={3}
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
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
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
