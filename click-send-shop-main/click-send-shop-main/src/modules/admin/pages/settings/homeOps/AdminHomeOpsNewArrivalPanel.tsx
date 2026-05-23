import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import AdminFieldHint, { AdminLabelWithHint, AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { LoadingButton } from "@/modules/micro-interactions";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { refreshSiteInfo } from "@/hooks/useSiteInfo";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

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
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NewArrivalForm>(empty);
  const [saving, setSaving] = useState(false);

  const settingsQuery = useQuery({
    queryKey: adminQueryKeys.siteSettings(),
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
  });

  const loading = settingsQuery.isLoading && !settingsQuery.data;

  useEffect(() => {
    if (!settingsQuery.data) return;
    const data = settingsQuery.data;
    setForm({
      newArrivalSectionTitle: data?.newArrivalSectionTitle ?? "",
      newArrivalSectionSubtitle: data?.newArrivalSectionSubtitle ?? "",
      newArrivalDisplayCount: data?.newArrivalDisplayCount ?? "8",
      newArrivalShowPrice: data?.newArrivalShowPrice ?? "1",
      newArrivalOnlyInStock: data?.newArrivalOnlyInStock ?? "1",
    });
  }, [settingsQuery.data]);

  const save = async () => {
    const count = parseInt(form.newArrivalDisplayCount.trim(), 10);
    if (!Number.isFinite(count) || count < 1 || count > 16) {
      toast.error(tText("展示数量须为 1–16 之间的整数"));
      return;
    }
    setSaving(true);
    try {
      await updateSiteSettings({
        ...form,
        newArrivalDisplayCount: String(count),
      });
      await refreshSiteInfo();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.siteSettings() });
      toast.success(tText("新品配置已保存"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-4">
        <AdminSectionTitle
          title={tText("新品配置")}
          hint="控制首页「新品上市」横滑模块的标题、展示数量与补位规则。"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground"><Tx>模块标题</Tx></span>
          <input
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalSectionTitle}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalSectionTitle: e.target.value }))}
            placeholder={tText("新品上市")}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground"><Tx>模块副标题</Tx></span>
          <input
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalSectionSubtitle}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalSectionSubtitle: e.target.value }))}
            placeholder={tText("选填；前台当前未展示时可留空")}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground"><Tx>展示数量</Tx></span>
          <input
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalDisplayCount}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalDisplayCount: e.target.value }))}
            placeholder="8"
          />
          <div className="flex justify-end">
            <AdminFieldHint text="建议 4–12，服务端最多 16" />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground"><Tx>显示价格</Tx></span>
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalShowPrice}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalShowPrice: e.target.value }))}
          >
            <option value="1"><Tx>显示</Tx></option>
            <option value="0"><Tx>隐藏</Tx></option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <AdminLabelWithHint
            label={tText("补位商品仅展示有库存")}
            hint="首页新品位优先展示后台标记为「新品」的商品；数量不足时，用最近 14 天内上架的商品补足。选「是」时，补位只拉取库存 > 0 的商品；选「否」时补位可含零库存商品。"
            className="mb-0"
          />
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={loading}
            value={form.newArrivalOnlyInStock}
            onChange={(e) => setForm((f) => ({ ...f, newArrivalOnlyInStock: e.target.value }))}
          >
            <option value="1"><Tx>是（推荐）</Tx></option>
            <option value="0"><Tx>否</Tx></option>
          </select>
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
