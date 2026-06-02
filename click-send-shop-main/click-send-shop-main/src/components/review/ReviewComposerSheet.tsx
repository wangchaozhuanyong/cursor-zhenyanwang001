import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { AppModal, LoadingButton } from "@/modules/micro-interactions";
import * as reviewService from "@/services/reviewService";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface ReviewComposerSheetProps {
  open: boolean;
  onClose: () => void;
  orderItemId: string;
  product?: { id?: string; name?: string; cover_image?: string };
  variantName?: string;
  onSuccess?: () => void;
}

export default function ReviewComposerSheet({
  open,
  onClose,
  orderItemId,
  product,
  variantName,
  onSuccess,
}: ReviewComposerSheetProps) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setRating(5);
    setContent("");
    setImages([]);
    setSubmitting(false);
  }, [open]);

  const uploadImages = async (files: File[]) => {
    if (!files.length) return;
    if (images.length + files.length > 5) {
      toast.error("最多上传 5 张图片");
      return;
    }
    const uploaded = await reviewService.uploadReviewImages(files);
    setImages((prev) => [...prev, ...uploaded.map((x) => x.url)]);
  };

  const submit = async () => {
    if (!orderItemId) return;
    if (!content.trim()) {
      toast.error("请填写评价内容");
      return;
    }
    setSubmitting(true);
    try {
      await reviewService.submitReview({ order_item_id: orderItemId, rating, content, images });
      toast.success("评价提交成功");
      onClose();
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <LoadingButton
      type="button"
      state={submitting ? "loading" : "normal"}
      className="min-h-12 w-full rounded-full !bg-[var(--theme-primary)] !text-[var(--theme-primary-foreground)] text-sm font-semibold"
      onClick={() => void submit()}
      loadingText="提交评价"
    >
      提交评价
    </LoadingButton>
  );

  return (
    <AppModal
      tier="form"
      open={open}
      onClose={onClose}
      title="写评价"
      description={
        <>
          {product?.name || "商品"}
          {variantName ? ` / ${variantName}` : ""}
        </>
      }
      height="auto"
      stickyFooter
      footer={footer}
      showCloseButton
    >
      <div className="space-y-4 pb-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <UnifiedButton key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} 星`}>
              <Star
                size={22}
                className={s <= rating ? "fill-[var(--theme-price)] text-[var(--theme-price)]" : "text-muted-foreground"}
              />
            </UnifiedButton>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享你的体验..."
          rows={4}
          className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3 text-sm text-[var(--theme-text)] outline-none ring-[var(--theme-primary)] focus:ring-2"
        />
        <div className="flex items-center justify-between">
          <UnifiedButton
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-[var(--theme-text-muted)]"
          >
            上传图片 ({images.length}/5)
          </UnifiedButton>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void uploadImages(Array.from(e.target.files || []));
              e.currentTarget.value = "";
            }}
          />
        </div>
        {images.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {images.map((url) => (
              <img key={url} src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ))}
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
