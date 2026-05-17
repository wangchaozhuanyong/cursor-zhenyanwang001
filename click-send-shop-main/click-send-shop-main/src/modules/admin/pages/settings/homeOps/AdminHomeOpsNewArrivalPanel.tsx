import { useEffect, useState } from "react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { LoadingButton } from "@/modules/micro-interactions";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";

type NewArrivalForm = {
  newArrivalSectionTitle: string;
  newArrivalSectionSubtitle: string;
  newArrivalDisplayCount: string;
  newArrivalShowPrice: string;
  newArrivalOnlyInStock: string;
};

const empty: NewArrivalForm = {
  newArrivalSectionTitle: "",
  newArrivalSectionSubtitle: "",
  newArrivalDisplayCount: "8",
  newArrivalShowPrice: "1",
  newArrivalOnlyInStock: "1",
};

export default function AdminHomeOpsNewArrivalPanel() {
  const { confirm } = useAdminConfirm();
  const [form, setForm] = useState<NewArrivalForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchSiteSettings()
      .then((data) => {
        setForm({
          newArrivalSectionTitle: data?.newArrivalSectionTitle ?? "",
          newArrivalSectionSubtitle: data?.newArrivalSectionSubtitle ?? "",
          newArrivalDisplayCount: data?.newArrivalDisplayCount ?? "8",
          newArrivalShowPrice: data?.newArrivalShowPrice ?? "1",
          newArrivalOnlyInStock: data?.newArrivalOnlyInStock ?? "1",
        });
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载新品配置失败")))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const count = parseInt(form.newArrivalDisplayCount.trim(), 10);
    if (!Number.isFinite(count) || count < 1 || count > 16) {
      toast.error("展示数量须为 1–16 之间的整数");
      return;
    }
    setSaving(true);
    try {
      await updateSiteSettings({
        ...form,
        newArrivalDisplayCount: String(count),
      });
      toast.success("新品配置已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">新品配置</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          控制首页「新品上市」横滑模块的标题、展示数量与补位规则。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">模块标题</span>
          <input
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalSectionTitle}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalSectionTitle: e.target.value }))}
            placeholder="新品上市"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">模块副标题</span>
          <input
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalSectionSubtitle}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalSectionSubtitle: e.target.value }))}
            placeholder="选填；前台当前未展示时可留空"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">展示数量</span>
          <input
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalDisplayCount}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalDisplayCount: e.target.value }))}
            placeholder="8"
          />
          <span className="text-[10px] text-muted-foreground">建议 4–12，服务端最多 16</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">显示价格</span>
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalShowPrice}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalShowPrice: e.target.value }))}
          >
            <option value="1">显示</option>
            <option value="0">隐藏</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">补位商品仅展示有库存</span>
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalOnlyInStock}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalOnlyInStock: e.target.value }))}
          >
            <option value="1">是（推荐）</option>
            <option value="0">否</option>
          </select>
          <span className="text-[10px] leading-relaxed text-muted-foreground">
            首页新品位优先展示后台标记为「新品」的商品；数量不足时，用最近 14 天内上架的商品补足。
            选「是」时，补位只拉取库存 &gt; 0 的商品，避免首页出现已售罄新品；选「否」时补位可含零库存商品。
          </span>
        </label>
      </div>

      <PermissionGate permission="home_ops.manage">
        <div className="mt-6 flex justify-end">
          <LoadingButton
            type="button"
            variant="gold"
            state={saving ? "loading" : "normal"}
            loadingText="保存中..."
            disabled={loading}
            onClick={() => adminConfirmSave(confirm, "新品配置", () => save())}
            className="rounded-xl px-5 py-2.5 text-sm font-bold"
          >
            保存
          </LoadingButton>
        </div>
      </PermissionGate>
    </section>
  );
}
