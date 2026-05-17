import { useRef, useState } from "react";
import { X, Star } from "lucide-react";
import { toast } from "sonner";
import * as reviewService from "@/services/reviewService";

interface ReviewComposerSheetProps {
  open: boolean;
  onClose: () => void;
  orderItemId: string;
  product?: { id?: string; name?: string; cover_image?: string };
  variantName?: string;
  onSuccess?: () => void;
}

export default function ReviewComposerSheet({ open, onClose, orderItemId, product, variantName, onSuccess }: ReviewComposerSheetProps) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

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
      setContent("");
      setImages([]);
      setRating(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-background p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">写评价</p>
            <p className="text-xs text-muted-foreground">{product?.name || "商品"}{variantName ? ` / ${variantName}` : ""}</p>
          </div>
          <button onClick={onClose} className="rounded p-1"><X size={16} /></button>
        </div>
        <div className="mb-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)}>
              <Star size={22} className={s <= rating ? "fill-[var(--theme-price)] text-[var(--theme-price)]" : "text-muted-foreground"} />
            </button>
          ))}
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="分享你的体验..." rows={4} className="w-full rounded-xl border p-3 text-sm" />
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => inputRef.current?.click()} className="text-xs text-muted-foreground">上传图片 ({images.length}/5)</button>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void uploadImages(Array.from(e.target.files || [])); e.currentTarget.value = ""; }} />
          <button disabled={submitting} onClick={submit} className="rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs text-[var(--theme-primary-foreground)]">{submitting ? "提交中..." : "提交评价"}</button>
        </div>
      </div>
    </div>
  );
}
