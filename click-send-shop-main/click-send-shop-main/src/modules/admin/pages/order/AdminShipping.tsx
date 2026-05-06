import { useState, useEffect } from "react";
import { Truck, Plus, Trash2, Edit2, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as shippingService from "@/services/admin/shippingService";
import { toastErrorMessage } from "@/utils/errorMessage";

interface Template {
  id: number;
  name: string;
  regions: string;
  baseFee: number;
  freeAbove: number;
  extraPerKg: number;
  enabled: boolean;
}

export default function AdminShipping() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", regions: "", baseFee: 0, freeAbove: 0, extraPerKg: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await shippingService.fetchTemplates();
      setTemplates(data);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载运费模板失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.regions) { toast.error("请填写完整信息"); return; }
    try {
      if (editing) {
        await shippingService.updateTemplate(editing.id, { name: form.name, regions: form.regions, baseFee: form.baseFee, freeAbove: form.freeAbove, extraPerKg: form.extraPerKg } as any);
        toast.success("运费模板已更新");
      } else {
        await shippingService.createTemplate({ name: form.name, regions: form.regions, baseFee: form.baseFee, freeAbove: form.freeAbove, extraPerKg: form.extraPerKg, enabled: true } as any);
        toast.success("运费模板已创建");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", regions: "", baseFee: 0, freeAbove: 0, extraPerKg: 0 });
      await loadData();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    }
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, regions: t.regions, baseFee: t.baseFee, freeAbove: t.freeAbove, extraPerKg: t.extraPerKg });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await shippingService.deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
      toast.success("已删除");
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除失败"));
    }
  };

  const handleToggle = async (id: number) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    try {
      await shippingService.updateTemplate(id, { enabled: !t.enabled } as any);
      setTemplates(templates.map((x) => x.id === id ? { ...x, enabled: !x.enabled } : x));
      toast.success(t.enabled ? "已停用" : "已启用");
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">运费规则设置</h1>
          <p className="text-sm text-muted-foreground">配置配送区域和运费模板</p>
        </div>
        <PermissionGate permission="shipping.manage">
          <button onClick={() => { setEditing(null); setForm({ name: "", regions: "", baseFee: 0, freeAbove: 0, extraPerKg: 0 }); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus size={16} /> 新建模板
          </button>
        </PermissionGate>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className={`rounded-2xl border bg-card p-5 transition-all ${t.enabled ? "border-border" : "border-border opacity-60"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-gold" />
                <h3 className="font-bold text-foreground">{t.name}</h3>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {t.enabled ? "启用" : "停用"}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} /> {t.regions || "全国"}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground">基础运费</p>
                <p className="font-bold text-foreground">RM {t.baseFee}</p>
              </div>
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground">包邮门槛</p>
                <p className="font-bold text-foreground">RM {t.freeAbove}</p>
              </div>
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground">续重/kg</p>
                <p className="font-bold text-foreground">RM {t.extraPerKg}</p>
              </div>
            </div>
            <PermissionGate permission="shipping.manage">
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(t)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary">
                  <Edit2 size={12} /> 编辑
                </button>
                <button onClick={() => handleDelete(t.id)} className="flex items-center justify-center rounded-xl border border-border px-3 py-2 text-muted-foreground hover:text-destructive hover:bg-secondary">
                  <Trash2 size={12} />
                </button>
                <button onClick={() => handleToggle(t.id)} className="flex-1 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary">
                  {t.enabled ? "停用" : "启用"}
                </button>
              </div>
            </PermissionGate>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-2 py-12 text-center text-sm text-muted-foreground">暂无运费模板，点击上方按钮创建</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground">{editing ? "编辑运费模板" : "新建运费模板"}</h3>
            <input placeholder="模板名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            <input placeholder="适用区域（如：Selangor, KL）" value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            <div className="grid grid-cols-3 gap-3">
              <label className="block"><span className="text-xs text-muted-foreground">基础运费</span><input type="number" value={form.baseFee} onChange={(e) => setForm({ ...form, baseFee: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>
              <label className="block"><span className="text-xs text-muted-foreground">包邮门槛</span><input type="number" value={form.freeAbove} onChange={(e) => setForm({ ...form, freeAbove: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>
              <label className="block"><span className="text-xs text-muted-foreground">续重/kg</span><input type="number" value={form.extraPerKg} onChange={(e) => setForm({ ...form, extraPerKg: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>
            </div>
            <PermissionGate permission="shipping.manage">
              <button onClick={handleSave} className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-primary-foreground">保存</button>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
