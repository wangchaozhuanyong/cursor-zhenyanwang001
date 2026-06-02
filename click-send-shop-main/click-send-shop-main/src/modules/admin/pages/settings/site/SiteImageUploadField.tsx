import { useRef, type CSSProperties } from "react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { AdminLabelWithHint } from "@/components/admin/AdminFieldHint";
import {
  IMAGE_UPLOAD_HINT_API,
  IMAGE_UPLOAD_HINT_SITE_FAVICON,
  IMAGE_UPLOAD_HINT_SITE_LOGO,
} from "@/constants/imageUploadHints";
import { THEME_HOVER_TEXT_DANGER } from "@/utils/themeVisuals";
import { Tx } from "@/components/admin/AdminText";
import type { SiteSettings } from "@/types/admin";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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
  const isLogo = fieldKey === "logoUrl";
  const isFavicon = fieldKey === "faviconUrl";
  const isSiteAsset = isLogo || isFavicon;
  const transparencyPreviewStyle: CSSProperties | undefined = isSiteAsset
    ? {
        backgroundColor: "#fff",
        backgroundImage:
          "linear-gradient(45deg, rgba(148, 163, 184, .18) 25%, transparent 25%), linear-gradient(-45deg, rgba(148, 163, 184, .18) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, .18) 75%), linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, .18) 75%)",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
        backgroundSize: "16px 16px",
      }
    : undefined;
  const imageHint = (
    <>
      {isLogo ? IMAGE_UPLOAD_HINT_SITE_LOGO : null}
      {isFavicon ? IMAGE_UPLOAD_HINT_SITE_FAVICON : null}
      {!isSiteAsset ? IMAGE_UPLOAD_HINT_API : null}
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
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-secondary ${
            isFavicon ? "h-20 w-20" : "h-20 w-20"
          }`}
          style={transparencyPreviewStyle}
        >
          {value ? (
            <img
              src={value}
              alt={label}
              className={`${isFavicon ? "h-[72px] w-[72px]" : "h-full w-full"} object-contain p-1`}
            />
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
            <UnifiedButton
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {isUploading ? "上传中…" : "上传图片"}
            </UnifiedButton>
            {value ? (
              <UnifiedButton
                type="button"
                onClick={() => onChange("")}
                className={`inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground ${THEME_HOVER_TEXT_DANGER}`}
              >
                <X size={12} /><Tx>清除</Tx>
              </UnifiedButton>
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
