import { useEffect, useState } from "react";
import { type DeferredPromptEvent, isStandaloneApp } from "@/utils/pwa";
import {
  clearCapturedPwaInstallPrompt,
  getCapturedPwaInstallPrompt,
  initPwaInstallPromptCapture,
  subscribePwaInstallPrompt,
} from "@/lib/pwaInstallPromptStore";

export type PwaInstallResult = "accepted" | "dismissed" | "unavailable";

export function usePwaInstallPrompt(onInstalled?: () => void) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(
    () => getCapturedPwaInstallPrompt().deferredPrompt,
  );
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(() => isStandaloneApp());
  const [installPromptChecked, setInstallPromptChecked] = useState(
    () => isStandaloneApp() || getCapturedPwaInstallPrompt().installPromptChecked,
  );

  useEffect(() => {
    initPwaInstallPromptCapture();

    const syncCapturedPrompt = () => {
      const captured = getCapturedPwaInstallPrompt();
      setDeferredPrompt(captured.deferredPrompt);
      setInstallPromptChecked(isStandaloneApp() || captured.installPromptChecked);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setInstallPromptChecked(true);
      onInstalled?.();
    };

    syncCapturedPrompt();
    const unsubscribe = subscribePwaInstallPrompt(syncCapturedPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [onInstalled]);

  const install = async (): Promise<PwaInstallResult> => {
    if (!deferredPrompt || installed) return "unavailable";
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        return "accepted";
      }
      return "dismissed";
    } finally {
      setInstalling(false);
      clearCapturedPwaInstallPrompt();
    }
  };

  return {
    hasInstallPrompt: Boolean(deferredPrompt),
    canInstall: Boolean(deferredPrompt) && !installed,
    installPromptChecked,
    install,
    installing,
    installed,
  };
}
