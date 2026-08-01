import { useEffect } from "react";
import { Toaster, toast } from "@/components/ui/sonner";
import {
  drainStoreToastQueue,
  subscribeStoreToast,
  type StoreToastPayload,
} from "@/utils/storeToast";

function presentStoreToast(payload: StoreToastPayload) {
  if (payload.type === "success") {
    toast.success(payload.message, payload.options);
    return;
  }
  if (payload.type === "error") {
    toast.error(payload.message, payload.options);
    return;
  }
  if (payload.type === "info") {
    toast.info(payload.message, payload.options);
    return;
  }
  if (payload.type === "warning") {
    toast.warning(payload.message, payload.options);
    return;
  }
  toast.message(payload.message, payload.options);
}

export default function StoreToasterBridge() {
  useEffect(() => {
    drainStoreToastQueue().forEach(presentStoreToast);
    return subscribeStoreToast(presentStoreToast);
  }, []);

  return <Toaster theme="light" />;
}
