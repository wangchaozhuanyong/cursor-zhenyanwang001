import { useRef } from "react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { AdminLabelWithHint } from "@/components/admin/AdminFieldHint";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_SITE_ASSET } from "@/constants/imageUploadHints";
import { THEME_HOVER_TEXT_DANGER } from "@/utils/themeVisuals";
import { Tx } from "@/components/admin/AdminText";
import type { SiteSettings } from "@/types/admin";
import { useAdminT } from "@/hooks/useAdminT";

type Props = {
  fieldKey: keyof SiteSettings;
  label: string;
  hint?: string;
  value: string;
  isUploading: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
};

export default function SiteImageUploadField({
  fieldKey,
  label,
  hint,
  value,
  isUploading,
  onChange,
  onUpload,
}: Props) {
  const { tText } = useAdminT();
  const inputRef = useRef<HTMLInputElement>(null);
  const isSiteAsset = fieldKey === "logoUrl" || fieldKey === "faviconUrl";
  const imageHint = (
    <>
      {isSiteAsset ? IMAGE_UPLOAD_HINT_SITE_ASSET : IMAGE_UPLOAD_HINT_API}
      {hint ? <p className="mt-1">{hint}</p> : null}
      {!isSiteAsset ? (
        <p className="mt-1 text-amber-600/90"><Tx>上传后请保存当前分组使前台生效。</Tx></p>
      ) : null}
    </>
  );

  return (
    <div>
      <AdminLabelWithHint label={label} hint={imageHint} />
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon size={20} className="text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={tText("图片 URL")}
            className="w-full rounded-lg bg-secondary px-4 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {isUploading ? "上传中…" : "上传图片"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className={`inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground ${THEME_HOVER_TEXT_DANGER}`}
              >
                <X size={12} /><Tx>清除</Tx>
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
