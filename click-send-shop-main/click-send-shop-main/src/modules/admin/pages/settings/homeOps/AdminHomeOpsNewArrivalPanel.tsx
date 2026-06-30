import { useEffect, useMemo, useState } from "react";
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
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";

type NewArrivalForm = {
  newArrivalSectionTitle: string;
  newArrivalDisplayCount: string;
  newArrivalShowPrice: string;
  newArrivalOnlyInStock: string;
};

const empty: NewArrivalForm = {
  newArrivalSectionTitle: "",
  newArrivalDisplayCount: "8",
  newArrivalShowPrice: "1",
  newArrivalOnlyInStock: "1",
};

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

function serializeNewArrivalForm(value: NewArrivalForm) {
  return JSON.stringify(value);
}

export default function AdminHomeOpsNewArrivalPanel({ onDirtyChange }: Props) {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NewArrivalForm>(empty);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(() => serializeNewArrivalForm(empty));

  const settingsQuery = useQuery({
    queryKey: adminQueryKeys.siteSettings(),
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
  });

  const loading = settingsQuery.isLoading && !settingsQuery.data;

  const dirty = useMemo(
    () => !loading && serializeNewArrivalForm(form) !== baseline,
    [baseline, form, loading],
  );

  useEffect(() => {
    if (!settingsQuery.data || dirty) return;
    const data = settingsQuery.data;
    const nextForm = {
      newArrivalSectionTitle: data?.newArrivalSectionTitle ?? "",
      newArrivalDisplayCount: data?.newArrivalDisplayCount ?? "8",
      newArrivalShowPrice: data?.newArrivalShowPrice ?? "1",
      newArrivalOnlyInStock: data?.newArrivalOnlyInStock ?? "1",
    };
    setForm(nextForm);
    setBaseline(serializeNewArrivalForm(nextForm));
  }, [settingsQuery.data, dirty]);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const save = async () => {
    const count = parseInt(form.newArrivalDisplayCount.trim(), 10);
    if (!Number.isFinite(count) || count < 1 || count > 16) {
      toast.error(tText("展示数量须为 1–16 之间的整数"));
      return;
    }
    setSaving(true);
    try {
      const nextForm = {
        ...form,
        newArrivalDisplayCount: String(count),
      };
      await updateSiteSettings({
        ...nextForm,
        newArrivalSectionSubtitle: "",
      });
      setForm(nextForm);
      setBaseline(serializeNewArrivalForm(nextForm));
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
          hint="控制首页「新品上市」区块的标题、展示数量、价格显示、补位规则与更多跳转线路。"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3 md:col-span-2">
          <p className="text-xs font-medium text-muted-foreground"><Tx>查看更多跳转线路</Tx></p>
          <p className="mt-1 text-sm font-semibold text-foreground"><Tx>分类页 · 新品模块</Tx></p>
          <code className="mt-2 block rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
            {NEW_ARRIVAL_CATEGORY_PATH}
          </code>
          <div className="mt-2">
            <AdminFieldHint text="系统固定跳转到分类页顶部「新品」入口，不再单独维护新品专题页。" />
          </div>
        </div>
        <label className="flex flex-col gap-1 md:col-span-2">
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
            hint="首页新品位优先展示后台标记为「新品」的商品；数量不足时，用最近 30 天内上架的商品补足。选「是」时，补位只拉取库存 > 0 的商品；选「否」时补位可含零库存商品。"
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
            variant="price"
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
