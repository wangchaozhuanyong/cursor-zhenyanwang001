import { ImagePlus, Loader2, Upload, Video } from "lucide-react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import AdminFieldHint, { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT } from "@/constants/imageUploadHints";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { UploadDropZone } from "@/modules/micro-interactions";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import {
  ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS,
  ADMIN_PRODUCT_FORM_CONTROL_CLASS,
  defaultCoverImageAlt,
  defaultGalleryImageAlt,
} from "@/modules/admin/pages/product/productFormPresentation";
import {
  clearProductVideoUrl,
  removeProductGalleryImage,
  updateProductGalleryImageAlt,
} from "@/modules/admin/pages/product/productFormState";
import { THEME_BTN_DANGER_SOLID, THEME_TEXT_DANGER } from "@/utils/themeVisuals";

type ProductMediaUploadField = "cover" | "gallery";

type Props = {
  form: ProductFormPayloadSlice;
  setForm: Dispatch<SetStateAction<ProductFormPayloadSlice>>;
  uploadingCover: boolean;
  uploadingGallery: boolean;
  uploadProgress: number | null;
  uploadImageFile: (file: File, field: ProductMediaUploadField) => void | Promise<void>;
  handleImageUpload: (
    event: ChangeEvent<HTMLInputElement>,
    field: ProductMediaUploadField,
  ) => void | Promise<void>;
  handleVideoUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  tText: (s: string) => string;
};

export default function ProductMediaSection({
  form,
  setForm,
  uploadingCover,
  uploadingGallery,
  uploadProgress,
  uploadImageFile,
  handleImageUpload,
  handleVideoUpload,
  tText,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-3">
        <AdminSectionTitle
          title={<Tx>商品图片</Tx>}
          hint={<>{IMAGE_UPLOAD_HINT_API} {IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT}</>}
        />
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>封面图</Tx></label>
            <UploadDropZone
              disabled={uploadingCover}
              className={`relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border sm:mx-0 ${uploadingCover ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:border-gold/50"}`}
              onFiles={(files) => {
                const file = files[0];
                if (file) void uploadImageFile(file, "cover");
              }}
            >
              {form.cover_image ? (
                <img src={form.cover_image} alt={form.cover_image_alt || `${form.name || "商品"} 封面图`} className="h-full w-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload size={22} className="mx-auto text-muted-foreground" />
                  <span className="mt-1 block text-xs text-muted-foreground"><Tx>上传封面</Tx></span>
                </div>
              )}
              {uploadingCover ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="mt-2 text-xs"><Tx>图片上传中...</Tx></span>
                  {uploadProgress !== null ? <span className="text-[11px]">{uploadProgress}%</span> : null}
                </div>
              ) : null}
              <input disabled={uploadingCover} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "cover")} />
            </UploadDropZone>
            <div className="mt-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                封面图说明（alt）
              </label>
              <input
                value={form.cover_image_alt}
                onChange={(e) => setForm((f) => ({ ...f, cover_image_alt: e.target.value }))}
                maxLength={255}
                placeholder={defaultCoverImageAlt(form.name)}
                className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
              />
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                用来给搜索引擎和读屏工具理解图片，不会显示在商品详情正文里。
              </p>
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>轮播图（最多 6 张）</Tx></label>
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                  <img src={img} alt={form.image_alts[i] || `${form.name || "商品"} 详情图 ${i + 1}`} className="h-full w-full object-cover" />
                  <UnifiedButton onClick={() => setForm((f) => removeProductGalleryImage(f, i))} className={`absolute top-0 right-0 rounded-bl px-1 text-xs ${THEME_BTN_DANGER_SOLID}`}>×</UnifiedButton>
                </div>
              ))}
              {uploadingGallery && (
                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-secondary/60 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="mt-1"><Tx>上传中...</Tx></span>
                  {uploadProgress !== null ? <span className="text-[10px]">{uploadProgress}%</span> : null}
                </div>
              )}
              {form.images.length < 6 && (
                <UploadDropZone
                  disabled={uploadingGallery}
                  className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border ${uploadingGallery ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-gold/50"}`}
                  onFiles={(files) => {
                    const file = files[0];
                    if (file) void uploadImageFile(file, "gallery");
                  }}
                >
                  <ImagePlus size={18} className="text-muted-foreground" />
                  <input disabled={uploadingGallery} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "gallery")} />
                </UploadDropZone>
              )}
            </div>
            {form.images.length > 0 ? (
              <div className="mt-3 space-y-2">
                {form.images.map((img, i) => (
                  <div key={`${img}-${i}`} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2">
                    <img src={img} alt={form.image_alts[i] || defaultGalleryImageAlt(form.name, i)} className="h-12 w-12 rounded-md object-cover" />
                    <input
                      value={form.image_alts[i] || ""}
                      onChange={(e) => setForm((f) => updateProductGalleryImageAlt(f, i, e.target.value))}
                      maxLength={255}
                      placeholder={defaultGalleryImageAlt(form.name, i)}
                      className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/50 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground"><Tx>详情视频（可选）</Tx></label>
              <AdminFieldHint
                contentClassName="max-w-sm"
                text={(
                  <>
                    <Tx>
                      仅在商品详情页图集展示，商品卡不展示。支持 MP4 / WebM / MOV，单个视频最大 50MB；建议使用 H.264 MP4 以获得最佳兼容性。
                    </Tx>
                    <p className="mt-1"><Tx>
                      画面比例请与「站点外观 → 商品图比例」一致（常见为 1:1，如 1080×1080 / 720×720；若为 3:4 则如 1080×1440）。码率约 5-8 Mbps，时长 1 分钟内更易压在 50MB 内。
                      详情页图集主区域固定为当前主题的商品图比例，视频在区域内 object-contain：与主题同比例导出时黑边最少；横屏或与主题不一致时可能出现留黑。
                    </Tx></p>
                  </>
                )}
              />
            </div>
            {form.video_url && (
              <UnifiedButton
                type="button"
                onClick={() => setForm(clearProductVideoUrl)}
                className={`shrink-0 text-xs hover:underline ${THEME_TEXT_DANGER}`}
              ><Tx>
                清除
              </Tx></UnifiedButton>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              placeholder={tText("填写视频 URL，或点击右侧上传")}
              className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
            />
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:border-gold/50 hover:bg-secondary">
              <Video size={16} /><Tx>
              上传视频
              </Tx><input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                className="hidden"
                onChange={handleVideoUpload}
              />
            </label>
          </div>
          {form.video_url ? (
            <div
              className="mt-3 w-full max-w-md overflow-hidden rounded-lg bg-black"
              style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
            >
              <video
                src={form.video_url}
                className="h-full w-full object-contain"
                controls
                preload="metadata"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
