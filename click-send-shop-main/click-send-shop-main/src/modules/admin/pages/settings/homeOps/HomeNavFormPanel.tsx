import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import PermissionGate from "@/components/admin/PermissionGate";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_HOME_NAV_ICON } from "@/constants/imageUploadHints";
import { LoadingButton } from "@/modules/micro-interactions";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import * as uploadService from "@/services/uploadService";
import { validateUploadFile } from "@/services/uploadService";
import { hasTransparentPixels } from "@/utils/imageTransparency";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { NavForm } from "./homeNavUtils";
import HomeNavIconPreview from "./HomeNavIconPreview";

type Props = {
  navForm: NavForm;
  setNavForm: React.Dispatch<React.SetStateAction<NavForm>>;
  editingNavId: string | null;
  saving: boolean;
  onSave: () => void | Promise<void>;
  categoryOptions: Array<{ id: string; label: string }>;
  nextSortOrder: number;
};

export default function HomeNavFormPanel({
  navForm,
  setNavForm,
  editingNavId,
  saving,
  onSave,
  categoryOptions,
  nextSortOrder,
}: Props) {
  const { confirm } = useAdminConfirm();
  const [navIconUploading, setNavIconUploading] = useState(false);
  const navIconFileRef = useRef<HTMLInputElement>(null);

  const onNavIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNavIconUploading(true);
    try {
      validateUploadFile(file, "thumb");
      const transparent = await hasTransparentPixels(file);
      if (!transparent) {
        toast.error("图标缺少透明通道，建议上传透明 PNG 或 WebP。");
        return;
      }
      const { url } = await uploadService.uploadSingleWithProgress(file, { mode: "thumb", timeoutMs: 45000 });
      setNavForm((prev) => ({ ...prev, icon_url: url }));
      toast.success("图标上传成功，请保存生效。");
    } catch (err) {
      toast.error(toastErrorMessage(err, "图标上传失败"));
    } finally {
      setNavIconUploading(false);
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_1fr_1.4fr_minmax(7rem,1fr)_auto_auto]">
      <label className="flex min-w-0 flex-col gap-1 md:col-span-1">
        <span className="text-[11px] font-medium text-muted-foreground"><Tx>图标</Tx></span>
        <div className="flex flex-wrap items-stretch gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            placeholder="支持图片 URL、站内路径或 Emoji"
            value={navForm.icon_url}
            onChange={(e) => setNavForm({ ...navForm, icon_url: e.target.value })}
          />
          <input
            ref={navIconFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(ev) => void onNavIconFileChange(ev)}
          />
          <button
            type="button"
            disabled={saving || navIconUploading}
            onClick={() => navIconFileRef.current?.click()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            {navIconUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            上传
          </button>
          <div
            className="flex shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-background/50 px-1 py-1"
            title="图标预览"
          >
            <HomeNavIconPreview value={navForm.icon_url} />
          </div>
        </div>
        <div className="flex justify-end">
          <AdminFieldHint
            contentClassName="max-w-sm"
            text={
              <>
                {IMAGE_UPLOAD_HINT_HOME_NAV_ICON} {IMAGE_UPLOAD_HINT_API}
              </>
            }
          />
        </div>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground"><Tx>标题</Tx></span>
        <input
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          placeholder="导航标题"
          value={navForm.title}
          onChange={(e) => setNavForm({ ...navForm, title: e.target.value })}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground"><Tx>跳转方式</Tx></span>
        <select
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          value={navForm.target_type || "url"}
          onChange={(e) => {
            const next = e.target.value === "category" ? "category" : "url";
            setNavForm((prev) => ({
              ...prev,
              target_type: next,
              target_category_id: next === "category" ? prev.target_category_id : null,
            }));
          }}
        >
          <option value="url"><Tx>URL / 站内路径</Tx></option>
          <option value="category"><Tx>分类页</Tx></option>
        </select>
        {navForm.target_type === "category" ? (
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            value={navForm.target_category_id || ""}
            onChange={(e) => {
              const id = e.target.value || null;
              setNavForm((prev) => ({
                ...prev,
                target_category_id: id,
                link_url: id ? `/categories?cat=${id}` : prev.link_url,
              }));
            }}
          >
            <option value=""><Tx>请选择分类</Tx></option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            placeholder="/categories 或 https://..."
            value={navForm.link_url}
            onChange={(e) => setNavForm({ ...navForm, link_url: e.target.value })}
          />
        )}
        <div className="flex justify-end">
          <AdminFieldHint
            text={navForm.target_type === "category" ? "将自动跳转到对应分类页" : "支持站内路径和完整 URL"}
          />
        </div>
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground"><Tx>排序</Tx></span>
        {editingNavId ? (
          <input
            type="number"
            min={1}
            title="排序值越小越靠前"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            value={navForm.sort_order}
            onChange={(e) => setNavForm({ ...navForm, sort_order: Math.max(1, Number(e.target.value) || 1) })}
          />
        ) : (
          <div className="flex min-h-[42px] items-center rounded-xl border border-dashed border-border bg-background/40 px-3 text-sm text-muted-foreground">
            新增后排在第 {nextSortOrder} 位
          </div>
        )}
        <div className="flex justify-end">
          <AdminFieldHint text={<Tx>列表可拖拽或点击序号调整顺序</Tx>} />
        </div>
      </label>
      <label className="flex cursor-pointer flex-col justify-end gap-1 pb-0.5">
        <span className="text-[11px] font-medium text-muted-foreground"><Tx>状态</Tx></span>
        <span className="flex min-h-[42px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="accent-gold"
            checked={navForm.enabled}
            onChange={(e) => setNavForm({ ...navForm, enabled: e.target.checked })}
          />
          <Tx>{navForm.enabled ? "启用" : "禁用"}</Tx>
        </span>
      </label>
      <div className="flex flex-col justify-end gap-1">
        <span className="text-[11px] font-medium text-muted-foreground opacity-0 select-none">操作</span>
        <PermissionGate permission="home_ops.manage">
          <LoadingButton
            type="button"
            variant="gold"
            state={saving ? "loading" : "normal"}
            loadingText="保存中..."
            onClick={() => adminConfirmSave(confirm, editingNavId ? "保存导航修改" : "新增导航", () => onSave())}
            className="inline-flex h-[42px] rounded-xl px-4 text-sm font-bold"
          >
            {editingNavId ? "保存" : "新增"}
          </LoadingButton>
        </PermissionGate>
      </div>
    </div>
  );
}
