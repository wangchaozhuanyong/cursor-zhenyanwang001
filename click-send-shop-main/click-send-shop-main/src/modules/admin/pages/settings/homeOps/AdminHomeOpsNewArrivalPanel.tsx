import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { IMAGE_UPLOAD_HINT_API } from "@/constants/imageUploadHints";
import { validateUploadFile } from "@/api/modules/upload";
import { LoadingButton } from "@/modules/micro-interactions";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import * as uploadService from "@/services/uploadService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";

type NewArrivalForm = {
  newArrivalHeroImage: string;
  newArrivalHeroTitle: string;
  newArrivalHeroSubtitle: string;
  newArrivalHeroCtaText: string;
  newArrivalSectionTitle: string;
  newArrivalSectionSubtitle: string;
  newArrivalDisplayCount: string;
  newArrivalShowPrice: string;
  newArrivalOnlyInStock: string;
};

const empty: NewArrivalForm = {
  newArrivalHeroImage: "",
  newArrivalHeroTitle: "",
  newArrivalHeroSubtitle: "",
  newArrivalHeroCtaText: "",
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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchSiteSettings()
      .then((data) => {
        setForm({
          newArrivalHeroImage: data?.newArrivalHeroImage ?? "",
          newArrivalHeroTitle: data?.newArrivalHeroTitle ?? "",
          newArrivalHeroSubtitle: data?.newArrivalHeroSubtitle ?? "",
          newArrivalHeroCtaText: data?.newArrivalHeroCtaText ?? "",
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

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      validateUploadFile(file, "banner");
      const { url } = await uploadService.uploadSingleWithProgress(file, { mode: "banner", timeoutMs: 60000 });
      setForm((f) => ({ ...f, newArrivalHeroImage: url }));
      toast.success("图片已上传");
    } catch (err) {
      toast.error(toastErrorMessage(err, "上传失败"));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSiteSettings(form);
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
        <p className="mt-1 text-xs text-muted-foreground">保留旧版主视觉字段兼容，同时支持新版横滑新品区配置。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">旧版主视觉图片</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={form.newArrivalHeroImage}
              disabled={loading}
              onChange={(e) => setForm((f) => ({ ...f, newArrivalHeroImage: e.target.value }))}
              placeholder="上传或粘贴图片 URL"
            />
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(ev) => void onFile(ev)} />
            <button
              type="button"
              disabled={loading || uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              上传
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">{IMAGE_UPLOAD_HINT_API}</p>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">旧版主视觉标题</span>
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" disabled={loading} value={form.newArrivalHeroTitle} onChange={(e) => setForm((f) => ({ ...f, newArrivalHeroTitle: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">旧版主视觉副标题</span>
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" disabled={loading} value={form.newArrivalHeroSubtitle} onChange={(e) => setForm((f) => ({ ...f, newArrivalHeroSubtitle: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">旧版按钮文案</span>
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" disabled={loading} value={form.newArrivalHeroCtaText} onChange={(e) => setForm((f) => ({ ...f, newArrivalHeroCtaText: e.target.value }))} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">新版模块标题</span>
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" disabled={loading} value={form.newArrivalSectionTitle} onChange={(e) => setForm((f) => ({ ...f, newArrivalSectionTitle: e.target.value }))} placeholder="新品上市" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">新版模块副标题</span>
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" disabled={loading} value={form.newArrivalSectionSubtitle} onChange={(e) => setForm((f) => ({ ...f, newArrivalSectionSubtitle: e.target.value }))} placeholder="最近上架好物，第一时间发现" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">新版展示数量</span>
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" disabled={loading} value={form.newArrivalDisplayCount} onChange={(e) => setForm((f) => ({ ...f, newArrivalDisplayCount: e.target.value }))} placeholder="8" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">新版显示价格</span>
          <select className="rounded-xl border border-border bg-background px-3 py-2 text-sm" disabled={loading} value={form.newArrivalShowPrice} onChange={(e) => setForm((f) => ({ ...f, newArrivalShowPrice: e.target.value }))}>
            <option value="1">显示</option>
            <option value="0">隐藏</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">新品补位仅库存</span>
          <select className="rounded-xl border border-border bg-background px-3 py-2 text-sm" disabled={loading} value={form.newArrivalOnlyInStock} onChange={(e) => setForm((f) => ({ ...f, newArrivalOnlyInStock: e.target.value }))}>
            <option value="1">是</option>
            <option value="0">否</option>
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
