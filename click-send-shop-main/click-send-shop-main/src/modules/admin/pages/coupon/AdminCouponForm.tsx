import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createCoupon, updateCoupon, fetchCoupons } from "@/services/admin/couponService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useGoBack } from "@/hooks/useGoBack";

const couponTypes = [
  { value: "fixed", label: "满减券" },
  { value: "percentage", label: "折扣券" },
  { value: "shipping", label: "运费券" },
];

export default function AdminCouponForm() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/coupons");
  const { id } = useParams();
  const isNew = id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    code: "",
    type: "fixed" as string,
    value: "",
    min_amount: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      fetchCoupons()
        .then((data) => {
          const coupon = data.list.find((c) => c.id === id);
          if (coupon) {
            setForm({
              title: coupon.title || "",
              code: coupon.code || "",
              type: coupon.type || "fixed",
              value: coupon.value?.toString() || "",
              min_amount: coupon.min_amount?.toString() || "",
              start_date: coupon.start_date?.slice(0, 10) || "",
              end_date: coupon.end_date?.slice(0, 10) || "",
              description: coupon.description || "",
            });
          }
        })
        .catch(() => toast.error("加载优惠券失败"))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleSave = async () => {
    if (!form.title) { toast.error("请输入优惠券名称"); return; }
    if (!form.code) { toast.error("请输入优惠券编码"); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        code: form.code,
        type: form.type,
        value: parseFloat(form.value) || 0,
        min_amount: parseFloat(form.min_amount) || 0,
        start_date: form.start_date || new Date().toISOString().slice(0, 10),
        end_date: form.end_date || "2026-12-31",
        description: form.description,
      };
      if (isNew) {
        await createCoupon(payload);
        toast.success("优惠券创建成功");
      } else {
        await updateCoupon(id!, payload);
        toast.success("优惠券更新成功");
      }
      navigate("/admin/coupons");
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
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
      <div className="flex items-center gap-3">
        <button onClick={goBack}>
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">{isNew ? "新建优惠券" : "编辑优惠券"}</h2>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">基础信息</h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">优惠券名称</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：满100减10" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">优惠券编码</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="唯一编码，如 SAVE10" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">类型</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                {couponTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{form.type === "percentage" ? "折扣比例 (%)" : "优惠金额 (RM)"}</label>
              <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === "percentage" ? "10 = 10% off" : "10"} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">最低消费金额 (RM)</label>
            <input value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} placeholder="0 = 无门槛" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">开始日期</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">结束日期</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">描述（可选）</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="优惠券说明..." className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground resize-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <PermissionGate permission="coupon.manage">
            <button type="button" disabled={saving} onClick={handleSave} className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
            </button>
          </PermissionGate>
          <button type="button" onClick={goBack} className="rounded-lg border border-border px-6 py-2.5 text-sm text-muted-foreground">取消</button>
        </div>
      </div>
    </div>
  );
}
