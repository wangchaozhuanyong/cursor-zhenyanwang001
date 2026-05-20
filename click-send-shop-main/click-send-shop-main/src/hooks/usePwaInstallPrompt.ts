import { useEffect, useState } from "react";
import { type DeferredPromptEvent, isStandaloneApp } from "@/utils/pwa";

export type PwaInstallResult = "accepted" | "dismissed" | "unavailable";

export function usePwaInstallPrompt(onInstalled?: () => void) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(isStandaloneApp());

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      onInstalled?.();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [onInstalled]);

  const install = async (): Promise<PwaInstallResult> => {
    if (!deferredPrompt || installed) return "unavailable";
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      return choice.outcome === "accepted" ? "accepted" : "dismissed";
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return {
    hasInstallPrompt: Boolean(deferredPrompt),
    canInstall: Boolean(deferredPrompt) && !installed,
    install,
    installing,
    installed,
  };
}
