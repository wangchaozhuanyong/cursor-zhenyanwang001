import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus, Trash2, Edit2, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as shippingService from "@/services/admin/shippingService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { ShippingTemplate } from "@/types/shipping";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { LoadingButton } from "@/modules/micro-interactions";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_HOVER_TEXT_DANGER } from "@/utils/themeVisuals";

export default function AdminShipping() {
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const [editing, setEditing] = useState<ShippingTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", regions: "", baseFee: 0, freeAbove: 0, extraPerKg: 0 });
  const [saving, setSaving] = useState(false);

  const templatesQuery = useQuery({
    queryKey: adminQueryKeys.shippingTemplates(),
    queryFn: shippingService.fetchTemplates,
    staleTime: 60_000,
  });

  const templates = templatesQuery.data ?? [];
  const loading = templatesQuery.isLoading && !templatesQuery.data;

  const invalidateShipping = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.shippingRoot() });

  const handleSave = async () => {
    if (!form.name || !form.regions) { toast.error("请填写完整信息"); return; }
    setSaving(true);
    try {
      if (editing) {
        await shippingService.updateTemplate(editing.id, { name: form.name, regions: form.regions, baseFee: form.baseFee, freeAbove: form.freeAbove, extraPerKg: form.extraPerKg });
        toast.success("运费模板已更新");
      } else {
        const makeDefault = templates.length === 0;
        await shippingService.createTemplate({
          name: form.name,
          regions: form.regions,
          baseFee: form.baseFee,
          freeAbove: form.freeAbove,
          extraPerKg: form.extraPerKg,
          enabled: true,
          isDefault: makeDefault,
        });
        toast.success(makeDefault ? "运费模板已创建并设为默认生效" : "运费模板已创建，可在列表中设为默认生效");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", regions: "", baseFee: 0, freeAbove: 0, extraPerKg: 0 });
      await invalidateShipping();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (t: ShippingTemplate) => {
    setEditing(t);
    setForm({ name: t.name, regions: t.regions, baseFee: t.baseFee, freeAbove: t.freeAbove, extraPerKg: t.extraPerKg });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await shippingService.deleteTemplate(id);
      await invalidateShipping();
      toast.success("已删除");
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除失败"));
    }
  };

  const handleSetDefault = async (id: number) => {
    const t = templates.find((x) => x.id === id);
    if (!t || t.isDefault) return;
    try {
      await shippingService.updateTemplate(id, { isDefault: true });
      await invalidateShipping();
      toast.success(`「${t.name}」已设为默认生效，其他模板已自动停用`);
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <AdminPageTitle
            title={<Tx>运费规则设置</Tx>}
            hint={(
              <>
                <p><Tx>配置配送区域和运费模板</Tx></p>
                <p className="mt-1"><Tx>同一时间仅允许一个「默认生效」模板；设为默认后，结账与运费计算将使用该规则，其他模板自动停用。</Tx></p>
              </>
            )}
          />
        </div>
        <PermissionGate permission="shipping.manage">
          <button onClick={() => { setEditing(null); setForm({ name: "", regions: "", baseFee: 0, freeAbove: 0, extraPerKg: 0 }); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus size={16} /><Tx> 新建模板
          </Tx></button>
        </PermissionGate>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="skeleton-base skeleton-shimmer h-5 w-32 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-24 rounded" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="skeleton-base skeleton-shimmer h-12 rounded-xl" />
                  <div className="skeleton-base skeleton-shimmer h-12 rounded-xl" />
                  <div className="skeleton-base skeleton-shimmer h-12 rounded-xl" />
                </div>
              </div>
            ))
          : null}
        {!loading && templates.map((t) => (
          <div key={t.id} className={`rounded-2xl border bg-card p-5 transition-all ${t.isDefault ? "border-gold/40 ring-1 ring-gold/20" : "border-border opacity-75"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Truck size={18} className={t.isDefault ? "text-theme-price" : "text-muted-foreground"} />
                <h3 className="font-bold text-foreground">{t.name}</h3>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.isDefault ? THEME_BADGE_SUCCESS : THEME_BADGE_MUTED}`}>
                {t.isDefault ? "默认生效" : "未生效"}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} /> {t.regions || "全国"}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground"><Tx>基础运费</Tx></p>
                <p className="font-bold text-foreground">RM {t.baseFee}</p>
              </div>
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground"><Tx>包邮门槛</Tx></p>
                <p className="font-bold text-foreground">RM {t.freeAbove}</p>
              </div>
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground"><Tx>续重/kg</Tx></p>
                <p className="font-bold text-foreground">RM {t.extraPerKg}</p>
              </div>
            </div>
            <PermissionGate permission="shipping.manage">
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(t)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary">
                  <Edit2 size={12} /><Tx> 编辑
                </Tx></button>
                <button
                  type="button"
                  onClick={() => adminConfirmDelete(confirm, t.name, () => handleDelete(t.id))}
                  className={`flex items-center justify-center rounded-xl border border-border px-3 py-2 text-muted-foreground ${THEME_HOVER_TEXT_DANGER} hover:bg-secondary`}
                >
                  <Trash2 size={12} />
                </button>
                {!t.isDefault ? (
                  <button
                    type="button"
                    onClick={() =>
                      confirm({
                        title: "设为默认生效",
                        description: `将「${t.name}」设为默认运费模板？当前默认模板将自动停用。`,
                        confirmText: "设为默认",
                        onConfirm: () => handleSetDefault(t.id),
                      })
                    }
                    className="flex-1 rounded-xl border border-gold/40 bg-gold/10 py-2 text-xs font-semibold text-theme-price hover:bg-gold/20"
                  >
                    设为默认生效
                  </button>
                ) : (
                  <span className="flex flex-1 items-center justify-center rounded-xl border border-border bg-secondary/50 py-2 text-xs text-muted-foreground">
                    当前默认
                  </span>
                )}
              </div>
            </PermissionGate>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-2 py-12 text-center text-sm text-muted-foreground"><Tx>暂无运费模板，点击上方按钮创建</Tx></div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground">{editing ? "编辑运费模板" : "新建运费模板"}</h3>
            <input placeholder="模板名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            <input placeholder="适用区域（如：雪兰莪、吉隆坡）" value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            <div className="grid grid-cols-3 gap-3">
              <label className="block"><span className="text-xs text-muted-foreground"><Tx>基础运费</Tx></span><input type="number" value={form.baseFee} onChange={(e) => setForm({ ...form, baseFee: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>
              <label className="block"><span className="text-xs text-muted-foreground"><Tx>包邮门槛</Tx></span><input type="number" value={form.freeAbove} onChange={(e) => setForm({ ...form, freeAbove: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>
              <label className="block"><span className="text-xs text-muted-foreground"><Tx>续重/kg</Tx></span><input type="number" value={form.extraPerKg} onChange={(e) => setForm({ ...form, extraPerKg: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>
            </div>
            <PermissionGate permission="shipping.manage">
              <LoadingButton
                type="button"
                variant="gold"
                state={saving ? "loading" : "normal"}
                loadingText="保存中..."
                onClick={() => adminConfirmSave(confirm, editing ? "运费模板修改" : "新运费模板", () => handleSave())}
                className="w-full rounded-xl py-3 text-sm font-bold"
              >
                <Tx>保存</Tx>
              </LoadingButton>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
