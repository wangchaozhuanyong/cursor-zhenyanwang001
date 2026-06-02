import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import * as uploadService from "@/services/uploadService";
import { validateUploadFile } from "@/services/uploadService";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import { defaultCoverImageAlt, defaultGalleryImageAlt } from "@/modules/admin/pages/product/productFormPresentation";
import {
  readRequiredProductUploadUrl,
  validateProductImageUploadFile,
  validateProductVideoUploadFile,
} from "@/modules/admin/pages/product/productFormMedia";

type UseProductMediaUploadsOptions = {
  setForm: Dispatch<SetStateAction<ProductFormPayloadSlice>>;
  tText: (text: string) => string;
};

export function useProductMediaUploads({ setForm, tText }: UseProductMediaUploadsOptions) {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVariantImageIndex, setUploadingVariantImageIndex] = useState<number | null>(null);
  const [variantUploadProgress, setVariantUploadProgress] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const validateImageBeforeUpload = (file: File) => {
    const result = validateProductImageUploadFile(file);
    if (result.shouldWarnAboutGif) {
      toast.warning(tText("GIF 上传后可能转为静态图"));
    }
  };

  const uploadImageFile = async (file: File, field: "cover" | "gallery") => {
    if (field === "cover" && uploadingCover) return;
    if (field === "gallery" && uploadingGallery) return;
    try {
      validateImageBeforeUpload(file);
      if (field === "cover") setUploadingCover(true);
      else setUploadingGallery(true);
      setUploadProgress(0);
      validateUploadFile(file, "product");
      const res = await uploadService.uploadSingleWithProgress(file, {
        mode: "product",
        timeoutMs: 45_000,
        onProgress: (percent) => setUploadProgress(percent),
      });
      const url = readRequiredProductUploadUrl(res, "图片");
      if (field === "cover") {
        setForm((form) => ({
          ...form,
          cover_image: url,
          cover_image_alt: form.cover_image_alt || defaultCoverImageAlt(form.name),
        }));
      } else {
        setForm((form) => ({
          ...form,
          images: [...form.images, url],
          image_alts: [...form.image_alts, defaultGalleryImageAlt(form.name, form.images.length)],
        }));
      }
      toast.success(tText("图片已上传"));
    } catch (error) {
      toast.error(toastErrorMessage(error, "图片上传失败"));
    } finally {
      setUploadProgress(null);
      setUploadingCover(false);
      setUploadingGallery(false);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, field: "cover" | "gallery") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadImageFile(file, field);
  };

  const uploadVariantImageFile = async (file: File, variantIndex: number) => {
    if (uploadingVariantImageIndex !== null) return;
    try {
      validateImageBeforeUpload(file);
      validateUploadFile(file, "product");
      setUploadingVariantImageIndex(variantIndex);
      setVariantUploadProgress(0);
      const res = await uploadService.uploadSingleWithProgress(file, {
        mode: "product",
        timeoutMs: 45_000,
        onProgress: (percent) => setVariantUploadProgress(percent),
      });
      const url = readRequiredProductUploadUrl(res, "图片");
      setForm((form) => {
        const variants = [...form.variants];
        variants[variantIndex] = { ...variants[variantIndex], image_url: url };
        return { ...form, variants };
      });
      toast.success(tText("SKU 图片已上传"));
    } catch (error) {
      toast.error(toastErrorMessage(error, "SKU 图片上传失败"));
    } finally {
      setUploadingVariantImageIndex(null);
      setVariantUploadProgress(null);
    }
  };

  const handleVariantImageUpload = async (event: ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadVariantImageFile(file, variantIndex);
  };

  const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      validateProductVideoUploadFile(file);
      const res = await uploadService.uploadSingle(file, { mode: "video" });
      const url = readRequiredProductUploadUrl(res, "视频");
      setForm((form) => ({ ...form, video_url: url }));
      toast.success(tText("视频已上传"));
    } catch (error) {
      toast.error(toastErrorMessage(error, "视频上传失败"));
    }
  };

  return {
    uploadingCover,
    uploadingGallery,
    uploadingVariantImageIndex,
    variantUploadProgress,
    uploadProgress,
    uploadImageFile,
    handleImageUpload,
    handleVariantImageUpload,
    handleVideoUpload,
  };
}
