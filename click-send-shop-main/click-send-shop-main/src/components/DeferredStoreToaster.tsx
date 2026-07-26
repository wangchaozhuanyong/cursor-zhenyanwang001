import { lazy, Suspense, useEffect, useState } from "react";
import {
  hasQueuedStoreToasts,
  subscribeStoreToastActivation,
} from "@/utils/storeToast";

const StoreToasterBridge = lazy(() => import("@/components/StoreToasterBridge"));

export default function DeferredStoreToaster() {
  const [active, setActive] = useState(() => hasQueuedStoreToasts());

  useEffect(() => subscribeStoreToastActivation(() => setActive(true)), []);

  if (!active) return null;

  return (
    <Suspense fallback={null}>
      <StoreToasterBridge />
    </Suspense>
  );
}
